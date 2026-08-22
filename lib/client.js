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
		* Context Doctor's composer control, seated in the input tool row through
		* `conversation.input.right` — a stock DSH slot, so the control appears on an
		* unmodified harness (issue #4).
		*
		* The panel is number-first: one composition bar shows where the resident
		* budget actually goes, and every category expands into the entries behind it
		* (files, skill sources, individual schemas, MCP servers). All copy comes from
		* the locale seat, so it follows the DSH shell's language.
		*/
		const AUDIT_API = "/api/context-doctor/audit";
		/** Budget the ring measures against; the audit itself is budget-agnostic. */
		const FULL_SCALE = 5e4;
		/** Entries listed before a breakdown collapses into a "+N more" line. */
		const DETAIL_LIMIT = 6;
		const TONE = {
			canvas: "var(--dsw-alias-bg-layer-1, #121826)",
			raised: "var(--dsw-alias-bg-layer-2, #171f2e)",
			row: "var(--dsw-alias-bg-layer-3, #1d2637)",
			border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
			borderStrong: "var(--dsw-alias-border-l3, rgba(196, 211, 232, 0.3))",
			text: "var(--dsw-alias-label-primary, #f2f6fc)",
			muted: "var(--dsw-alias-label-secondary, #9daabd)",
			quiet: "var(--dsw-alias-label-tertiary, #6f7c91)",
			mint: "var(--dsw-alias-state-success-primary, #46b97a)",
			amber: "var(--dsw-alias-state-warn-primary, #d99a1f)",
			red: "var(--dsw-alias-state-error-primary, #e2566a)",
			blue: "var(--dsw-alias-brand-primary, #4a7dff)",
			violet: "#8a6bd8"
		};
		const MONO = "ui-monospace, \"Cascadia Mono\", \"SFMono-Regular\", Consolas, monospace";
		function formatK(tokens) {
			if (tokens < 1e3) return String(tokens);
			const value = tokens / 1e3;
			if (value >= 100 || Number.isInteger(value)) return `${Math.round(value)}k`;
			return `${value.toFixed(1)}k`;
		}
		/** Trailing path segment; the full path stays in the row's `title`. */
		function baseName(path) {
			const parts = path.split(/[/\\]/).filter(Boolean);
			const last = parts.at(-1) ?? path;
			const parent = parts.at(-2);
			return parent === void 0 ? last : `${parent}/${last}`;
		}
		function healthLevel(tokens) {
			if (tokens < 1e4) return "mint";
			if (tokens < 3e4) return "amber";
			return "red";
		}
		/**
		* Build the four non-overlapping budget slices.
		*
		* MCP schema tokens are a subset of `tools.schemaTokens`, so the tool slice
		* carries `nativeTokens` only — otherwise the shares sum past 100%.
		*/
		function buildSegments(report, t) {
			const { instructions, skills, tools } = report.injected;
			const receipt = report.receipt;
			const schemaRows = (receipt?.toolSchemas.items ?? []).filter((item) => item.server === void 0).sort((a, b) => b.tokens - a.tokens).map((item) => ({
				name: item.name,
				tokens: item.tokens
			}));
			const mcpSchemaRows = (receipt?.toolSchemas.items ?? []).filter((item) => item.server !== void 0).sort((a, b) => b.tokens - a.tokens).map((item) => ({
				name: item.name,
				tokens: item.tokens
			}));
			return [
				{
					key: "instructions",
					label: t("cd.instructions"),
					sub: instructions.files.length === 0 ? t("cd.emptyCategory") : t("cd.instructions.sub", { n: instructions.files.length }),
					tokens: instructions.totalTokens,
					color: TONE.blue,
					detail: instructions.files.length === 0 ? null : {
						title: t("cd.byFile"),
						rows: instructions.files.map((file) => ({
							name: baseName(file.path),
							tokens: file.tokens
						})),
						...instructions.duplicateBlocks.length > 0 ? { note: t("cd.duplicateBlocks", {
							n: instructions.duplicateBlocks.length,
							tokens: instructions.duplicateBlocks.reduce((sum, block) => sum + block.tokens, 0)
						}) } : {}
					}
				},
				{
					key: "skills",
					label: t("cd.skills"),
					sub: skills.catalogCount === 0 ? t("cd.emptyCategory") : t("cd.skills.sub", { n: skills.catalogCount }),
					tokens: skills.catalogDescriptionTokens,
					color: TONE.violet,
					detail: skills.bySource.length === 0 ? null : {
						title: t("cd.bySource"),
						rows: [...skills.bySource].sort((a, b) => b.descriptionTokens - a.descriptionTokens).map((source) => ({
							name: `${source.source} · ${source.count}`,
							tokens: source.descriptionTokens
						})),
						...skills.duplicateDescriptions.length > 0 ? { note: t("cd.duplicateSkills", { n: skills.duplicateDescriptions.length }) } : report.conflicts.length > 0 ? { note: t("cd.shadowed", { n: report.conflicts.length }) } : {}
					}
				},
				{
					key: "tools",
					label: t("cd.tools"),
					sub: tools.nativeCount === 0 ? t("cd.emptyCategory") : t("cd.tools.sub", { n: tools.nativeCount }),
					tokens: tools.nativeTokens,
					color: TONE.amber,
					detail: schemaRows.length === 0 ? null : {
						title: t("cd.topSchemas"),
						rows: schemaRows
					}
				},
				{
					key: "mcp",
					label: t("cd.mcp"),
					sub: tools.mcp.totalTools === 0 ? t("cd.emptyCategory") : t("cd.mcp.sub", {
						n: tools.mcp.totalTools,
						servers: tools.mcp.servers.length
					}),
					tokens: tools.mcp.totalTokens,
					color: TONE.mint,
					detail: tools.mcp.servers.length === 0 ? null : {
						title: mcpSchemaRows.length > 0 ? t("cd.topSchemas") : t("cd.byServer"),
						rows: mcpSchemaRows.length > 0 ? mcpSchemaRows : [...tools.mcp.servers].sort((a, b) => b.schemaTokens - a.schemaTokens).map((server) => ({
							name: `${server.server} · ${server.tools}`,
							tokens: server.schemaTokens
						}))
					}
				}
			];
		}
		function PulseIcon({ size = 20 }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 24 24",
				fill: "none",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M3 12h4l2.05-5 3.62 10L15.2 12H21",
					stroke: "currentColor",
					strokeWidth: "1.8",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				})
			});
		}
		function ChevronIcon({ open }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				width: "12",
				height: "12",
				viewBox: "0 0 24 24",
				fill: "none",
				"aria-hidden": "true",
				style: {
					transform: open ? "rotate(90deg)" : "none",
					transition: "transform 120ms ease"
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "m9 5 7 7-7 7",
					stroke: "currentColor",
					strokeWidth: "2.2",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				})
			});
		}
		function RefreshIcon() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				width: "14",
				height: "14",
				viewBox: "0 0 24 24",
				fill: "none",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M20 11a8 8 0 0 0-14.98-3.8M4 5v4h4M4 13a8 8 0 0 0 14.98 3.8M20 19v-4h-4",
					stroke: "currentColor",
					strokeWidth: "1.9",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				})
			});
		}
		/** Resident control in the tool row, just before Send. */
		function ContextAuditRing(props) {
			const { useStore, actions, sessionId, t } = props;
			const state = useStore((snapshot) => snapshot);
			const [open, setOpen] = (0, react.useState)(false);
			const [expanded, setExpanded] = (0, react.useState)(null);
			const panelId = (0, react.useId)();
			const dockRef = (0, react.useRef)(null);
			const controllerRef = (0, react.useRef)(null);
			const refresh = (0, react.useCallback)(() => {
				controllerRef.current?.abort();
				const controller = new AbortController();
				controllerRef.current = controller;
				actions.setState("loading", null);
				const url = `${AUDIT_API}?session=${encodeURIComponent(sessionId)}&detail=developer`;
				fetch(url, { signal: controller.signal }).then((response) => {
					if (!response.ok) throw new Error(`audit ${response.status}`);
					return response.json();
				}).then((data) => {
					if (controller.signal.aborted) return;
					if (data.ok && data.report !== null && data.report !== void 0) actions.setReport(data.report);
					else actions.setState("error", "empty audit response");
				}, () => {
					if (!controller.signal.aborted) actions.setState("error", "audit transport error");
				});
			}, [actions, sessionId]);
			(0, react.useEffect)(() => {
				refresh();
				return () => controllerRef.current?.abort();
			}, [refresh]);
			(0, react.useEffect)(() => {
				if (!open) return void 0;
				const onKeyDown = (event) => {
					if (event.key === "Escape") setOpen(false);
				};
				const onPointerDown = (event) => {
					const dock = dockRef.current;
					if (dock !== null && event.target instanceof Node && !dock.contains(event.target)) setOpen(false);
				};
				document.addEventListener("keydown", onKeyDown);
				document.addEventListener("pointerdown", onPointerDown, true);
				return () => {
					document.removeEventListener("keydown", onKeyDown);
					document.removeEventListener("pointerdown", onPointerDown, true);
				};
			}, [open]);
			const report = state.report;
			const segments = (0, react.useMemo)(() => report === null ? [] : buildSegments(report, t), [report, t]);
			const resident = segments.reduce((sum, segment) => sum + segment.tokens, 0);
			const percent = Math.min(resident / FULL_SCALE, 1);
			const level = state.state === "error" ? "red" : healthLevel(resident);
			const accent = TONE[level];
			const suggestions = report?.suggestions ?? [];
			const status = state.state === "error" ? t("cd.error") : level === "red" ? t("cd.heavy") : suggestions.length > 0 ? t("cd.review") : t("cd.healthy");
			const statusHint = level === "red" ? t("cd.heavyHint") : suggestions.length > 0 ? t("cd.reviewHint") : t("cd.healthyHint");
			const updated = state.refreshedAt === null ? "—" : (() => {
				const seconds = Math.max(0, Math.round((Date.now() - state.refreshedAt) / 1e3));
				if (seconds < 10) return t("cd.justNow");
				if (seconds < 60) return t("cd.secondsAgo", { n: seconds });
				return t("cd.minutesAgo", { n: Math.round(seconds / 60) });
			})();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				ref: dockRef,
				"data-context-doctor": true,
				style: dockStyle,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => setOpen((value) => !value),
					title: t("cd.hint"),
					"aria-label": t("cd.title"),
					"aria-expanded": open,
					"aria-controls": panelId,
					style: triggerStyle,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								color: accent,
								display: "inline-flex"
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PulseIcon, { size: 15 })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: triggerLabelStyle,
							children: t("cd.title")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							"aria-hidden": "true",
							style: {
								...triggerDotStyle,
								background: accent
							}
						})
					]
				}), open && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					id: panelId,
					role: "dialog",
					"aria-label": t("cd.title"),
					style: panelStyle,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
							style: headerStyle,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										color: accent,
										display: "inline-flex"
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PulseIcon, { size: 17 })
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: { minWidth: 0 },
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
										style: titleStyle,
										children: t("cd.title")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										style: subtitleStyle,
										children: t("cd.subtitle")
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										...statusPillStyle,
										color: accent,
										borderColor: accent
									},
									children: status
								})
							]
						}),
						state.state === "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
							style: errorStyle,
							children: [
								t("cd.error"),
								": ",
								state.error
							]
						}),
						report === null && state.state !== "error" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: emptyStyle,
							children: state.state === "loading" ? t("cd.loading") : t("cd.emptyState")
						}) : report !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: summaryStyle,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: summaryHeadStyle,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												display: "flex",
												alignItems: "baseline",
												gap: 7,
												minWidth: 0
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
												style: totalStyle,
												children: formatK(resident)
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: totalUnitStyle,
												children: t("cd.tokens")
											})]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											style: budgetStyle,
											children: [
												Math.round(percent * 100),
												"% · ",
												t("cd.ofBudget", { budget: formatK(FULL_SCALE) })
											]
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: barTrackStyle,
										"aria-hidden": "true",
										children: resident > 0 && segments.filter((segment) => segment.tokens > 0).map((segment) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
											width: `${segment.tokens / resident * 100}%`,
											background: segment.color,
											height: "100%"
										} }, segment.key))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: totalCaptionStyle,
										children: t("cd.total")
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
								style: listStyle,
								children: segments.map((segment) => {
									const share = resident === 0 ? 0 : segment.tokens / resident;
									const isOpen = expanded === segment.key;
									const canExpand = segment.detail !== null;
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
										style: listItemStyle,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											disabled: !canExpand,
											onClick: () => setExpanded((current) => current === segment.key ? null : segment.key),
											"aria-expanded": isOpen,
											title: canExpand ? isOpen ? t("cd.collapse") : t("cd.expand") : t("cd.noDetail"),
											style: {
												...rowStyle,
												cursor: canExpand ? "pointer" : "default",
												opacity: canExpand ? 1 : .62
											},
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													style: {
														...chevronStyle,
														color: canExpand ? TONE.quiet : "transparent"
													},
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChevronIcon, { open: isOpen })
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													"aria-hidden": "true",
													style: {
														...swatchStyle,
														background: segment.color
													}
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													style: { minWidth: 0 },
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														style: rowLabelStyle,
														children: segment.label
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														style: rowSubStyle,
														children: segment.sub
													})]
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													style: rowTokensStyle,
													children: formatK(segment.tokens)
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													style: rowShareStyle,
													children: [Math.round(share * 100), "%"]
												})
											]
										}), isOpen && segment.detail !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: detailStyle,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													style: detailTitleStyle,
													children: segment.detail.title
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", {
													style: detailListStyle,
													children: segment.detail.rows.slice(0, DETAIL_LIMIT).map((row) => {
														const rowShare = segment.tokens === 0 ? 0 : row.tokens / segment.tokens;
														return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
															style: detailRowStyle,
															title: row.name,
															children: [
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	style: detailNameStyle,
																	children: row.name
																}),
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	style: detailBarStyle,
																	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
																		display: "block",
																		width: `${Math.max(rowShare * 100, 2)}%`,
																		height: "100%",
																		background: segment.color,
																		borderRadius: 2
																	} })
																}),
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	style: detailTokensStyle,
																	children: formatK(row.tokens)
																})
															]
														}, row.name);
													})
												}),
												segment.detail.rows.length > DETAIL_LIMIT && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													style: detailMoreStyle,
													children: t("cd.more", { n: segment.detail.rows.length - DETAIL_LIMIT })
												}),
												segment.detail.note !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													style: detailNoteStyle,
													children: segment.detail.note
												})
											]
										})]
									}, segment.key);
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: healthStyle,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
										style: {
											...healthTitleStyle,
											color: accent
										},
										children: status
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										style: healthCopyStyle,
										children: statusHint
									}),
									suggestions.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", {
										style: suggestionListStyle,
										children: suggestions.slice(0, 3).map((suggestion) => {
											const tone = suggestion.severity === "high" ? TONE.red : suggestion.severity === "medium" ? TONE.amber : TONE.mint;
											return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
												style: suggestionStyle,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													"aria-hidden": "true",
													style: {
														...suggestionDotStyle,
														background: tone
													}
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													style: suggestionCopyStyle,
													children: suggestion.text
												})]
											}, suggestion.text);
										})
									})
								]
							})
						] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
							style: footerStyle,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: updatedStyle,
								children: t("cd.updated", { when: updated })
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: refresh,
								disabled: state.state === "loading",
								style: refreshStyle,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RefreshIcon, {}), t("cd.refresh")]
							})]
						})
					]
				})]
			});
		}
		const dockStyle = {
			display: "inline-flex",
			alignItems: "center",
			position: "relative",
			fontFamily: MONO
		};
		const triggerStyle = {
			display: "inline-flex",
			alignItems: "center",
			gap: 6,
			minHeight: 31,
			padding: "4px 9px",
			color: TONE.text,
			background: TONE.raised,
			border: `1px solid ${TONE.border}`,
			borderRadius: 7,
			cursor: "pointer",
			fontFamily: MONO,
			fontWeight: 430
		};
		const triggerLabelStyle = {
			color: TONE.text,
			fontSize: 12,
			fontWeight: 430,
			whiteSpace: "nowrap"
		};
		const triggerDotStyle = {
			width: 7,
			height: 7,
			marginLeft: 1,
			borderRadius: 99
		};
		const panelStyle = {
			position: "absolute",
			zIndex: 1e3,
			right: 0,
			bottom: "calc(100% + 12px)",
			width: 428,
			maxWidth: "calc(100vw - 24px)",
			maxHeight: "min(70vh, 620px)",
			overflowX: "hidden",
			overflowY: "auto",
			color: TONE.text,
			background: TONE.canvas,
			border: `1px solid ${TONE.borderStrong}`,
			borderRadius: 12,
			boxShadow: "0 18px 44px rgba(3, 8, 18, 0.34)",
			textAlign: "left",
			fontFamily: MONO,
			fontWeight: 400
		};
		const headerStyle = {
			display: "grid",
			gridTemplateColumns: "20px minmax(0, 1fr) auto",
			alignItems: "center",
			columnGap: 10,
			padding: "14px 16px 13px",
			borderBottom: `1px solid ${TONE.border}`
		};
		const titleStyle = {
			margin: 0,
			color: TONE.text,
			fontFamily: MONO,
			fontSize: 14,
			fontWeight: 480,
			letterSpacing: "-0.01em",
			lineHeight: 1.2
		};
		const subtitleStyle = {
			margin: "3px 0 0",
			color: TONE.muted,
			fontFamily: MONO,
			fontSize: 11.5,
			fontWeight: 400,
			lineHeight: 1.2
		};
		const statusPillStyle = {
			padding: "3px 9px",
			border: "1px solid",
			borderRadius: 99,
			fontSize: 11,
			fontWeight: 460,
			whiteSpace: "nowrap"
		};
		const errorStyle = {
			margin: "12px 16px 0",
			color: TONE.red,
			fontSize: 12,
			lineHeight: 1.45
		};
		const emptyStyle = {
			margin: 0,
			padding: "34px 16px",
			color: TONE.muted,
			fontSize: 12.5,
			textAlign: "center"
		};
		const summaryStyle = {
			padding: "15px 16px 14px",
			borderBottom: `1px solid ${TONE.border}`
		};
		const summaryHeadStyle = {
			display: "flex",
			alignItems: "baseline",
			justifyContent: "space-between",
			gap: 12
		};
		const totalStyle = {
			color: TONE.text,
			fontSize: 27,
			fontWeight: 460,
			lineHeight: 1,
			letterSpacing: "-0.035em",
			fontVariantNumeric: "tabular-nums"
		};
		const totalUnitStyle = {
			color: TONE.muted,
			fontSize: 12,
			fontWeight: 400
		};
		const budgetStyle = {
			color: TONE.muted,
			fontSize: 11.5,
			fontWeight: 400,
			fontVariantNumeric: "tabular-nums",
			whiteSpace: "nowrap"
		};
		const barTrackStyle = {
			display: "flex",
			gap: 2,
			height: 7,
			margin: "12px 0 0",
			overflow: "hidden",
			background: TONE.row,
			borderRadius: 99
		};
		const totalCaptionStyle = {
			display: "block",
			marginTop: 9,
			color: TONE.quiet,
			fontSize: 11,
			fontWeight: 400
		};
		const listStyle = {
			margin: 0,
			padding: "5px 8px 7px",
			listStyle: "none",
			borderBottom: `1px solid ${TONE.border}`
		};
		const listItemStyle = { listStyle: "none" };
		const rowStyle = {
			display: "grid",
			width: "100%",
			gridTemplateColumns: "16px 9px minmax(0, 1fr) auto 38px",
			alignItems: "center",
			columnGap: 9,
			padding: "9px 8px",
			color: TONE.text,
			background: "transparent",
			border: 0,
			borderRadius: 7,
			textAlign: "left",
			fontFamily: MONO
		};
		const chevronStyle = {
			display: "inline-flex",
			justifyContent: "center"
		};
		const swatchStyle = {
			width: 9,
			height: 9,
			borderRadius: 3
		};
		const rowLabelStyle = {
			display: "block",
			overflow: "hidden",
			color: TONE.text,
			fontSize: 12.5,
			fontWeight: 440,
			textOverflow: "ellipsis",
			whiteSpace: "nowrap"
		};
		const rowSubStyle = {
			display: "block",
			marginTop: 2,
			overflow: "hidden",
			color: TONE.quiet,
			fontSize: 11,
			fontWeight: 400,
			textOverflow: "ellipsis",
			whiteSpace: "nowrap"
		};
		const rowTokensStyle = {
			color: TONE.text,
			fontSize: 12.5,
			fontWeight: 440,
			fontVariantNumeric: "tabular-nums",
			whiteSpace: "nowrap"
		};
		const rowShareStyle = {
			color: TONE.muted,
			fontSize: 12,
			fontWeight: 430,
			fontVariantNumeric: "tabular-nums",
			textAlign: "right"
		};
		const detailStyle = {
			display: "flex",
			flexDirection: "column",
			gap: 7,
			margin: "0 8px 9px 33px",
			padding: "10px 11px",
			background: TONE.row,
			borderRadius: 8
		};
		const detailTitleStyle = {
			color: TONE.quiet,
			fontSize: 10.5,
			fontWeight: 460
		};
		const detailListStyle = {
			display: "flex",
			flexDirection: "column",
			gap: 6,
			margin: 0,
			padding: 0,
			listStyle: "none"
		};
		const detailRowStyle = {
			display: "grid",
			gridTemplateColumns: "minmax(0, 1fr) 54px 42px",
			alignItems: "center",
			columnGap: 9
		};
		const detailNameStyle = {
			overflow: "hidden",
			color: TONE.muted,
			fontSize: 11.5,
			fontWeight: 400,
			textOverflow: "ellipsis",
			whiteSpace: "nowrap"
		};
		const detailBarStyle = {
			height: 4,
			background: TONE.borderStrong,
			borderRadius: 2,
			overflow: "hidden"
		};
		const detailTokensStyle = {
			color: TONE.text,
			fontSize: 11.5,
			fontWeight: 430,
			fontVariantNumeric: "tabular-nums",
			textAlign: "right"
		};
		const detailMoreStyle = {
			color: TONE.quiet,
			fontSize: 11,
			fontWeight: 400
		};
		const detailNoteStyle = {
			marginTop: 1,
			color: TONE.amber,
			fontSize: 11,
			fontWeight: 400,
			lineHeight: 1.4
		};
		const healthStyle = {
			padding: "13px 16px 14px",
			borderBottom: `1px solid ${TONE.border}`
		};
		const healthTitleStyle = {
			display: "block",
			fontSize: 12.5,
			fontWeight: 470
		};
		const healthCopyStyle = {
			margin: "5px 0 0",
			color: TONE.muted,
			fontSize: 11.5,
			fontWeight: 400,
			lineHeight: 1.5
		};
		const suggestionListStyle = {
			display: "flex",
			flexDirection: "column",
			gap: 6,
			margin: "11px 0 0",
			padding: 0,
			listStyle: "none"
		};
		const suggestionStyle = {
			display: "grid",
			gridTemplateColumns: "7px minmax(0, 1fr)",
			alignItems: "start",
			columnGap: 9
		};
		const suggestionDotStyle = {
			width: 6,
			height: 6,
			marginTop: 5,
			borderRadius: 99
		};
		const suggestionCopyStyle = {
			color: TONE.muted,
			fontSize: 11.5,
			fontWeight: 400,
			lineHeight: 1.45
		};
		const footerStyle = {
			display: "flex",
			alignItems: "center",
			justifyContent: "space-between",
			gap: 12,
			padding: "11px 16px 12px"
		};
		const updatedStyle = {
			color: TONE.quiet,
			fontSize: 11,
			fontWeight: 400,
			fontVariantNumeric: "tabular-nums"
		};
		const refreshStyle = {
			display: "inline-flex",
			alignItems: "center",
			gap: 6,
			padding: 0,
			color: TONE.blue,
			background: "transparent",
			border: 0,
			cursor: "pointer",
			fontFamily: MONO,
			fontSize: 12,
			fontWeight: 440
		};
		//#endregion
		//#region src/client/locales.ts
		/**
		* Context Doctor locale dictionaries.
		*
		* The panel follows the DSH shell's language: `ctx.locale.register` seats both
		* dictionaries and the host picks by its current setting, so every key here
		* must exist in both. Product and protocol nouns stay untranslated on purpose
		* — `token`, `schema`, `MCP`, `Context Doctor` read the same to a
		* Chinese-speaking developer and only drift once localized.
		*/
		const NS = "context-doctor";
		/** English dictionary; the key set every other dictionary mirrors. */
		const en = {
			"cd.title": "Context Doctor",
			"cd.subtitle": "Resident context audit",
			"cd.hint": "Open Context Doctor",
			"cd.total": "Resident total",
			"cd.tokens": "tokens",
			"cd.ofBudget": "of {budget} budget",
			"cd.instructions": "Instruction chain",
			"cd.skills": "Skills catalog",
			"cd.tools": "Tool schemas",
			"cd.mcp": "MCP tools",
			"cd.instructions.sub": "{n} files",
			"cd.skills.sub": "{n} skills",
			"cd.tools.sub": "{n} built-in tools",
			"cd.mcp.sub": "{n} tools · {servers} servers",
			"cd.emptyCategory": "nothing injected",
			"cd.expand": "Show breakdown",
			"cd.collapse": "Hide breakdown",
			"cd.byFile": "By file",
			"cd.bySource": "By source",
			"cd.byServer": "By server",
			"cd.topSchemas": "Largest schemas",
			"cd.native": "Built-in tools",
			"cd.duplicateBlocks": "{n} duplicated blocks · {tokens} tokens",
			"cd.duplicateSkills": "{n} skills share an identical description",
			"cd.shadowed": "{n} skills shadowed by a same-name entry",
			"cd.more": "+{n} more",
			"cd.noDetail": "No breakdown available",
			"cd.healthy": "Healthy",
			"cd.review": "Worth a look",
			"cd.heavy": "Over budget",
			"cd.healthyHint": "Resident context is lean and well inside the budget.",
			"cd.reviewHint": "A few injections are worth trimming before they get expensive.",
			"cd.heavyHint": "Resident context is crowding the budget. Trim the largest entries first.",
			"cd.suggestions": "Suggestions",
			"cd.loading": "Auditing…",
			"cd.error": "Audit failed",
			"cd.emptyState": "No audit data yet.",
			"cd.refresh": "Refresh",
			"cd.updated": "Updated {when}",
			"cd.justNow": "just now",
			"cd.secondsAgo": "{n}s ago",
			"cd.minutesAgo": "{n}m ago"
		};
		/** Simplified Chinese dictionary; mirrors {@link en} key for key. */
		const zh = {
			"cd.title": "Context Doctor",
			"cd.subtitle": "常驻上下文审计",
			"cd.hint": "打开 Context Doctor",
			"cd.total": "常驻合计",
			"cd.tokens": "token",
			"cd.ofBudget": "预算 {budget}",
			"cd.instructions": "指令链",
			"cd.skills": "技能目录",
			"cd.tools": "工具 schema",
			"cd.mcp": "MCP 工具",
			"cd.instructions.sub": "{n} 个文件",
			"cd.skills.sub": "{n} 个技能",
			"cd.tools.sub": "{n} 个内置工具",
			"cd.mcp.sub": "{n} 个工具 · {servers} 个服务器",
			"cd.emptyCategory": "无注入",
			"cd.expand": "展开明细",
			"cd.collapse": "收起明细",
			"cd.byFile": "按文件",
			"cd.bySource": "按来源",
			"cd.byServer": "按服务器",
			"cd.topSchemas": "占用最大的 schema",
			"cd.native": "内置工具",
			"cd.duplicateBlocks": "{n} 处重复段落 · {tokens} token",
			"cd.duplicateSkills": "{n} 个技能描述完全相同",
			"cd.shadowed": "{n} 个技能被同名条目遮蔽",
			"cd.more": "还有 {n} 项",
			"cd.noDetail": "暂无明细",
			"cd.healthy": "健康",
			"cd.review": "建议查看",
			"cd.heavy": "超出预算",
			"cd.healthyHint": "常驻上下文很精简，距预算还有充足余量。",
			"cd.reviewHint": "有几项注入值得趁早裁剪，免得越滚越大。",
			"cd.heavyHint": "常驻上下文已挤占预算，优先裁掉占用最大的几项。",
			"cd.suggestions": "裁剪建议",
			"cd.loading": "审计中…",
			"cd.error": "审计失败",
			"cd.emptyState": "还没有审计数据。",
			"cd.refresh": "刷新",
			"cd.updated": "更新于 {when}",
			"cd.justNow": "刚刚",
			"cd.secondsAgo": "{n} 秒前",
			"cd.minutesAgo": "{n} 分钟前"
		};
		//#endregion
		//#region src/client/index.ts
		/** Required services. */
		const inject = ["slots", "locale"];
		/**
		* Client plugin body: register dictionaries, seed the store, and seat the
		* audit control once the input tool row is on the ledger.
		*
		* The seat is `conversation.input.right` — the stock DSH slot for "a control
		* the user reaches on the way to sending", at the right end of the tool row
		* before Send. An earlier build targeted `conversation.input.context`, which
		* no released DSH ever shipped (it only existed in a local harness patch), so
		* the control was silently dropped on every unmodified install (issue #4).
		* `.right` is `kind: 'list'`, so seating here displaces nothing — the built-in
		* context meter keeps its place alongside.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "context-doctor: dictionaries");
			const store = createAuditStore();
			ctx.slots.inject("conversation.input.right", () => ctx.slots.register({
				name: "conversation.input.right",
				id: "context-doctor",
				order: 20,
				store,
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