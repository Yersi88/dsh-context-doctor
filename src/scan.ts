/**
 * 注入物扫描：指令链（AGENTS.md/CLAUDE.md）、技能目录、工具 schema / MCP。
 * 全部只读；文件有大小上限，路径有 skip 规则。
 */
import { dirname, join } from 'node:path'
import type { FileSystem } from '@deepseek-ai/dsh-fs'
import type { SkillService } from '@deepseek-ai/dsh-skill'
import type { ToolRegistry } from '@deepseek-ai/dsh-tools'
import { estimateTokens } from './tokens.ts'
import { findDuplicateBlocks, groupMcpTools, type DuplicateBlock, type McpSummary } from './analyze.ts'

/** 单文件审计上限：超过则跳过（防止审计器自身被大文件拖垮）。 */
export const MAX_FILE_BYTES = 256 * 1024

/** 指令链文件名（DSH 注入的 workspace instruction 文件）。 */
const INSTRUCTION_NAMES = ['AGENTS.md', 'CLAUDE.md']

/** 指令链审计结果。 */
export interface InstructionChainResult {
  /** git 根（含 .git 的最上层目录），找不到时回到起点目录。 */
  root: string
  /** 链上每一层的文件。 */
  files: { path: string; bytes: number; tokens: number }[]
  totalTokens: number
  duplicateBlocks: DuplicateBlock[]
}

async function pathExists(fs: FileSystem, path: string, signal: AbortSignal): Promise<boolean> {
  try {
    const target = await fs.resolve(path, { signal })
    return (await fs.stat(target, signal)) !== undefined
  } catch {
    return false
  }
}

/**
 * 从 cwd 向上找到 git 根（含 .git 的最高目录）；从根到 cwd 的每一层收集
 * AGENTS.md / CLAUDE.md，与 DSH 的 workspace instruction 注入链对齐。
 */
export async function scanInstructionChain(
  fs: FileSystem,
  cwd: string,
  signal: AbortSignal,
): Promise<InstructionChainResult> {
  // 1. 找 git 根
  let root = cwd
  let current = cwd
  for (;;) {
    if (await pathExists(fs, join(current, '.git'), signal)) {
      root = current
      break
    }
    const parent = dirname(current)
    if (parent === current) break
    current = parent
  }

  // 2. 从 cwd 向上收集到 root 的层级，再反转成外层 → 内层
  const layers: string[] = []
  current = cwd
  for (;;) {
    layers.push(current)
    if (current === root) break
    const parent = dirname(current)
    if (parent === current) break
    current = parent
  }
  layers.reverse()

  // 3. 逐层读指令文件
  const rawFiles: { path: string; bytes: number; tokens: number; content: string }[] = []
  for (const dir of layers) {
    for (const name of INSTRUCTION_NAMES) {
      const fullPath = join(dir, name)
      let target
      try {
        target = await fs.resolve(fullPath, { signal })
      } catch {
        continue // 不存在 / 不可解析
      }
      let info
      try {
        info = await fs.stat(target, signal)
      } catch {
        continue
      }
      if (info === undefined || info.type !== 'file') continue
      if (info.size !== undefined && info.size > MAX_FILE_BYTES) continue
      let text: string
      try {
        text = await fs.readText(target, signal)
      } catch {
        continue
      }
      rawFiles.push({
        path: fs.processPath(target),
        bytes: info.size ?? Buffer.byteLength(text),
        tokens: estimateTokens(text),
        content: text,
      })
    }
  }

  const totalTokens = rawFiles.reduce((acc, f) => acc + f.tokens, 0)
  const duplicateBlocks = findDuplicateBlocks(rawFiles.map((f) => ({ path: f.path, content: f.content })))
  return {
    root,
    files: rawFiles.map(({ content: _content, ...rest }) => rest),
    totalTokens,
    duplicateBlocks,
  }
}

/** 技能目录摘要（模型每个请求都会看到 catalog：name + description）。 */
export interface SkillCatalogResult {
  count: number
  totalDescriptionTokens: number
  bySource: { source: string; count: number; descriptionTokens: number }[]
  duplicateDescriptions: { name: string; description: string; count: number }[]
}

export async function scanSkillCatalog(
  skillList: Awaited<ReturnType<SkillService['list']>>,
  signal: AbortSignal,
): Promise<SkillCatalogResult> {
  void signal
  const bySource = new Map<string, { count: number; descriptionTokens: number }>()
  let total = 0
  for (const skill of skillList) {
    const tokens = estimateTokens(skill.description)
    total += tokens
    const cur = bySource.get(skill.source) ?? { count: 0, descriptionTokens: 0 }
    cur.count++
    cur.descriptionTokens += tokens
    bySource.set(skill.source, cur)
  }
  return {
    count: skillList.length,
    totalDescriptionTokens: total,
    bySource: [...bySource.entries()]
      .map(([source, v]) => ({ source, ...v }))
      .sort((a, b) => b.descriptionTokens - a.descriptionTokens),
    duplicateDescriptions: skillList.map((s) => ({ name: s.name, description: s.description }))
      .filter((s) => s.description !== '')
      .reduce<{ name: string; description: string; count: number }[]>((acc, s) => {
        const key = s.description.trim().toLowerCase().replace(/\s+/g, ' ')
        const hit = acc.find((h) => h.description.trim().toLowerCase().replace(/\s+/g, ' ') === key)
        if (hit !== undefined) hit.count++
        else acc.push({ ...s, count: 1 })
        return acc
      }, [])
      .filter((h) => h.count >= 2)
      .sort((a, b) => b.count - a.count),
  }
}

/** 工具 schema（模型每请求都会看到的固定成本）。 */
export interface ToolSchemaResult {
  visibleCount: number
  schemaTokens: number
  nativeCount: number
  nativeTokens: number
  mcp: McpSummary
}

export async function scanToolSchemas(
  tools: ToolRegistry,
  agent: unknown,
  signal: AbortSignal,
): Promise<ToolSchemaResult> {
  void signal
  let schemas: { name: string; description?: string; parameters?: unknown }[] = []
  try {
    schemas = tools.schemas(agent as never)
  } catch {
    try {
      schemas = tools.schemas()
    } catch {
      schemas = []
    }
  }
  let schemaTokens = 0
  let nativeCount = 0
  let nativeTokens = 0
  for (const schema of schemas) {
    const tokens = estimateTokens(schema.name) + estimateTokens(schema.description ?? '')
    schemaTokens += tokens
    if (schema.name.startsWith('mcp__')) continue
    nativeCount++
    nativeTokens += tokens
  }
  const mcp = groupMcpTools(schemas)
  return { visibleCount: schemas.length, schemaTokens, nativeCount, nativeTokens, mcp }
}
