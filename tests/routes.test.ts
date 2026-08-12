import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { makeAuditRoutes } from '../src/routes.ts'
import type { AuditReport } from '../src/audit.ts'

/** 最小 WebRoute 处理函数测试辅助：构造 req/res 并捕获响应。 */
function callHandler(
  handler: (req: IncomingMessage, res: ServerResponse) => void,
  url: string,
): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve) => {
    const res = {
      writeHead(status: number) {
        this.status = status
        return this
      },
      end(payload: string) {
        resolve({ status: this.status, body: JSON.parse(payload) })
      },
    } as ServerResponse & { status: number }
    const req = { method: 'GET', url } as IncomingMessage
    handler(req, res)
  })
}

test('makeAuditRoutes: 返回 audit 路由并返回报告', async () => {
  const fakeReport: AuditReport = {
    tool: 'context_audit',
    version: 1,
    cwd: '/tmp/x',
    injected: {
      instructions: { root: '/tmp/x', files: [], totalTokens: 0, duplicateBlocks: [] },
      skills: { catalogCount: 0, catalogDescriptionTokens: 0, bySource: [], duplicateDescriptions: [] },
      tools: { visibleCount: 0, schemaTokens: 0, nativeCount: 0, nativeTokens: 0, mcp: { servers: [], totalTools: 0, totalTokens: 0 } },
    },
    conflicts: [],
    suggestions: [],
  }
  const routes = makeAuditRoutes({
    deps: {
      fs: {} as never,
      skills: {
        list: async () => [],
      } as never,
      tools: {} as never,
    },
    defaultCwd: '/tmp/x',
    cacheTtlMs: 60_000,
  })
  // 覆盖 runAudit 依赖：直接替换内部 audit 执行（通过把 skills.list 抛错触发失败路径不现实；
  // 这里改为验证路由形状与方法检查）
  assert.equal(routes.length, 1)
  assert.equal(routes[0]!.kind, 'exact')
  assert.equal(routes[0]!.path, '/api/context-doctor/audit')

  // 方法检查：POST 返回 405
  const res405 = await new Promise<{ status: number }>((resolve) => {
    const res = {
      writeHead(status: number) { this.status = status; return this },
      end() { resolve({ status: this.status }) },
    } as ServerResponse & { status: number }
    routes[0]!.handler({ method: 'POST', url: '/api/context-doctor/audit' } as IncomingMessage, res)
  })
  assert.equal(res405.status, 405)

  // GET 触发真实审计（skills.list 为空 → 报告可生成）
  const result = await callHandler(routes[0]!.handler, '/api/context-doctor/audit?cwd=/tmp/x')
  assert.equal(result.status, 200)
  const body = result.body as { ok: boolean; report: AuditReport }
  assert.equal(body.ok, true)
  assert.equal(body.report.tool, 'context_audit')
  assert.equal(body.report.cwd, '/tmp/x')
})
