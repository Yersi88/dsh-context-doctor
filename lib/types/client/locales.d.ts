/**
 * Context Doctor locale dictionaries (zh/en).
 * @module dsh-context-doctor/client/locales
 */
/** Dictionary namespace this package registers. */
export declare const NS = "context-doctor";
/** Chinese copy. */
export declare const zh: {
    readonly 'cd.title': "Context Doctor";
    readonly 'cd.residentTokens': "常驻注入";
    readonly 'cd.instructions': "指令链";
    readonly 'cd.skills': "技能 catalog";
    readonly 'cd.tools': "工具 schema";
    readonly 'cd.mcp': "MCP 工具";
    readonly 'cd.suggestions': "建议 {n} 条";
    readonly 'cd.refresh': "刷新";
    readonly 'cd.loading': "审计中…";
    readonly 'cd.error': "审计失败";
    readonly 'cd.empty': "暂无数据";
    readonly 'cd.healthy': "健康";
    readonly 'cd.attention': "需关注";
    readonly 'cd.review': "建议优化";
    readonly 'cd.healthyHint': "常驻上下文仍在建议预算内。";
    readonly 'cd.reviewHint': "优先处理下方建议，降低后续请求的上下文负担。";
    readonly 'cd.guideline': "50k 参考线";
    readonly 'cd.updated': "更新于";
    readonly 'cd.catalog': "{n} 技能";
    readonly 'cd.mcpTools': "{n} 工具";
    readonly 'cd.files': "文件";
    readonly 'cd.toolsCount': "工具";
    readonly 'cd.hint': "点击圆环切换面板";
};
/** English copy. */
export declare const en: {
    readonly 'cd.title': "Context Doctor";
    readonly 'cd.residentTokens': "resident injection";
    readonly 'cd.instructions': "Instruction chain";
    readonly 'cd.skills': "Skill catalog";
    readonly 'cd.tools': "Tool schemas";
    readonly 'cd.mcp': "MCP tools";
    readonly 'cd.suggestions': "{n} suggestions";
    readonly 'cd.refresh': "Refresh";
    readonly 'cd.loading': "Auditing…";
    readonly 'cd.error': "Audit failed";
    readonly 'cd.empty': "No data yet";
    readonly 'cd.healthy': "healthy";
    readonly 'cd.attention': "attention";
    readonly 'cd.review': "worth reviewing";
    readonly 'cd.healthyHint': "Resident context remains within the budget guideline.";
    readonly 'cd.reviewHint': "Start with the suggestions below to reduce request overhead.";
    readonly 'cd.guideline': "50k guide";
    readonly 'cd.updated': "Updated";
    readonly 'cd.catalog': "{n} skills";
    readonly 'cd.mcpTools': "{n} tools";
    readonly 'cd.files': "files";
    readonly 'cd.toolsCount': "tools";
    readonly 'cd.hint': "Click ring to toggle";
};
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** context-doctor UI copy. */
        'context-doctor': keyof typeof zh;
    }
}
