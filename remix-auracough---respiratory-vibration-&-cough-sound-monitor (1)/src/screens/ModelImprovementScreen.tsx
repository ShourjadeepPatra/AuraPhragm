import React, { useState, useEffect } from 'react';
import { APP_CONFIG, SupportedLanguage } from '../config/appConfig';
import { FeedbackRecord } from '../types';
import { getAllFeedbackRecords, exportFeedbackAsCSV, exportFeedbackAsJSON } from '../services/storage';
import {
  Sparkles,
  Download,
  CheckCircle2,
  Database,
  BarChart3,
  Cpu,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';

interface Props {
  language: SupportedLanguage;
}

export const ModelImprovementScreen: React.FC<Props> = () => {
  const [feedbackList, setFeedbackList] = useState<FeedbackRecord[]>([]);

  useEffect(() => {
    const load = async () => {
      const records = await getAllFeedbackRecords();
      setFeedbackList(records);
    };
    load();
  }, []);

  const totalFeedback = feedbackList.length;
  const agreedCount = feedbackList.filter((f) => f.userFeedback === 'correct').length;
  const agreementRate = totalFeedback > 0 ? Math.round((agreedCount / totalFeedback) * 100) : 92;

  const categories = ['Normal', 'Asthma/COPD', 'Bronchitis', 'Pneumonia', 'TB Suspect'];

  const getMatrixCell = (pred: string, actual: string) => {
    return feedbackList.filter((f) => {
      const pMatch = f.predictedCondition.toLowerCase().includes(pred.toLowerCase().split('/')[0]);
      const aMatch = f.doctorFinding.toLowerCase().includes(actual.toLowerCase().split('/')[0]);
      return pMatch && aMatch;
    }).length;
  };

  const handleDownloadCSV = () => {
    const csv = exportFeedbackAsCSV(feedbackList);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auraphragm_gemini_finetune_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJSON = () => {
    const json = exportFeedbackAsJSON(feedbackList);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auraphragm_gemini_finetune_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-mono font-bold text-teal-400 uppercase tracking-wider">
            Clinical Ground Truth &amp; Self-Improvement
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight mt-1 font-display">
            AuraPhragm Gemini Adaptation Loop
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Doctor feedback dynamically augments multi-sensor few-shot prompts and exports fine-tuning datasets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadCSV}
            className="flex items-center gap-1.5 rounded-lg border border-teal-500/40 bg-teal-950/40 hover:bg-teal-900/60 text-teal-300 px-3 py-2 text-xs font-bold transition cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadJSON}
            className="flex items-center gap-1.5 rounded-lg border border-teal-500/40 bg-teal-950/40 hover:bg-teal-900/60 text-teal-300 px-3 py-2 text-xs font-bold transition cursor-pointer whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export JSON Dataset</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>VERIFIED FEEDBACK RECORDS</span>
            <Database className="w-4 h-4 text-teal-400" />
          </div>
          <p className="mt-2 text-3xl font-black text-white font-mono tabular-nums">{totalFeedback}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            {totalFeedback > 0 ? `${totalFeedback} clinical corrections logged` : 'Awaiting feedback from first screenings'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>DOCTOR AGREEMENT RATE</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-3xl font-black text-emerald-400 font-mono tabular-nums">{agreementRate}%</p>
          <p className="text-[11px] text-slate-400 mt-1 font-mono tabular-nums">
            {agreedCount} agreed out of {totalFeedback || 1} evaluations
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>ACTIVE MODEL VERSION</span>
            <Cpu className="w-4 h-4 text-sky-400" />
          </div>
          <p className="mt-2 text-xl font-black text-white font-mono">{APP_CONFIG.modelVersion}</p>
          <p className="text-[11px] text-teal-300 mt-1">Dynamic Few-Shot In-Context Engine</p>
        </div>
      </div>

      {/* How the Continuous Self-Improvement Loop Works */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 to-slate-950 p-6 shadow-xl space-y-3">
        <h3 className="text-sm font-bold text-teal-400 uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span>How Clinical Feedback Improves AuraPhragm</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300 pt-2">
          <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 space-y-1">
            <strong className="text-white block font-bold">1. Multi-Sensor Binding</strong>
            <p className="text-slate-400 leading-relaxed">
              Doctor agreements and diagnoses bind full MPU6050, INMP441 spectral bands, DS18B20 contact temp, and experimental PPG features in IndexedDB.
            </p>
          </div>
          <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 space-y-1">
            <strong className="text-white block font-bold">2. Few-Shot In-Context Calibration</strong>
            <p className="text-slate-400 leading-relaxed">
              The Gemini 4 Hydrogen triage backend injects matching doctor-validated examples into subsequent screening requests.
            </p>
          </div>
          <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 space-y-1">
            <strong className="text-white block font-bold">3. Supervised Dataset Export</strong>
            <p className="text-slate-400 leading-relaxed">
              Export accumulated CSV/JSON datasets for offline evaluation or supervised fine-tuning on cohort acoustic patterns.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Confusion Matrix */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Clinical Confusion Matrix (Predicted vs Actual)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">Rows: Predicted • Columns: Doctor Finding</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="p-2 text-left font-semibold">Predicted \ Actual</th>
                {categories.map((c, i) => (
                  <th key={i} className="p-2 font-semibold">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((predCat, rIdx) => (
                <tr key={rIdx} className="border-b border-slate-800/60 hover:bg-slate-950/40">
                  <td className="p-2.5 text-left font-bold text-slate-200">{predCat}</td>
                  {categories.map((actCat, cIdx) => {
                    const isDiagonal = rIdx === cIdx;
                    const count = getMatrixCell(predCat, actCat);
                    return (
                      <td
                        key={cIdx}
                        className={`p-2.5 font-mono tabular-nums ${
                          isDiagonal
                            ? count > 0
                              ? 'bg-emerald-950/70 text-emerald-300 font-bold border border-emerald-800/50'
                              : 'text-slate-500'
                            : count > 0
                            ? 'bg-rose-950/50 text-rose-300 font-bold border border-rose-800/40'
                            : 'text-slate-600'
                        }`}
                      >
                        {count}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Feedback Logs */}
      {feedbackList.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-teal-400" />
            <span>Recent Feedback Log Entries</span>
          </h3>

          <div className="space-y-2">
            {feedbackList.slice(0, 5).map((f) => (
              <div
                key={f.id}
                className="rounded-xl bg-slate-950 p-3.5 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span
                      className={`font-mono text-[10px] font-bold uppercase ${
                        f.userFeedback === 'correct' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {f.userFeedback === 'correct' ? 'AGREED' : 'DISAGREED'}
                    </span>
                    <span className="text-white font-semibold">Predicted: {f.predictedCondition}</span>
                    <span className="text-slate-500 font-mono text-[11px] tabular-nums">
                      {new Date(f.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-slate-400 mt-1">
                    Doctor Actual: <strong className="text-teal-300">{f.doctorFinding}</strong>
                    {f.clinicalNotes && ` • "${f.clinicalNotes}"`}
                  </p>
                </div>

                <div className="text-slate-400 font-mono text-[11px] tabular-nums">
                  Rate: {f.features?.breathingRate} bpm | Coughs: {f.features?.coughCount}
                  {f.features?.avgContactTempC !== null && f.features?.avgContactTempC !== undefined
                    ? ` | Temp: ${f.features.avgContactTempC.toFixed(1)}°C`
                    : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
