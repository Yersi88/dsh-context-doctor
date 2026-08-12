/**
 * Context Doctor HTTP 路由：浏览器半区通过同源 JSON 接口拉取审计报告
 * （`GET /api/context-doctor/audit`）。与 dsh-pet-web 的 /api/pet/* 同款模式。
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver'
import type { AuditDeps, AuditReport } from './audit.ts'
import { runAudit } from './audit.ts'

/** 浏览器侧 API 前缀。 */
export const AUDIT_API_PREFIX = '/api/context-doctor'

/** 审计接口配置。 */
export interface AuditRoutesConfig {
  deps: AuditDeps
  /** 默认审计目录（cwd 参数缺省时使用）。 */
  defaultCwd?: string
  /** 结果缓存时长（毫秒）。默认 60s。 */
  cacheTtlMs?: number
}

/** 写 JSON 响应。 */
function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

/** 从查询字符串解析 cwd（URL 解码 + 仅接受路径字符）。 */
function parseCwd(url: string): string | undefined {
  const query = url.includes('?') ? url.slice(url.indexOf('?') + 1) : ''
  for (const part of query.split('&')) {
    if (!part.startsWith('cwd=')) continue
    try {
      return decodeURIComponent(part.slice(4))
    } catch {
      return undefined
    }
  }
  return undefined
}

/** 构造审计路由（含 60s 缓存与 in-flight 复用）。 */
export function makeAuditRoutes(config: AuditRoutesConfig): WebRoute[] {
  const { deps, defaultCwd, cacheTtlMs = 60_000 } = config
  const cache = new Map<string, { at: number; promise: Promise<AuditReport> }>()
  /** 缓存条目上限：防止不同 cwd 参数让缓存无限增长（超限时淘汰最旧条目）。 */
  const MAX_CACHE_ENTRIES = 32

  const audit = (cwd: string): Promise<AuditReport> => {
    const hit = cache.get(cwd)
    if (hit !== undefined && Date.now() - hit.at < cacheTtlMs) return hit.promise
    if (cache.size >= MAX_CACHE_ENTRIES) {
      const oldest = cache.keys().next().value
      if (oldest !== undefined) cache.delete(oldest)
    }
    const promise = runAudit(deps, { cwd, signal: new AbortController().signal })
      .catch((error: unknown) => {
        // 失败不缓存，允许下次重试
        cache.delete(cwd)
        throw error
      })
    cache.set(cwd, { at: Date.now(), promise })
    return promise
  }

  return [{
    kind: 'exact',
    path: `${AUDIT_API_PREFIX}/audit`,
    handler: (req: IncomingMessage, res: ServerResponse): void => {
      if (req.method !== 'GET') {
        json(res, 405, { ok: false, error: 'method-not-allowed' })
        return
      }
      const cwd = parseCwd(req.url ?? '') ?? defaultCwd ?? process.cwd()
      audit(cwd).then(
        (report) => json(res, 200, { ok: true, report }),
        (error: unknown) => json(res, 500, {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }),
      )
    },
  }]
}
