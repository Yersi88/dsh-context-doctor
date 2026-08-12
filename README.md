# Context Doctor — DSH 上下文注入审计插件

> 审计"模型每个请求到底背着多少上下文"，找出重复、冲突与浪费 token 的注入物，给出可执行的裁剪建议。**全程只读，不修改任何文件。**

## 两种形态（v0.2）

1. **Web UI 圆环面板**（composer 发送框旁）：圆环显示"常驻注入"估算 token（指令链 + 技能 catalog + 工具 schema），颜色按严重度分级（绿 <10k / 黄 <30k / 红 ≥30k）；点击展开分项明细（指令链 / 技能 catalog / 工具 schema / MCP）+ 建议列表 + 手动刷新。数据经 `GET /api/context-doctor/audit`（host 侧 60s 缓存）拉取。
2. **`context_audit` 模型工具**：完整审计报告（含 rank shadow 冲突与按严重度排序的建议），模型可自主调用并执行建议。

## 它审计什么

DSH 会话里，模型每个请求都携带一批常驻注入物。Context Doctor 逐项量化：

| 注入物 | 审计内容 | 成本性质 |
|---|---|---|
| **指令链** | 从 git 根到当前工作目录每一层的 `AGENTS.md` / `CLAUDE.md`：文件数、token 估算、**跨文件完全相同的重复段落** | 每请求常驻 |
| **技能目录（catalog）** | `ctx.skills` 中所有技能的 `name + description`（模型每请求看到 `<available_skills>`）、按来源分组统计、**描述完全相同的冗余技能** | 每请求常驻 |
| **工具 schema** | 当前 agent 可见的全部工具（`ctx.tools.schemas`）：数量、schema token 估算、原生工具与 MCP 工具分组 | 每请求常驻 |
| **MCP 工具面** | 按服务器分组的 MCP 工具数与 schema token（`mcp__<server>__<tool>` 命名解析），识别工具面膨胀 | 每请求常驻 |
| **技能正文**（可选） | 前 N 个技能的正文总 token（按需加载，不常驻请求，用于对比"常驻 vs 按需"成本） | 按需加载 |

**冲突检测**：同名技能多来源并存时（如项目技能 shadow 掉 bundled 技能），报告哪个胜出、哪些被静默遮蔽。

## 安装

```sh
# 1. 从 GitHub 仓库安装（官方 bundle 插件机制；构建产物已入库，git 源安装直接可用）
dsh plugin --profile web add "github:dsh-external/context-doctor#main"
# 验证：dsh --profile web --dump-config | grep context-doctor  # 合成树应含该条目

# 2. 重启 dsh web（或等待 HMR 热载），新会话中：
#    - 模型工具 `context_audit` 可用
#    - composer 发送框旁出现 Context Doctor 圆环（点击展开面板）
```

> 浏览器半区（`dsh.client`）需要宿主在激活时校验构建产物；改完源码后必须重新 `pnpm run build` 再重启 `dsh web`。

无 Web 半区（纯 host 插件），不需要 `dsh.client` 声明；卸载即净，不写入 DSH 内核。

## 使用

模型直接调用工具即可：

```
context_audit            # 审计当前会话工作目录
context_audit cwd=/path/to/project
context_audit includeSkillBodies=true maxSkillBodies=20
```

输出 canonical JSON（`AuditReport`）：

```jsonc
{
  "tool": "context_audit",
  "version": 1,
  "cwd": "/path/to/project",
  "injected": {
    "instructions": { "files": [{ "path": "...", "bytes": 3421, "tokens": 812 }], "totalTokens": 812, "duplicateBlocks": [...] },
    "skills": { "catalogCount": 177, "catalogDescriptionTokens": 4150, "bySource": [...], "duplicateDescriptions": [...] },
    "tools": { "visibleCount": 42, "schemaTokens": 9800, "nativeCount": 38, "nativeTokens": 6100,
               "mcp": { "servers": [{ "server": "github", "tools": 12, "schemaTokens": 2400 }], "totalTools": 12, "totalTokens": 2400 } }
  },
  "conflicts": [{ "name": "skill-x", "winner": {"source": "project-dsh", ...}, "shadowed": [...] }],
  "suggestions": [{ "severity": "high", "text": "..." }]
}
```

Native 渲染为分节可读报告（指令链 / 技能 / 工具 / 冲突 / 建议），模型可直接照建议执行裁剪。

## 开发

```sh
pnpm run typecheck   # tsc --noEmit
pnpm test            # node --test（Node ≥ 22.19，原生 TS 支持，零测试依赖）
pnpm run build       # tsc + tsdown（host + client 双半区）→ lib/
```

测试 22 个用例：token 估算、重复块/描述检测、rank shadow、MCP 分组、指令链端到端（真实临时文件系统 + fake FileSystem）、插件入口与完整 execute 报告链路、HTTP 路由（方法检查 + 真实审计响应）。

## 安全边界

- **只读**：只用 `ctx.fs` 的 read/stat/list 子集，不写不删；不执行任何审计对象。
- **大小上限**：单文件 > 256 KB 跳过，防止审计器自身被拖垮。
- **不输出正文**：报告只含路径、统计与重复段落片段，不含完整文件内容；技能正文仅统计 token 总量。
- **token 为启发式估算**（ASCII ≈ 4 字符/token，中文 ≈ 1.5 字符/token），用于相对比较，精确值以模型 tokenizer 为准。

## 验收清单

- [ ] `pnpm run build` 通过，产出 `lib/index.js` + `lib/types/`
- [ ] `pnpm test` 21/21 通过
- [ ] `dsh plugin --profile web add link:<本目录>` 安装成功
- [ ] 新会话中调用 `context_audit` 得到分节报告，模型可见 `injected` 四项统计与 `suggestions`
- [ ] 报告中的重复段落/冗余技能与真实情况一致（可用 `includeSkillBodies=true` 交叉验证）

## 已知限制（v0.1）

- 指令链重复检测只做"完全相同的段落块"，不做语义相似度；跨文件引用同一事实的不同表述暂不识别。
- MCP 工具 schema 按 `name + description` 估算，未计入 JSON Schema 参数细节。
- 技能正文统计默认关闭（加载正文有成本），catalog 摘要成本始终统计。
