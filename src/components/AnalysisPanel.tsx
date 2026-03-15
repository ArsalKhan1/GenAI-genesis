"use client";

import { AnalysisResult } from "@/types";

interface Props {
  analysis: AnalysisResult | null;
  isAnalyzing: boolean;
  messageCount: number;
  participants: string[];
}

const MANIPULATION_COLORS: Record<string, string> = {
  none: "text-green-600 bg-green-50",
  mild: "text-yellow-600 bg-yellow-50",
  moderate: "text-orange-600 bg-orange-50",
  high: "text-red-600 bg-red-50",
};

function GaugeBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export default function AnalysisPanel({ analysis, isAnalyzing, messageCount, participants }: Props) {
  const userLabel = participants[0] || "You";
  const otherLabel = participants[1] || "Other";

  return (
    <div className="w-80 bg-gray-50 flex flex-col overflow-y-auto">
      <div className="p-4 border-b border-gray-200 bg-white">
        <h2 className="font-semibold text-gray-800 text-sm">🧠 AI Analysis</h2>
        <p className="text-xs text-gray-400 mt-0.5">Updates after each message</p>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {/* Waiting state */}
        {messageCount === 0 && !isAnalyzing && (
          <div className="text-center text-gray-400 text-xs mt-8">
            <p className="text-3xl mb-2">🔍</p>
            <p>Analysis will appear here once the conversation starts.</p>
          </div>
        )}

        {/* Analyzing spinner */}
        {isAnalyzing && (
          <div className="flex items-center gap-2 text-purple-600 text-xs">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Analyzing conversation...
          </div>
        )}

        {analysis && (
          <>
            {/* Effort Balance */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
                Effort Balance
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>{userLabel}</span>
                  <span className="font-bold">{analysis.effort_balance.user_percentage}%</span>
                </div>
                <GaugeBar value={analysis.effort_balance.user_percentage} color="bg-purple-500" />
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>{otherLabel}</span>
                  <span className="font-bold">{analysis.effort_balance.other_percentage}%</span>
                </div>
                <GaugeBar value={analysis.effort_balance.other_percentage} color="bg-rose-400" />
              </div>
            </div>

            {/* Power Dynamic */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
                Power Dynamic
              </h3>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-bold text-purple-600">{userLabel} {analysis.power_dynamic.user}%</span>
                <div className="flex-1 flex h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-500 transition-all duration-700"
                    style={{ width: `${analysis.power_dynamic.user}%` }}
                  />
                  <div
                    className="bg-rose-400 transition-all duration-700"
                    style={{ width: `${analysis.power_dynamic.other}%` }}
                  />
                </div>
                <span className="font-bold text-rose-500">{analysis.power_dynamic.other}% {otherLabel}</span>
              </div>
            </div>

            {/* Ghosting Probability */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Ghosting Probability
              </h3>
              <div className="flex items-center gap-3">
                <span className={`text-2xl font-bold ${
                  analysis.ghosting_probability > 60 ? "text-red-500" :
                  analysis.ghosting_probability > 30 ? "text-yellow-500" : "text-green-500"
                }`}>
                  {analysis.ghosting_probability}%
                </span>
                <GaugeBar
                  value={analysis.ghosting_probability}
                  color={
                    analysis.ghosting_probability > 60 ? "bg-red-400" :
                    analysis.ghosting_probability > 30 ? "bg-yellow-400" : "bg-green-400"
                  }
                />
              </div>
            </div>

            {/* Manipulation Signals */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Manipulation Signals
              </h3>
              <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full capitalize ${MANIPULATION_COLORS[analysis.manipulation_signals]}`}>
                {analysis.manipulation_signals}
              </span>
            </div>

            {/* Detected Signals */}
            {analysis.signals_detected.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                  Signals Detected
                </h3>
                <ul className="space-y-1">
                  {analysis.signals_detected.map((signal, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                      <span className="text-orange-400 mt-0.5">•</span>
                      {signal}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Attachment Style */}
            {analysis.attachment_style && (
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                  Attachment Style ({otherLabel})
                </h3>
                <p className="text-sm text-gray-700 capitalize">{analysis.attachment_style}</p>
              </div>
            )}

            {/* Recommendation */}
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">
                💡 Recommendation
              </h3>
              <p className="text-sm text-purple-900 leading-relaxed">
                {analysis.recommendation}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
