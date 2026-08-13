/**
 * 审计引擎：context_audit 工具与 HTTP 路由共用的核心逻辑。
 */
import type { FileSystem } from '@deepseek-ai/dsh-fs';
import type { SkillRegistry } from '@deepseek-ai/dsh-skill';
import type { ToolRuntime } from '@deepseek-ai/dsh-tools';
/** 审计报告（canonical JSON 值）。 */
export interface AuditReport {
    tool: 'context_audit';
    version: 1;
    cwd: string;
    injected: {
        instructions: {
            root: string;
            files: {
                path: string;
                bytes: number;
                tokens: number;
            }[];
            totalTokens: number;
            duplicateBlocks: {
                tokens: number;
                paths: string[];
            }[];
        };
        skills: {
            catalogCount: number;
            catalogDescriptionTokens: number;
            bySource: {
                source: string;
                count: number;
                descriptionTokens: number;
            }[];
            duplicateDescriptions: {
                name: string;
                description: string;
                count: number;
            }[];
            bodies?: {
                count: number;
                totalTokens: number;
            };
        };
        tools: {
            visibleCount: number;
            schemaTokens: number;
            nativeCount: number;
            nativeTokens: number;
            mcp: {
                servers: {
                    server: string;
                    tools: number;
                    schemaTokens: number;
                }[];
                totalTools: number;
                totalTokens: number;
            };
        };
    };
    conflicts: {
        name: string;
        winner: {
            source: string;
            provider: string;
        };
        shadowed: {
            source: string;
            provider: string;
        }[];
    }[];
    suggestions: {
        severity: 'high' | 'medium' | 'low';
        text: string;
    }[];
}
/** 审计引擎依赖的服务面（工具执行与 HTTP 路由共用）。 */
export interface AuditDeps {
    fs: FileSystem;
    skills: SkillRegistry;
    tools: ToolRuntime;
}
/** 审计选项。 */
export interface AuditOptions {
    cwd: string;
    signal: AbortSignal;
    /** 是否统计技能正文总 token（逐个加载正文，较慢）。 */
    includeSkillBodies?: boolean;
    /** includeSkillBodies 时最多统计的技能个数。 */
    maxSkillBodies?: number;
    /** 当前执行上下文（工具执行时传入 exec.agent，用于解析会话 cwd）。 */
    agent?: unknown;
}
/** 执行一次完整审计。 */
export declare function runAudit(deps: AuditDeps, options: AuditOptions): Promise<AuditReport>;
/** SkillSummary 的 rank 不在公开类型里；按来源给启发式排序值（与官方 rank 语义一致：低者胜）。 */
export declare function rankOfSource(source: string): number;
interface SuggestionInput {
    instructions: {
        totalTokens: number;
        duplicateBlocks: {
            tokens: number;
            paths: string[];
        }[];
    };
    skills: {
        count: number;
        totalDescriptionTokens: number;
        bySource: {
            source: string;
            count: number;
            descriptionTokens: number;
        }[];
        duplicateDescriptions: {
            name: string;
            description: string;
            count: number;
        }[];
        bodies?: {
            count: number;
            totalTokens: number;
        };
    };
    tools: {
        visibleCount: number;
        schemaTokens: number;
        mcp: {
            servers: {
                server: string;
                tools: number;
                schemaTokens: number;
            }[];
            totalTools: number;
            totalTokens: number;
        };
    };
    conflicts: {
        name: string;
        winner: {
            source: string;
            provider: string;
        };
        shadowed: {
            source: string;
            provider: string;
        }[];
    }[];
}
/** 按严重度排序的裁剪建议。 */
export declare function buildSuggestions(input: SuggestionInput): {
    severity: 'high' | 'medium' | 'low';
    text: string;
}[];
/** 把 canonical 报告渲染成模型可读文本。 */
export declare function renderReport(report: AuditReport): string;
export {};
