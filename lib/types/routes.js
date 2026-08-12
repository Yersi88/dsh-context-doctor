import { runAudit } from "./audit.js";
/** 浏览器侧 API 前缀。 */
export const AUDIT_API_PREFIX = '/api/context-doctor';
/** 写 JSON 响应。 */
function json(res, status, body) {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(body));
}
/** 从查询字符串解析 cwd（URL 解码 + 仅接受路径字符）。 */
function parseCwd(url) {
    const query = url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
    for (const part of query.split('&')) {
        if (!part.startsWith('cwd='))
            continue;
        try {
            return decodeURIComponent(part.slice(4));
        }
        catch {
            return undefined;
        }
    }
    return undefined;
}
/** 构造审计路由（含 60s 缓存与 in-flight 复用）。 */
export function makeAuditRoutes(config) {
    const { deps, defaultCwd, cacheTtlMs = 60_000 } = config;
    const cache = new Map();
    /** 缓存条目上限：防止不同 cwd 参数让缓存无限增长（超限时淘汰最旧条目）。 */
    const MAX_CACHE_ENTRIES = 32;
    const audit = (cwd) => {
        const hit = cache.get(cwd);
        if (hit !== undefined && Date.now() - hit.at < cacheTtlMs)
            return hit.promise;
        if (cache.size >= MAX_CACHE_ENTRIES) {
            const oldest = cache.keys().next().value;
            if (oldest !== undefined)
                cache.delete(oldest);
        }
        const promise = runAudit(deps, { cwd, signal: new AbortController().signal })
            .catch((error) => {
            // 失败不缓存，允许下次重试
            cache.delete(cwd);
            throw error;
        });
        cache.set(cwd, { at: Date.now(), promise });
        return promise;
    };
    return [{
            kind: 'exact',
            path: `${AUDIT_API_PREFIX}/audit`,
            handler: (req, res) => {
                if (req.method !== 'GET') {
                    json(res, 405, { ok: false, error: 'method-not-allowed' });
                    return;
                }
                const cwd = parseCwd(req.url ?? '') ?? defaultCwd ?? process.cwd();
                audit(cwd).then((report) => json(res, 200, { ok: true, report }), (error) => json(res, 500, {
                    ok: false,
                    error: error instanceof Error ? error.message : String(error),
                }));
            },
        }];
}
