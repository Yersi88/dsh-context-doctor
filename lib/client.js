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
		//#region src/client/ContextAuditRing.tsx
		/**
		* Context Doctor 圆环 + 展开面板（挂在 conversation.composer.dock）。
		* 圆环显示"常驻注入"估算 token（指令链 + 技能 catalog + 工具 schema），
		* 颜色按严重度分级；点击展开分项明细与建议数。数据经同源
		* `/api/context-doctor/audit` 拉取（带当前会话 id，审计落在会话工作区）。
		* @module dsh-context-doctor/client/ContextAuditRing
		*/
		/** 常驻注入的"满量程"基准（token）：超过即视为接近爆满。 */
		const FULL_SCALE = 5e4;
		/** 严重度色阶（resident token）：绿=健康，黄=偏高，红=膨胀。 */
		const HEALTH = {
			green: "#22c55e",
			yellow: "#eab308",
			red: "#ef4444"
		};
		function colorOf(tokens) {
			if (tokens < 1e4) return HEALTH.green;
			if (tokens < 3e4) return HEALTH.yellow;
			return HEALTH.red;
		}
		/** 严重度对应的强调色（建议列表左侧条）。 */
		function severityColor(severity) {
			switch (severity) {
				case "high": return HEALTH.red;
				case "medium": return HEALTH.yellow;
				default: return "#60a5fa";
			}
		}
		/** 格式化为 k 单位（保留 1 位，≥100k 取整）。 */
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
			const color = state.state === "error" ? HEALTH.red : colorOf(resident);
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
						gap: 5,
						borderRadius: 8,
						transition: "background 120ms ease"
					},
					onMouseEnter: (e) => {
						e.currentTarget.style.background = "rgba(128,128,128,0.12)";
					},
					onMouseLeave: (e) => {
						e.currentTarget.style.background = "none";
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
							stroke: "rgba(128,128,128,0.25)",
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
							fontWeight: 600,
							color: state.state === "error" ? HEALTH.red : "#666",
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
						bottom: "calc(100% + 8px)",
						width: 292,
						background: "#fff",
						border: "1px solid rgba(0,0,0,0.08)",
						borderRadius: 12,
						boxShadow: "0 12px 32px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.06)",
						padding: "14px 14px 12px",
						fontSize: 12,
						color: "#1f2328",
						zIndex: 100,
						textAlign: "left"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								alignItems: "baseline",
								justifyContent: "space-between",
								marginBottom: 10
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
								style: { fontSize: 13 },
								children: t("cd.title")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									fontSize: 11,
									color: "#8b949e"
								},
								children: t("cd.residentTokens")
							})]
						}),
						state.state === "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								color: HEALTH.red,
								marginBottom: 8,
								lineHeight: 1.5
							},
							children: [
								t("cd.error"),
								": ",
								state.error
							]
						}),
						report === null && state.state !== "loading" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								color: "#8b949e",
								padding: "8px 0"
							},
							children: t("cd.empty")
						}),
						report !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: 10,
									marginBottom: 10
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
									width: 44,
									height: 44,
									viewBox: "0 0 24 24",
									role: "img",
									"aria-hidden": "true",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
										cx: 12,
										cy: 12,
										r: radius,
										fill: "none",
										stroke: "rgba(128,128,128,0.2)",
										strokeWidth: 2
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
										cx: 12,
										cy: 12,
										r: radius,
										fill: "none",
										stroke: color,
										strokeWidth: 2,
										strokeLinecap: "round",
										strokeDasharray: `${percent * circumference} ${circumference}`,
										transform: "rotate(-90 12 12)"
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: { lineHeight: 1.2 },
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											fontSize: 18,
											fontWeight: 700,
											color
										},
										children: [formatK(resident), "t"]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: {
											fontSize: 11,
											color: "#8b949e"
										},
										children: t("cd.residentTokens")
									})]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									borderTop: "1px solid rgba(0,0,0,0.06)",
									paddingTop: 8
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
										dot: HEALTH.green,
										label: t("cd.instructions"),
										value: `${formatK(report.injected.instructions.totalTokens)}t`,
										sub: report.injected.instructions.files.length > 0 ? `${report.injected.instructions.files.length} ${t("cd.files")}` : void 0
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
										dot: HEALTH.green,
										label: t("cd.skills"),
										value: `${formatK(report.injected.skills.catalogDescriptionTokens)}t`,
										sub: report.injected.skills.catalogCount > 0 ? t("cd.catalog", { n: report.injected.skills.catalogCount }) : void 0
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
										dot: HEALTH.green,
										label: t("cd.tools"),
										value: `${formatK(report.injected.tools.schemaTokens)}t`,
										sub: report.injected.tools.visibleCount > 0 ? `${report.injected.tools.visibleCount} ${t("cd.toolsCount")}` : void 0
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
										dot: HEALTH.yellow,
										label: t("cd.mcp"),
										value: report.injected.tools.mcp.totalTools > 0 ? `${formatK(report.injected.tools.mcp.totalTokens)}t` : "—",
										sub: report.injected.tools.mcp.totalTools > 0 ? t("cd.mcpTools", { n: report.injected.tools.mcp.totalTools }) : void 0
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									marginTop: 10,
									padding: "6px 10px",
									borderRadius: 8,
									background: report.suggestions.length > 0 ? "rgba(234,179,8,0.12)" : "rgba(34,197,94,0.10)",
									color: report.suggestions.length > 0 ? "#92400e" : "#15803d",
									fontSize: 11,
									fontWeight: 600
								},
								children: report.suggestions.length > 0 ? t("cd.suggestions", { n: report.suggestions.length }) : "✓ " + t("cd.healthy")
							}),
							report.suggestions.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									marginTop: 6,
									maxHeight: 96,
									overflowY: "auto"
								},
								children: report.suggestions.slice(0, 4).map((s, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										display: "flex",
										gap: 6,
										padding: "3px 0",
										color: "#4b5563",
										lineHeight: 1.5,
										alignItems: "flex-start"
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
										flexShrink: 0,
										width: 3,
										height: "auto",
										alignSelf: "stretch",
										borderRadius: 2,
										background: severityColor(s.severity),
										marginTop: 4
									} }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: s.text })]
								}, i))
							})
						] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								marginTop: 10
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									fontSize: 10,
									color: "#9ca3af"
								},
								children: t("cd.hint")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => refresh(),
								disabled: state.state === "loading",
								style: {
									background: "#f3f4f6",
									border: "1px solid #e5e7eb",
									borderRadius: 6,
									padding: "3px 10px",
									fontSize: 11,
									cursor: "pointer",
									color: "#374151"
								},
								children: t("cd.refresh")
							})]
						})
					]
				})]
			});
		}
		function Row({ dot, label, value, sub }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					alignItems: "center",
					gap: 6,
					padding: "3px 0"
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
						flexShrink: 0,
						width: 6,
						height: 6,
						borderRadius: 3,
						background: dot
					} }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							flex: 1,
							color: "#57606a"
						},
						children: label
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							fontWeight: 600,
							whiteSpace: "nowrap"
						},
						children: value
					}),
					sub !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							fontSize: 10,
							color: "#9ca3af",
							whiteSpace: "nowrap"
						},
						children: sub
					})
				]
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
			"cd.suggestions": "建议 {n} 条",
			"cd.refresh": "刷新",
			"cd.loading": "审计中…",
			"cd.error": "审计失败",
			"cd.empty": "暂无数据",
			"cd.healthy": "健康",
			"cd.catalog": "{n} 技能",
			"cd.mcpTools": "{n} 工具",
			"cd.files": "文件",
			"cd.toolsCount": "工具",
			"cd.hint": "点击圆环切换面板"
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
			"cd.healthy": "healthy",
			"cd.catalog": "{n} skills",
			"cd.mcpTools": "{n} tools",
			"cd.files": "files",
			"cd.toolsCount": "tools",
			"cd.hint": "Click ring to toggle"
		};
		//#endregion
		//#region src/client/index.ts
		/** 浏览器侧审计 API（与 host 路由对应）。 */
		const AUDIT_API = "/api/context-doctor/audit";
		/** Required services. */
		const inject = ["slots", "locale"];
		/** 当前 in-flight 请求的取消控制器：新请求先取消旧请求（避免乱序覆盖）。 */
		let currentController = null;
		/** Fetch the host audit report into the store（带会话 id，host 侧据此解析会话 cwd）。 */
		function fetchReport(actions, sessionId) {
			currentController?.abort();
			const controller = new AbortController();
			currentController = controller;
			actions?.setState("loading", null);
			const url = sessionId !== null ? `${AUDIT_API}?session=${encodeURIComponent(sessionId)}` : AUDIT_API;
			fetch(url, { signal: controller.signal }).then((response) => {
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
			let currentSessionId = null;
			const injected = (sessionId, actions) => {
				baked = actions;
				currentSessionId = sessionId;
				return {
					ensure: () => fetchReport(baked, currentSessionId),
					refresh: () => fetchReport(baked, currentSessionId)
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