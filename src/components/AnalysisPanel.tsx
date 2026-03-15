"use client";

import { AnalysisResult } from "@/types";

interface Props {
  analysis: AnalysisResult | null;
  isAnalyzing: boolean;
  messageCount: number;
  participants: string[];
}

const MANIP_CONFIG = {
  none:     { label: "None",     dot: "bg-emerald-400", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  mild:     { label: "Mild",     dot: "bg-yellow-400",  badge: "bg-yellow-500/10  text-yellow-400  border-yellow-500/20"  },
  moderate: { label: "Moderate", dot: "bg-orange-400",  badge: "bg-orange-500/10  text-orange-400  border-orange-500/20"  },
  high:     { label: "High",     dot: "bg-red-400",     badge: "bg-red-500/10     text-red-400     border-red-500/20"     },
};

function GaugeBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl p-4 ${className}`}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
      {children}
    </p>
  );
}

function GhostingColor(p: number) {
  if (p > 60) return { text: "text-red-400",     bar: "bg-red-500",     bg: "bg-red-500/10"    };
  if (p > 30) return { text: "text-yellow-400",  bar: "bg-yellow-500",  bg: "bg-yellow-500/10" };
  return               { text: "text-emerald-400", bar: "bg-emerald-500", bg: "bg-emerald-500/10" };
}

export default function AnalysisPanel({ analysis, isAnalyzing, messageCount, participants }: Props) {
  const userLabel  = participants[0] || "You";
  const otherLabel = participants[1] || "Other";

  return (
    <div className="w-72 xl:w-80 bg-[#080812] border-l border-slate-800 flex flex-col overflow-hidden shrink-0">
      {/* Panel header */}
      <div className="px-4 py-3 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-200">Analysis</span>
          {isAnalyzing && (
            <span className="flex items-center gap-1.5 text-xs text-violet-400">
              <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              running…
            </span>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* Empty state */}
        {messageCount === 0 && !isAnalyzing && !analysis && (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-center">
            <span className="text-2xl">🔍</span>
            <p className="text-slate-500 text-xs leading-relaxed">
              Analysis will appear here once the conversation starts.
            </p>
          </div>
        )}

        {analysis && (
          <>
            {/* Effort Balance */}
            <Card>
              <SectionLabel>Effort Balance</SectionLabel>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-slate-400">{userLabel}</span>
                    <span className="text-xs font-bold text-violet-300">{analysis.effort_balance.user_percentage}%</span>
                  </div>
                  <GaugeBar value={analysis.effort_balance.user_percentage} color="bg-violet-500" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-slate-400">{otherLabel}</span>
                    <span className="text-xs font-bold text-rose-300">{analysis.effort_balance.other_percentage}%</span>
                  </div>
                  <GaugeBar value={analysis.effort_balance.other_percentage} color="bg-rose-500" />
                </div>
              </div>
            </Card>

            {/* Power Dynamic */}
            <Card>
              <SectionLabel>Power Dynamic</SectionLabel>
              <div className="flex items-center gap-2 text-xs mb-2">
                <span className="text-violet-300 font-semibold">{analysis.power_dynamic.user}%</span>
                <div className="flex-1 flex h-2 rounded-full overflow-hidden bg-slate-800">
                  <div
                    className="bg-violet-500 transition-all duration-700"
                    style={{ width: `${analysis.power_dynamic.user}%` }}
                  />
                  <div
                    className="bg-rose-500 transition-all duration-700"
                    style={{ width: `${analysis.power_dynamic.other}%` }}
                  />
                </div>
                <span className="text-rose-300 font-semibold">{analysis.power_dynamic.other}%</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>{userLabel}</span>
                <span>{otherLabel}</span>
              </div>
            </Card>

            {/* Ghosting Probability */}
            {(() => {
              const c = GhostingColor(analysis.ghosting_probability);
              return (
                <Card>
                  <SectionLabel>Ghosting Risk</SectionLabel>
                  <div className={`flex items-center gap-3 rounded-lg px-3 py-2 ${c.bg} mb-2`}>
                    <span className={`text-2xl font-bold tabular-nums ${c.text}`}>
                      {analysis.ghosting_probability}%
                    </span>
                    <div className="flex-1">
                      <GaugeBar value={analysis.ghosting_probability} color={c.bar} />
                    </div>
                  </div>
                </Card>
              );
            })()}

            {/* Manipulation + Attachment row */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <SectionLabel>Manipulation</SectionLabel>
                {(() => {
                  const cfg = MANIP_CONFIG[analysis.manipulation_signals];
                  return (
                    <div className={`inline-flex items-center gap-1.5 border rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </div>
                  );
                })()}
              </Card>

              <Card>
                <SectionLabel>Attachment</SectionLabel>
                <p className="text-xs text-slate-300 capitalize font-medium">{analysis.attachment_style}</p>
                <p className="text-xs text-slate-600 mt-0.5">{otherLabel}</p>
              </Card>
            </div>

            {/* Signals Detected */}
            {analysis.signals_detected.length > 0 && (
              <Card>
                <SectionLabel>Signals Detected</SectionLabel>
                <ul className="space-y-1.5">
                  {analysis.signals_detected.map((signal, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                      <span className="text-orange-400 mt-0.5 shrink-0">▸</span>
                      {signal}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Behavioral Patterns */}
            {analysis.behavioral_patterns.length > 0 && (
              <Card>
                <SectionLabel>Patterns</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.behavioral_patterns.map((p, i) => (
                    <span key={i} className="text-xs bg-slate-800 text-slate-400 border border-slate-700 rounded-full px-2.5 py-1">
                      {p}
                    </span>
                  ))}
                </div>
              </Card>
            )}

            {/* Recommendation */}
            <div className="bg-violet-950/40 border border-violet-800/30 rounded-xl p-4">
              <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-2">Recommendation</p>
              <p className="text-xs text-slate-300 leading-relaxed">{analysis.recommendation}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
