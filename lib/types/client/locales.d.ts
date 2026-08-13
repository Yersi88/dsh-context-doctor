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
    readonly 'cd.suggestions': "建议 {n}";
    readonly 'cd.refresh': "刷新";
    readonly 'cd.loading': "审计中…";
    readonly 'cd.error': "审计失败";
    readonly 'cd.empty': "暂无数据";
    readonly 'cd.catalog': "{n} 技能";
    readonly 'cd.mcpTools': "{n} 工具";
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
    readonly 'cd.catalog': "{n} skills";
    readonly 'cd.mcpTools': "{n} tools";
};
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** context-doctor UI copy. */
        'context-doctor': keyof typeof zh;
    }
}
