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
		* Context Doctor budget control and audit popover for the conversation dock.
		* @module dsh-context-doctor/client/ContextAuditRing
		*/
		/** Resident-injection guideline used to size the circular gauge. */
		const FULL_SCALE = 5e4;
		const TONE = {
			canvas: "var(--dsw-alias-bg-layer-2, #101722)",
			surface: "var(--dsw-alias-bg-layer-1, #171f2b)",
			surfaceRaised: "var(--dsw-alias-bg-layer-3, #1d2735)",
			border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
			borderStrong: "var(--dsw-alias-border-l3, rgba(196, 211, 232, 0.26))",
			text: "var(--dsw-alias-label-primary, #f2f6fc)",
			muted: "var(--dsw-alias-label-secondary, #9daabd)",
			quiet: "var(--dsw-alias-label-tertiary, #718096)",
			mint: "var(--dsw-alias-state-success-primary, #7ce0aa)",
			mintSoft: "var(--dsw-alias-state-success-tertiary, rgba(124, 224, 170, 0.13))",
			amber: "var(--dsw-alias-state-warn-primary, #f7c75d)",
			amberSoft: "var(--dsw-alias-state-warn-tertiary, rgba(247, 199, 93, 0.13))",
			red: "var(--dsw-alias-state-error-primary, #ff8592)",
			redSoft: "var(--dsw-alias-state-error-secondary, rgba(255, 133, 146, 0.13))",
			blue: "var(--dsw-alias-brand-primary, #8ec5ff)"
		};
		function healthTone(tokens) {
			if (tokens < 1e4) return "mint";
			if (tokens < 3e4) return "amber";
			return "red";
		}
		function severityColor(severity) {
			if (severity === "high") return TONE.red;
			if (severity === "medium") return TONE.amber;
			return TONE.blue;
		}
		function softTone(tone) {
			if (tone === "mint") return TONE.mintSoft;
			if (tone === "amber") return TONE.amberSoft;
			return TONE.redSoft;
		}
		/** Format tokens for the compact dock and detail panel. */
		function formatK(tokens) {
			if (tokens < 1e3) return String(tokens);
			const thousands = tokens / 1e3;
			return `${thousands >= 100 ? Math.round(thousands) : thousands.toFixed(1)}k`;
		}
		function updatedLabel(refreshedAt) {
			if (refreshedAt === null) return "—";
			const seconds = Math.max(0, Math.round((Date.now() - refreshedAt) / 1e3));
			if (seconds < 10) return "just now";
			if (seconds < 60) return `${seconds}s ago`;
			return `${Math.round(seconds / 60)}m ago`;
		}
		/** Small product glyph used in the dock trigger and popover title. */
		function PulseIcon({ size = 18, color = "currentColor" }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 24 24",
				fill: "none",
				"aria-hidden": "true",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M3 12h4l2.05-5 3.62 10L15.2 12H21",
					stroke: color,
					strokeWidth: "1.9",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M3.6 6.8C5.1 4.86 8.06 4.4 10.06 6l1.94 1.58L13.94 6c2-1.6 4.96-1.14 6.46.8 1.72 2.23 1.43 5.42-.66 7.29L12 21 4.26 14.09C2.17 12.22 1.88 9.03 3.6 6.8Z",
					stroke: color,
					strokeWidth: "1.45",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				})]
			});
		}
		function RefreshIcon() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				width: "15",
				height: "15",
				viewBox: "0 0 24 24",
				fill: "none",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M20 11a8 8 0 0 0-14.98-3.8M4 5v4h4M4 13a8 8 0 0 0 14.98 3.8M20 19v-4h-4",
					stroke: "currentColor",
					strokeWidth: "1.8",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				})
			});
		}
		/** Circular visual that always leaves a small gap, even at full scale. */
		function BudgetRing({ percent, color, size = 84 }) {
			const radius = 39;
			const circumference = 2 * Math.PI * radius;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 96 96",
				"aria-hidden": "true",
				style: {
					display: "block",
					transform: "rotate(-90deg)"
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
					cx: "48",
					cy: "48",
					r: radius,
					fill: "none",
					stroke: "rgba(219, 231, 247, 0.13)",
					strokeWidth: "8"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
					cx: "48",
					cy: "48",
					r: radius,
					fill: "none",
					stroke: color,
					strokeWidth: "8",
					strokeLinecap: "round",
					strokeDasharray: `${Math.max(.035, Math.min(.965, percent)) * circumference} ${circumference}`
				})]
			});
		}
		/** Dock entry: resident-token gauge plus a detailed, keyboard-dismissable popover. */
		function ContextAuditRing(props) {
			const { useStore, ensure, refresh, t } = props;
			const state = useStore((snapshot) => snapshot);
			const [open, setOpen] = (0, react.useState)(false);
			const panelId = (0, react.useId)();
			(0, react.useEffect)(() => {
				ensure();
			}, [ensure]);
			(0, react.useEffect)(() => {
				if (!open) return void 0;
				const onKeyDown = (event) => {
					if (event.key === "Escape") setOpen(false);
				};
				document.addEventListener("keydown", onKeyDown);
				return () => document.removeEventListener("keydown", onKeyDown);
			}, [open]);
			const report = state.report;
			const instructions = report?.injected.instructions.totalTokens ?? 0;
			const skills = report?.injected.skills.catalogDescriptionTokens ?? 0;
			const schemas = report?.injected.tools.schemaTokens ?? 0;
			const resident = instructions + skills + schemas;
			const percent = resident / FULL_SCALE;
			const tone = state.state === "error" ? "red" : healthTone(resident);
			const accent = TONE[tone];
			const suggestions = report?.suggestions ?? [];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				"data-context-doctor": true,
				style: dockStyle,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => setOpen((visible) => !visible),
					title: t("cd.title"),
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
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PulseIcon, { size: 17 })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: triggerMetricStyle,
							children: state.state === "loading" ? t("cd.loading") : state.state === "error" ? "!" : report === null ? t("cd.empty") : `${formatK(resident)}t`
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							"aria-hidden": "true",
							style: {
								...triggerStatusStyle,
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
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: 9
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										width: 30,
										height: 30,
										borderRadius: 9,
										display: "grid",
										placeItems: "center",
										color: TONE.mint,
										background: TONE.mintSoft
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PulseIcon, {})
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
									style: titleStyle,
									children: t("cd.title")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									style: subtitleStyle,
									children: t("cd.residentTokens")
								})] })]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								style: {
									...statusChipStyle,
									color: accent,
									background: softTone(tone),
									borderColor: TONE.border
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									"aria-hidden": "true",
									style: {
										width: 5,
										height: 5,
										borderRadius: 99,
										background: accent
									}
								}), state.state === "error" ? t("cd.error") : suggestions.length > 0 ? t("cd.attention") : t("cd.healthy")]
							})]
						}),
						state.state === "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								...noticeStyle,
								color: TONE.red,
								background: TONE.redSoft
							},
							children: [
								t("cd.error"),
								": ",
								state.error
							]
						}),
						report === null && state.state !== "error" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: emptyStyle,
							children: state.state === "loading" ? t("cd.loading") : t("cd.empty")
						}) : report !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: summaryStyle,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: gaugeColumnStyle,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											position: "relative",
											width: 96,
											height: 96
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BudgetRing, {
											percent,
											color: accent,
											size: 96
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: gaugeCaptionStyle,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("strong", {
												style: {
													color: accent,
													fontSize: 18,
													letterSpacing: "-0.04em"
												},
												children: [Math.round(Math.min(percent, 1) * 100), "%"]
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: {
													color: TONE.muted,
													fontSize: 9
												},
												children: t("cd.guideline")
											})]
										})]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: { textAlign: "center" },
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("strong", {
											style: totalStyle,
											children: [formatK(resident), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", {
												style: totalUnitStyle,
												children: "t"
											})]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: totalCaptionStyle,
											children: t("cd.residentTokens")
										})]
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: breakdownStyle,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MetricRow, {
											label: t("cd.instructions"),
											value: instructions,
											ratio: resident === 0 ? 0 : instructions / resident,
											color: TONE.mint,
											detail: report.injected.instructions.files.length > 0 ? `${report.injected.instructions.files.length} ${t("cd.files")}` : void 0
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MetricRow, {
											label: t("cd.skills"),
											value: skills,
											ratio: resident === 0 ? 0 : skills / resident,
											color: TONE.blue,
											detail: report.injected.skills.catalogCount > 0 ? t("cd.catalog", { n: report.injected.skills.catalogCount }) : void 0
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MetricRow, {
											label: t("cd.tools"),
											value: schemas,
											ratio: resident === 0 ? 0 : schemas / resident,
											color: TONE.amber,
											detail: report.injected.tools.visibleCount > 0 ? `${report.injected.tools.visibleCount} ${t("cd.toolsCount")}` : void 0
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: mcpLineStyle,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("cd.mcp") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: report.injected.tools.mcp.totalTools > 0 ? `${formatK(report.injected.tools.mcp.totalTokens)}t · ${t("cd.mcpTools", { n: report.injected.tools.mcp.totalTools })}` : "—" })]
										})
									]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									...insightStyle,
									background: suggestions.length > 0 ? TONE.amberSoft : TONE.mintSoft,
									borderColor: TONE.border
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										...checkStyle,
										color: suggestions.length > 0 ? TONE.amber : TONE.mint
									},
									children: suggestions.length > 0 ? "!" : "✓"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
									style: { color: suggestions.length > 0 ? TONE.amber : TONE.mint },
									children: suggestions.length > 0 ? t("cd.review") : t("cd.healthy")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									style: insightCopyStyle,
									children: suggestions.length > 0 ? t("cd.reviewHint") : t("cd.healthyHint")
								})] })]
							}),
							suggestions.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: suggestionsStyle,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: sectionLabelStyle,
									children: t("cd.suggestions", { n: suggestions.length })
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", {
									style: suggestionListStyle,
									children: suggestions.slice(0, 3).map((suggestion, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
										style: suggestionStyle,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												...suggestionIndexStyle,
												color: severityColor(suggestion.severity),
												borderColor: `${severityColor(suggestion.severity)}77`
											},
											children: index + 1
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: suggestionTextStyle,
											children: suggestion.text
										})]
									}, `${suggestion.severity}-${suggestion.text}`))
								})]
							})
						] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
							style: footerStyle,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								style: updatedStyle,
								children: [
									t("cd.updated"),
									": ",
									updatedLabel(state.refreshedAt)
								]
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
		function MetricRow({ label, value, ratio, color, detail }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: metricRowStyle,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
						width: 5,
						height: 5,
						borderRadius: 99,
						background: color,
						boxShadow: "0 0 0 3px var(--dsw-alias-bg-mask-1, rgba(124,224,170,0.12))"
					} }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: metricLabelStyle,
						children: label
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						style: metricValueStyle,
						children: [formatK(value), "t"]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						style: {
							...metricPercentStyle,
							color
						},
						children: [Math.round(ratio * 100), "%"]
					}),
					detail !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: metricDetailStyle,
						children: detail
					})
				]
			});
		}
		const dockStyle = {
			display: "inline-flex",
			alignItems: "center",
			position: "relative",
			fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
		};
		const triggerStyle = {
			display: "inline-flex",
			alignItems: "center",
			gap: 6,
			minHeight: 28,
			padding: "4px 8px 4px 7px",
			border: `1px solid ${TONE.border}`,
			borderRadius: 8,
			color: TONE.text,
			background: TONE.surface,
			cursor: "pointer",
			boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset",
			transition: "border-color 160ms ease, background 160ms ease, transform 160ms ease"
		};
		const triggerMetricStyle = {
			fontSize: 11,
			lineHeight: 1,
			fontWeight: 700,
			letterSpacing: "-0.02em",
			fontVariantNumeric: "tabular-nums"
		};
		const triggerStatusStyle = {
			width: 5,
			height: 5,
			borderRadius: 99,
			marginLeft: 1,
			boxShadow: "0 0 0 3px var(--dsw-alias-bg-mask-1, rgba(124,224,170,0.12))"
		};
		const panelStyle = {
			position: "absolute",
			zIndex: 100,
			right: 0,
			bottom: "calc(100% + 11px)",
			width: 380,
			maxWidth: "calc(100vw - 24px)",
			overflow: "hidden",
			color: TONE.text,
			background: TONE.canvas,
			border: `1px solid ${TONE.borderStrong}`,
			borderRadius: 14,
			boxShadow: "0 24px 68px rgba(3, 8, 18, 0.42), 0 4px 14px rgba(3, 8, 18, 0.3)",
			textAlign: "left",
			fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
		};
		const headerStyle = {
			display: "flex",
			alignItems: "center",
			justifyContent: "space-between",
			gap: 12,
			padding: "15px 16px 13px",
			borderBottom: `1px solid ${TONE.border}`
		};
		const titleStyle = {
			margin: 0,
			color: TONE.text,
			fontSize: 13,
			fontWeight: 760,
			letterSpacing: "-0.02em",
			lineHeight: 1.2
		};
		const subtitleStyle = {
			margin: "3px 0 0",
			color: TONE.muted,
			fontSize: 10,
			lineHeight: 1.2
		};
		const statusChipStyle = {
			display: "inline-flex",
			alignItems: "center",
			gap: 5,
			padding: "4px 7px",
			border: "1px solid",
			borderRadius: 99,
			fontSize: 10,
			fontWeight: 700,
			whiteSpace: "nowrap"
		};
		const noticeStyle = {
			margin: "12px 14px 0",
			padding: "8px 10px",
			borderRadius: 8,
			fontSize: 11,
			lineHeight: 1.45
		};
		const emptyStyle = {
			padding: "36px 16px",
			color: TONE.muted,
			fontSize: 12,
			textAlign: "center"
		};
		const summaryStyle = {
			display: "grid",
			gridTemplateColumns: "128px 1fr",
			minHeight: 155,
			borderBottom: `1px solid ${TONE.border}`
		};
		const gaugeColumnStyle = {
			display: "flex",
			flexDirection: "column",
			alignItems: "center",
			justifyContent: "center",
			gap: 7,
			padding: "15px 10px 13px",
			borderRight: `1px solid ${TONE.border}`
		};
		const gaugeCaptionStyle = {
			position: "absolute",
			inset: 0,
			display: "flex",
			flexDirection: "column",
			alignItems: "center",
			justifyContent: "center",
			gap: 2,
			transform: "rotate(0deg)"
		};
		const totalStyle = {
			display: "block",
			color: TONE.text,
			fontSize: 23,
			fontWeight: 760,
			letterSpacing: "-0.06em",
			lineHeight: .9,
			fontVariantNumeric: "tabular-nums"
		};
		const totalUnitStyle = {
			marginLeft: 2,
			color: TONE.muted,
			fontSize: 11,
			letterSpacing: 0
		};
		const totalCaptionStyle = {
			display: "block",
			marginTop: 4,
			color: TONE.muted,
			fontSize: 9,
			lineHeight: 1.2
		};
		const breakdownStyle = {
			display: "flex",
			flexDirection: "column",
			justifyContent: "center",
			gap: 7,
			padding: "13px 14px 11px"
		};
		const metricRowStyle = {
			display: "grid",
			gridTemplateColumns: "7px minmax(0, 1fr) auto auto",
			alignItems: "center",
			columnGap: 6,
			minHeight: 17,
			fontSize: 10
		};
		const metricLabelStyle = {
			overflow: "hidden",
			color: TONE.text,
			fontWeight: 600,
			textOverflow: "ellipsis",
			whiteSpace: "nowrap"
		};
		const metricValueStyle = {
			color: TONE.text,
			fontSize: 11,
			fontWeight: 720,
			fontVariantNumeric: "tabular-nums",
			whiteSpace: "nowrap"
		};
		const metricPercentStyle = {
			minWidth: 25,
			textAlign: "right",
			fontSize: 10,
			fontWeight: 700,
			fontVariantNumeric: "tabular-nums"
		};
		const metricDetailStyle = {
			gridColumn: "2 / -1",
			color: TONE.quiet,
			fontSize: 9,
			overflow: "hidden",
			textOverflow: "ellipsis",
			whiteSpace: "nowrap"
		};
		const mcpLineStyle = {
			display: "flex",
			justifyContent: "space-between",
			gap: 8,
			marginTop: 1,
			paddingTop: 7,
			borderTop: `1px solid ${TONE.border}`,
			color: TONE.muted,
			fontSize: 9
		};
		const insightStyle = {
			display: "flex",
			gap: 9,
			alignItems: "flex-start",
			margin: "12px 14px 0",
			padding: "9px 10px",
			border: "1px solid",
			borderRadius: 9
		};
		const checkStyle = {
			display: "grid",
			flexShrink: 0,
			width: 18,
			height: 18,
			border: "1px solid currentColor",
			borderRadius: 99,
			placeItems: "center",
			fontSize: 11,
			fontWeight: 800
		};
		const insightCopyStyle = {
			margin: "3px 0 0",
			color: TONE.muted,
			fontSize: 10,
			lineHeight: 1.45
		};
		const suggestionsStyle = { padding: "12px 14px 0" };
		const sectionLabelStyle = {
			marginBottom: 7,
			color: TONE.muted,
			fontSize: 9,
			fontWeight: 750,
			letterSpacing: "0.08em",
			textTransform: "uppercase"
		};
		const suggestionListStyle = {
			display: "flex",
			flexDirection: "column",
			gap: 6,
			margin: 0,
			padding: 0,
			listStyle: "none"
		};
		const suggestionStyle = {
			display: "flex",
			alignItems: "flex-start",
			gap: 8,
			padding: "8px 9px",
			color: TONE.text,
			background: TONE.surface,
			border: `1px solid ${TONE.border}`,
			borderRadius: 8,
			fontSize: 10,
			lineHeight: 1.4
		};
		const suggestionIndexStyle = {
			display: "grid",
			flex: "0 0 auto",
			width: 17,
			height: 17,
			border: "1px solid",
			borderRadius: 99,
			placeItems: "center",
			fontSize: 9,
			fontWeight: 800,
			lineHeight: 1
		};
		const suggestionTextStyle = { color: TONE.text };
		const footerStyle = {
			display: "flex",
			alignItems: "center",
			justifyContent: "space-between",
			gap: 12,
			marginTop: 13,
			padding: "11px 14px 12px",
			borderTop: `1px solid ${TONE.border}`
		};
		const updatedStyle = {
			color: TONE.quiet,
			fontSize: 9,
			fontVariantNumeric: "tabular-nums"
		};
		const refreshStyle = {
			display: "inline-flex",
			alignItems: "center",
			gap: 5,
			padding: "4px 7px",
			color: TONE.blue,
			background: "transparent",
			border: "1px solid transparent",
			borderRadius: 6,
			cursor: "pointer",
			fontSize: 10,
			fontWeight: 700
		};
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
			"cd.attention": "需关注",
			"cd.review": "建议优化",
			"cd.healthyHint": "常驻上下文仍在建议预算内。",
			"cd.reviewHint": "优先处理下方建议，降低后续请求的上下文负担。",
			"cd.guideline": "50k 参考线",
			"cd.updated": "更新于",
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
			"cd.attention": "attention",
			"cd.review": "worth reviewing",
			"cd.healthyHint": "Resident context remains within the budget guideline.",
			"cd.reviewHint": "Start with the suggestions below to reduce request overhead.",
			"cd.guideline": "50k guide",
			"cd.updated": "Updated",
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