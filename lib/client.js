window.__ModuleLoader__.load({
	id: "dsh-context-doctor",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_runtime_client = require("@deepseek-ai/dsh-client-runtime/client");
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/store.ts
		/**
		* Browser-side audit store: the audit report snapshot plus fetch lifecycle,
		* written only through the store's actions. Components only read snapshots.
		* @module dsh-context-doctor/client/store
		*/
		/** Create the audit store handle (apply world only; never module-level). */
		function createAuditStore() {
			return (0, _deepseek_ai_dsh_client_runtime_client.defineStore)({
				init: () => ({
					state: "idle",
					report: null,
					error: null,
					refreshedAt: null
				}),
				actions: {
					setState: (draft, state, error) => {
						draft.state = state;
						draft.error = error;
					},
					setReport: (draft, report) => {
						draft.report = report;
						draft.state = "ready";
						draft.error = null;
						draft.refreshedAt = Date.now();
					}
				}
			});
		}
		//#endregion
		//#region src/client/locales.ts
		/**
		* Context Doctor locale dictionaries (zh/en).
		* @module dsh-context-doctor/client/locales
		*/
		/** Dictionary namespace this package registers. */
		const NS = "context-doctor";
		/** Chinese copy. */
		const zh = {
			"cd.title": "Context Doctor",
			"cd.residentTokens": "常驻注入",
			"cd.instructions": "指令链",
			"cd.skills": "技能 catalog",
			"cd.tools": "工具 schema",
			"cd.mcp": "MCP 工具",
			"cd.suggestions": "建议 {n}",
			"cd.refresh": "刷新",
			"cd.loading": "审计中…",
			"cd.error": "审计失败",
			"cd.empty": "暂无数据",
			"cd.catalog": "{n} 技能",
			"cd.mcpTools": "{n} 工具"
		};
		/** English copy. */
		const en = {
			"cd.title": "Context Doctor",
			"cd.residentTokens": "resident injection",
			"cd.instructions": "Instruction chain",
			"cd.skills": "Skill catalog",
			"cd.tools": "Tool schemas",
			"cd.mcp": "MCP tools",
			"cd.suggestions": "{n} suggestions",
			"cd.refresh": "Refresh",
			"cd.loading": "Auditing…",
			"cd.error": "Audit failed",
			"cd.empty": "No data yet",
			"cd.catalog": "{n} skills",
			"cd.mcpTools": "{n} tools"
		};
		//#endregion
		//#region src/client/ContextAuditRing.tsx
		/**
		* Context Doctor 圆环 + 展开面板（挂在 conversation.composer.dock）。
		* 圆环显示"常驻注入"估算 token（指令链 + 技能 catalog + 工具 schema），
		* 颜色按严重度分级；点击展开分项明细与建议数。数据经同源
		* `/api/context-doctor/audit` 拉取。
		* @module dsh-context-doctor/client/ContextAuditRing
		*/
		/** 常驻注入的"满量程"基准（token）：超过即视为接近爆满。 */
		const FULL_SCALE = 5e4;
		/** 严重度色阶（resident token）。 */
		function colorOf(tokens) {
			if (tokens < 1e4) return "#22c55e";
			if (tokens < 3e4) return "#eab308";
			return "#ef4444";
		}
		/** 格式化为 k 单位。 */
		function formatK(tokens) {
			if (tokens >= 1e3) {
				const k = tokens / 1e3;
				return `${k >= 100 ? Math.round(k) : k.toFixed(1)}k`;
			}
			return String(tokens);
		}
		/**
		* Dock entry：常驻注入 token 圆环 + 点击展开面板。
		*/
		function ContextAuditRing(props) {
			const { useStore, ensure, refresh, t } = props;
			const state = useStore((s) => s);
			const [open, setOpen] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				ensure();
			}, [ensure]);
			const report = state.report;
			const resident = report === null ? 0 : report.injected.instructions.totalTokens + report.injected.skills.catalogDescriptionTokens + report.injected.tools.schemaTokens;
			const percent = Math.min(1, resident / FULL_SCALE);
			const color = state.state === "error" ? "#ef4444" : colorOf(resident);
			const radius = 9;
			const circumference = 2 * Math.PI * radius;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				"data-context-doctor": true,
				style: {
					display: "inline-flex",
					alignItems: "center",
					gap: 4,
					position: "relative"
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => setOpen((v) => !v),
					title: t("cd.title"),
					"aria-label": t("cd.title"),
					style: {
						background: "none",
						border: "none",
						padding: 2,
						cursor: "pointer",
						display: "inline-flex",
						alignItems: "center",
						gap: 4
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
						width: 26,
						height: 26,
						viewBox: "0 0 24 24",
						role: "img",
						"aria-hidden": "true",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
							cx: 12,
							cy: 12,
							r: radius,
							fill: "none",
							stroke: "rgba(128,128,128,0.3)",
							strokeWidth: 2.5
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
							cx: 12,
							cy: 12,
							r: radius,
							fill: "none",
							stroke: color,
							strokeWidth: 2.5,
							strokeLinecap: "round",
							strokeDasharray: `${percent * circumference} ${circumference}`,
							transform: "rotate(-90 12 12)"
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							fontSize: 11,
							color: state.state === "error" ? "#ef4444" : "#666",
							whiteSpace: "nowrap"
						},
						children: state.state === "loading" ? t("cd.loading") : state.state === "error" ? "!" : report === null ? t("cd.empty") : `${formatK(resident)}t`
					})]
				}), open && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					role: "dialog",
					"aria-label": t("cd.title"),
					style: {
						position: "absolute",
						right: 0,
						bottom: "calc(100% + 6px)",
						width: 260,
						background: "#fff",
						border: "1px solid rgba(128,128,128,0.35)",
						borderRadius: 10,
						boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
						padding: "10px 12px",
						fontSize: 12,
						color: "#333",
						zIndex: 100,
						textAlign: "left"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								marginBottom: 8
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: t("cd.title") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									fontSize: 11,
									color: "#888"
								},
								children: t("cd.residentTokens")
							})]
						}),
						state.state === "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								color: "#ef4444",
								marginBottom: 6
							},
							children: [
								t("cd.error"),
								": ",
								state.error
							]
						}),
						report === null && state.state !== "loading" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: { color: "#888" },
							children: t("cd.empty")
						}),
						report !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
								label: t("cd.instructions"),
								value: `${formatK(report.injected.instructions.totalTokens)}t`
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
								label: t("cd.skills"),
								value: `${formatK(report.injected.skills.catalogDescriptionTokens)}t / ${t("cd.catalog", { n: report.injected.skills.catalogCount })}`
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
								label: t("cd.tools"),
								value: `${formatK(report.injected.tools.schemaTokens)}t`
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
								label: t("cd.mcp"),
								value: report.injected.tools.mcp.totalTools > 0 ? `${formatK(report.injected.tools.mcp.totalTokens)}t / ${t("cd.mcpTools", { n: report.injected.tools.mcp.totalTools })}` : "—"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									marginTop: 8,
									color: report.suggestions.length > 0 ? "#b45309" : "#16a34a"
								},
								children: report.suggestions.length > 0 ? t("cd.suggestions", { n: report.suggestions.length }) : "✓ healthy"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									marginTop: 4,
									maxHeight: 120,
									overflowY: "auto",
									color: "#666",
									lineHeight: 1.5
								},
								children: report.suggestions.slice(0, 4).map((s, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
									"· [",
									s.severity,
									"] ",
									s.text
								] }, i))
							})
						] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => refresh(),
							disabled: state.state === "loading",
							style: {
								marginTop: 8,
								background: "#f3f4f6",
								border: "1px solid #d1d5db",
								borderRadius: 6,
								padding: "3px 10px",
								fontSize: 11,
								cursor: "pointer",
								color: "#333"
							},
							children: t("cd.refresh")
						})
					]
				})]
			});
		}
		function Row({ label, value }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					justifyContent: "space-between",
					gap: 8,
					padding: "2px 0"
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: { color: "#666" },
					children: label
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: {
						fontWeight: 500,
						whiteSpace: "nowrap"
					},
					children: value
				})]
			});
		}
		//#endregion
		//#region src/client/index.ts
		/** 浏览器侧审计 API（与 host 路由对应）。 */
		const AUDIT_API = "/api/context-doctor/audit";
		/** Required services. */
		const inject = ["slots", "locale"];
		/** 当前 in-flight 请求的取消控制器：新请求先取消旧请求（避免乱序覆盖）。 */
		let currentController = null;
		/** Fetch the host audit report into the store. */
		function fetchReport(actions) {
			currentController?.abort();
			const controller = new AbortController();
			currentController = controller;
			actions?.setState("loading", null);
			fetch(AUDIT_API, { signal: controller.signal }).then((response) => {
				if (!response.ok) throw new Error(`audit ${response.status}`);
				return response.json();
			}).then((data) => {
				if (controller.signal.aborted) return;
				if (data.ok && data.report !== null && data.report !== void 0) actions?.setReport(data.report);
				else actions?.setState("error", "empty audit response");
			}, (error) => {
				if (controller.signal.aborted) return;
				actions?.setState("error", "audit transport error");
			});
		}
		/**
		* Client plugin body: register dictionaries, seed the store, and seat the
		* audit ring once its hole is on the ledger.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "context-doctor: dictionaries");
			const store = createAuditStore();
			let baked = null;
			const injected = (_sessionId, actions) => {
				baked = actions;
				return {
					ensure: () => fetchReport(baked),
					refresh: () => fetchReport(baked)
				};
			};
			ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register({
				name: "conversation.composer.dock",
				id: "context-doctor",
				order: 30,
				store,
				inject: injected,
				locale: NS
			}, ContextAuditRing));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map