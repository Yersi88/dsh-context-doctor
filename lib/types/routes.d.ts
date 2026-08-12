import type { WebRoute } from '@deepseek-ai/dsh-host-webserver';
import type { AuditDeps } from './audit.ts';
/** 浏览器侧 API 前缀。 */
export declare const AUDIT_API_PREFIX = "/api/context-doctor";
/** 审计接口配置。 */
export interface AuditRoutesConfig {
    deps: AuditDeps;
    /** 默认审计目录（cwd 参数缺省时使用）。 */
    defaultCwd?: string;
    /** 结果缓存时长（毫秒）。默认 60s。 */
    cacheTtlMs?: number;
}
/** 构造审计路由（含 60s 缓存与 in-flight 复用）。 */
export declare function makeAuditRoutes(config: AuditRoutesConfig): WebRoute[];
