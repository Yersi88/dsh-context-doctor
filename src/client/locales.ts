/**
 * Context Doctor locale dictionaries (zh/en).
 * @module dsh-context-doctor/client/locales
 */

/** Dictionary namespace this package registers. */
export const NS = 'context-doctor'

/** Chinese copy. */
export const zh = {
  'cd.title': 'Context Doctor',
  'cd.residentTokens': '常驻注入',
  'cd.instructions': '指令链',
  'cd.skills': '技能 catalog',
  'cd.tools': '工具 schema',
  'cd.mcp': 'MCP 工具',
  'cd.suggestions': '建议 {n} 条',
  'cd.refresh': '刷新',
  'cd.loading': '审计中…',
  'cd.error': '审计失败',
  'cd.empty': '暂无数据',
  'cd.healthy': '健康',
  'cd.attention': '需关注',
  'cd.review': '建议优化',
  'cd.healthyHint': '常驻上下文仍在建议预算内。',
  'cd.reviewHint': '优先处理下方建议，降低后续请求的上下文负担。',
  'cd.guideline': '50k 参考线',
  'cd.updated': '更新于',
  'cd.catalog': '{n} 技能',
  'cd.mcpTools': '{n} 工具',
  'cd.files': '文件',
  'cd.toolsCount': '工具',
  'cd.hint': '点击圆环切换面板',
} as const

/** English copy. */
export const en = {
  'cd.title': 'Context Doctor',
  'cd.residentTokens': 'resident injection',
  'cd.instructions': 'Instruction chain',
  'cd.skills': 'Skill catalog',
  'cd.tools': 'Tool schemas',
  'cd.mcp': 'MCP tools',
  'cd.suggestions': '{n} suggestions',
  'cd.refresh': 'Refresh',
  'cd.loading': 'Auditing…',
  'cd.error': 'Audit failed',
  'cd.empty': 'No data yet',
  'cd.healthy': 'healthy',
  'cd.attention': 'attention',
  'cd.review': 'worth reviewing',
  'cd.healthyHint': 'Resident context remains within the budget guideline.',
  'cd.reviewHint': 'Start with the suggestions below to reduce request overhead.',
  'cd.guideline': '50k guide',
  'cd.updated': 'Updated',
  'cd.catalog': '{n} skills',
  'cd.mcpTools': '{n} tools',
  'cd.files': 'files',
  'cd.toolsCount': 'tools',
  'cd.hint': 'Click ring to toggle',
} as const

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** context-doctor UI copy. */
    'context-doctor': keyof typeof zh
  }
}
