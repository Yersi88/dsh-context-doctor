import { findDuplicateDescriptions, findRankShadows } from "./analyze.js";
import { scanInstructionChain, scanSkillCatalog, scanToolSchemas } from "./scan.js";
import { estimateTokens, formatBytes, formatTokens } from "./tokens.js";
/** 执行一次完整审计。 */
export async function runAudit(deps, options) {
    const { fs, skills, tools } = deps;
    const { cwd, signal } = options;
    // skills.list 只调一次：技能目录统计与冲突检测共用同一份列表。
    const skillList = await skills.list({ cwd, signal });
    const [instructions, skillCatalog, toolSchemas] = await Promise.all([
        scanInstructionChain(fs, cwd, signal),
        scanSkillCatalog(skillList, signal),
        scanToolSchemas(tools, options.agent, signal),
    ]);
    // 可选：统计技能正文总 token（前 N 个）
    let bodies;
    if (options.includeSkillBodies === true) {
        const max = Math.max(1, Math.min(options.maxSkillBodies ?? 20, 100));
        let count = 0;
        let totalTokens = 0;
        for (const summary of skillList.slice(0, max)) {
            try {
                const def = await skills.get(summary.name, { cwd, signal });
                if (def !== undefined) {
                    count++;
                    totalTokens += estimateTokens(def.content);
                }
            }
            catch {
                // 单个技能加载失败不影响整体
            }
        }
        bodies = { count, totalTokens };
    }
    const conflicts = findRankShadows(skillList.map((s) => ({
        name: s.name,
        source: s.source,
        provider: s.provider,
        rank: rankOfSource(s.source),
    })));
    const suggestions = buildSuggestions({
        instructions,
        skills: { ...skillCatalog, ...(bodies !== undefined ? { bodies } : {}) },
        tools: toolSchemas,
        conflicts,
    });
    return {
        tool: 'context_audit',
        version: 1,
        cwd,
        injected: {
            instructions: {
                root: instructions.root,
                files: instructions.files,
                totalTokens: instructions.totalTokens,
                duplicateBlocks: instructions.duplicateBlocks.map((b) => ({ tokens: b.tokens, paths: b.paths })),
            },
            skills: {
                catalogCount: skillCatalog.count,
                catalogDescriptionTokens: skillCatalog.totalDescriptionTokens,
                bySource: skillCatalog.bySource,
                duplicateDescriptions: skillCatalog.duplicateDescriptions,
                ...(bodies !== undefined ? { bodies } : {}),
            },
            tools: {
                visibleCount: toolSchemas.visibleCount,
                schemaTokens: toolSchemas.schemaTokens,
                nativeCount: toolSchemas.nativeCount,
                nativeTokens: toolSchemas.nativeTokens,
                mcp: toolSchemas.mcp,
            },
        },
        conflicts,
        suggestions,
    };
}
/** SkillSummary 的 rank 不在公开类型里；按来源给启发式排序值（与官方 rank 语义一致：低者胜）。 */
export function rankOfSource(source) {
    switch (source) {
        case 'project-dsh': return 100;
        case 'project-agents': return 200;
        case 'runtime': return 250;
        case 'user-dsh': return 300;
        case 'user-agents': return 400;
        case 'custom': return 500;
        case 'bundled': return 600;
        default: return 900;
    }
}
/** 按严重度排序的裁剪建议。 */
export function buildSuggestions(input) {
    const out = [];
    if (input.instructions.totalTokens > 8000) {
        out.push({
            severity: 'high',
            text: `指令链总 token 偏高（${formatTokens(input.instructions.totalTokens)}），建议精简 AGENTS.md/CLAUDE.md，只保留每层独有的规则。`,
        });
    }
    for (const block of input.instructions.duplicateBlocks.slice(0, 5)) {
        out.push({
            severity: 'medium',
            text: `重复段落（${formatTokens(block.tokens)} token）出现在 ${block.paths.length} 个文件：${block.paths.join('、')}。建议只保留一处，其余改为链接。`,
        });
    }
    if (input.skills.totalDescriptionTokens > 3000) {
        out.push({
            severity: 'medium',
            text: `技能 catalog 摘要占用 ${formatTokens(input.skills.totalDescriptionTokens)} token（${input.skills.count} 个技能，每个请求都会携带），建议缩短 description 或减少技能数量。`,
        });
    }
    for (const dup of input.skills.duplicateDescriptions.slice(0, 5)) {
        out.push({
            severity: 'medium',
            text: `${dup.count} 个技能描述完全相同（如「${dup.name}」），catalog 存在冗余，建议合并或差异化描述。`,
        });
    }
    if (input.skills.bodies !== undefined && input.skills.bodies.totalTokens > 20000) {
        out.push({
            severity: 'low',
            text: `已统计 ${input.skills.bodies.count} 个技能正文，共约 ${formatTokens(input.skills.bodies.totalTokens)} token（按需加载，不常驻请求）。`,
        });
    }
    if (input.tools.mcp.totalTokens > 4000 || input.tools.mcp.totalTools > 20) {
        out.push({
            severity: 'high',
            text: `MCP 工具面膨胀：${input.tools.mcp.totalTools} 个工具、schema 约 ${formatTokens(input.tools.mcp.totalTokens)} token。最大服务器：${input.tools.mcp.servers.slice(0, 3).map((s) => `${s.server}(${s.tools} 工具)`).join('、')}。建议裁剪不需要的服务器或工具。`,
        });
    }
    if (input.tools.visibleCount > 40) {
        out.push({
            severity: 'low',
            text: `可见工具共 ${input.tools.visibleCount} 个（schema 约 ${formatTokens(input.tools.schemaTokens)} token），每个请求都会携带，建议检查是否全部需要。`,
        });
    }
    for (const conflict of input.conflicts.slice(0, 5)) {
        out.push({
            severity: 'medium',
            text: `技能「${conflict.name}」存在多个来源：${conflict.winner.source}(${conflict.winner.provider}) 胜出，${conflict.shadowed.map((s) => `${s.source}(${s.provider})`).join('、')} 被 shadow，模型只会加载胜出者。`,
        });
    }
    return out;
}
/** 把 canonical 报告渲染成模型可读文本。 */
export function renderReport(report) {
    const lines = [];
    lines.push(`# Context Doctor 审计报告（cwd: ${report.cwd}）`);
    lines.push('');
    const inst = report.injected.instructions;
    lines.push(`## 1. 指令链（AGENTS.md / CLAUDE.md）`);
    lines.push(`- 注入文件：${inst.files.length} 个，共 ${formatTokens(inst.totalTokens)} token`);
    for (const f of inst.files) {
        lines.push(`  - ${f.path}（${formatTokens(f.tokens)} token / ${formatBytes(f.bytes)}）`);
    }
    if (inst.duplicateBlocks.length > 0) {
        lines.push(`- ⚠ 跨文件重复段落：${inst.duplicateBlocks.length} 处`);
        for (const b of inst.duplicateBlocks.slice(0, 5)) {
            lines.push(`  - ${formatTokens(b.tokens)} token × ${b.paths.length} 文件：${b.paths.join('、')}`);
        }
    }
    else {
        lines.push('- 未发现跨文件重复段落');
    }
    lines.push('');
    const sk = report.injected.skills;
    lines.push(`## 2. 技能目录（catalog，每请求常驻）`);
    lines.push(`- ${sk.catalogCount} 个技能，摘要共 ${formatTokens(sk.catalogDescriptionTokens)} token`);
    for (const s of sk.bySource) {
        lines.push(`  - ${s.source}: ${s.count} 个 / ${formatTokens(s.descriptionTokens)} token`);
    }
    if (sk.bodies !== undefined) {
        lines.push(`- 技能正文（按需加载）：已统计 ${sk.bodies.count} 个，共约 ${formatTokens(sk.bodies.totalTokens)} token`);
    }
    if (sk.duplicateDescriptions.length > 0) {
        lines.push(`- ⚠ 描述重复：${sk.duplicateDescriptions.length} 组`);
        for (const d of sk.duplicateDescriptions.slice(0, 5)) {
            lines.push(`  - ${d.count} 个技能共用描述（如「${d.name}」）`);
        }
    }
    lines.push('');
    const tl = report.injected.tools;
    lines.push(`## 3. 工具 schema（每请求常驻）`);
    lines.push(`- 可见工具 ${tl.visibleCount} 个，schema 共 ${formatTokens(tl.schemaTokens)} token（其中原生 ${tl.nativeCount} 个 / ${formatTokens(tl.nativeTokens)} token）`);
    if (tl.mcp.totalTools > 0) {
        lines.push(`- MCP：${tl.mcp.totalTools} 个工具 / ${formatTokens(tl.mcp.totalTokens)} token`);
        for (const s of tl.mcp.servers) {
            lines.push(`  - ${s.server}: ${s.tools} 工具 / ${formatTokens(s.schemaTokens)} token`);
        }
    }
    lines.push('');
    if (report.conflicts.length > 0) {
        lines.push(`## 4. 同名技能冲突（rank shadow）`);
        for (const c of report.conflicts) {
            lines.push(`- ${c.name}: ${c.winner.source}(${c.winner.provider}) 胜出；${c.shadowed.map((s) => `${s.source}(${s.provider})`).join('、')} 被 shadow`);
        }
        lines.push('');
    }
    lines.push(`## 5. 建议（${report.suggestions.length} 条）`);
    if (report.suggestions.length === 0) {
        lines.push('- 未发现明显问题，当前注入面健康。');
    }
    for (const s of report.suggestions) {
        lines.push(`- [${s.severity}] ${s.text}`);
    }
    return lines.join('\n');
}
