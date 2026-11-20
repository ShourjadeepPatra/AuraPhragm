import React, { useState, useEffect } from 'react';
import { SupportedLanguage } from '../config/appConfig';
import { AiSessionBrief, AnalysisResult } from '../types';
import { getAllFeedbackRecords, getAllTestResults, deleteTestResult } from '../services/storage';
import { generateLongitudinalSessionBrief } from '../services/geminiService';
import {
  Search,
  Download,
  Trash2,
  Clock,
  Activity,
  ChevronRight,
  FileText,
  Printer,
  MessageCircle,
  Image as ImageIcon,
  Bot,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import {
  generateReportPngBlob,
  getWhatsAppShareUrl,
  triggerBlobDownload,
} from '../services/reportGenerator';

interface Props {
  language: SupportedLanguage;
  onSelectResult: (res: AnalysisResult) => void;
}

export const HistoryScreen: React.FC<Props> = ({ language, onSelectResult }) => {
  const [tests, setTests] = useState<AnalysisResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTriage, setFilterTriage] = useState<string>('all');
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);
  const [sessionBrief, setSessionBrief] = useState<AiSessionBrief | null>(null);

  const loadData = async () => {
    const records = await getAllTestResults();
    setTests(records);
  };

  const handleGenerateAiSummary = async () => {
    if (tests.length === 0 || briefLoading) return;
    setBriefError(null);
    setBriefLoading(true);
    try {
      const feedback = await getAllFeedbackRecords();
      const res = await generateLongitudinalSessionBrief({
        tests,
        feedback,
        language,
      });
      setSessionBrief(res);
    } catch (err: any) {
      setBriefError(err?.message || 'Unable to generate longitudinal AI summary.');
    } finally {
      setBriefLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteTestResult(id);
    await loadData();
  };

  const handleExportCSV = () => {
    const headers = [
      'id',
      'timestamp',
      'overallTriage',
      'coughType',
      'confidence',
      'breathingRate',
      'coughCount',
      'spectralCentroidHz',
      'avgContactTempC',
      'avgHeartRateBpmExp',
      'avgSpo2PctExp',
      'isSimulated',
      'modelVersion',
    ];

    const rows = tests.map((rec) => [
      rec.id,
      `"${rec.timestamp}"`,
      `"${rec.overallTriage}"`,
      `"${rec.coughType}"`,
      rec.confidence,
      rec.features?.breathingRate,
      rec.features?.coughCount,
      rec.features?.spectralCentroid ?? rec.features?.dominantFrequency,
      rec.features?.avgContactTempC ?? 'NA',
      rec.features?.avgHeartRateBpm ?? 'NA',
      rec.features?.avgSpo2Pct ?? 'NA',
      rec.isSimulated,
      `"${rec.modelVersion}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `auraphragm_history_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(tests, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `auraphragm_dataset_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filtered = tests.filter((item) => {
    const matchQuery =
      item.plainExplanation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.coughType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.groundTruthLabel && item.groundTruthLabel.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchTriage = filterTriage === 'all' || item.overallTriage === filterTriage;
    return matchQuery && matchTriage;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-mono font-bold text-teal-400 uppercase tracking-wider">
            Patient Logbook
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight mt-1 font-display">
            AuraPhragm Screening Records
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-mono tabular-nums">
            IndexedDB offline repository. Total: {tests.length} saved sessions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={tests.length === 0 || briefLoading}
            onClick={handleGenerateAiSummary}
            className="flex items-center gap-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 px-3 py-2 text-xs font-black transition cursor-pointer disabled:opacity-40 whitespace-nowrap"
          >
            {briefLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
            <span>{briefLoading ? 'Summarizing...' : 'AI Trend Brief'}</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-teal-400" />
            <span>CSV</span>
          </button>
          <button
            type="button"
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 transition cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-teal-400" />
            <span>JSON</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-teal-400" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {briefError && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-200 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{briefError}</span>
        </div>
      )}

      {sessionBrief && (
        <div className="rounded-2xl border border-teal-500/35 bg-slate-900 p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <span className="text-xs font-mono font-bold text-teal-400 uppercase tracking-wider flex items-center gap-2">
              <Bot className="w-4 h-4" />
              <span>AI Longitudinal Clinical Handover Brief</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500">{sessionBrief.modelVersion}</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">{sessionBrief.trendSummary}</p>
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-xs text-slate-300 leading-relaxed">
            <strong className="text-teal-300 block mb-1">PHC Handover Note:</strong>
            {sessionBrief.clinicalHandoverNote}
          </div>
        </div>
      )}

      {/* Historical Trend Preview */}
      {tests.length > 1 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-400" />
              <span>Biometric Trend Over Time (Last {Math.min(10, tests.length)} Sessions)</span>
            </h4>
            <span className="text-[11px] text-slate-400 font-mono">BPM Cadence</span>
          </div>

          <div className="flex items-end gap-2 h-24 pt-4 border-b border-slate-800">
            {tests
              .slice(0, 10)
              .reverse()
              .map((rec, idx) => {
                const bpm = rec.features?.breathingRate || 16;
                const heightPct = Math.min(100, Math.max(15, (bpm / 45) * 100));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div
                      className={`w-full rounded-t-md transition-all ${
                        rec.overallTriage === 'MEDICAL_HELP_NEEDED'
                          ? 'bg-rose-500'
                          : rec.overallTriage === 'MONITOR_RETEST'
                          ? 'bg-amber-400'
                          : 'bg-teal-400'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[9px] text-slate-500 font-mono tabular-nums">{bpm}</span>
                  </div>
                );
              })}
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>Older Tests</span>
            <span>Latest</span>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search symptoms, findings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-1.5 rounded-xl bg-slate-900 p-1 border border-slate-800 text-xs w-full sm:w-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'MEDICAL_HELP_NEEDED', label: 'Help Needed' },
            { id: 'MONITOR_RETEST', label: 'Monitor' },
            { id: 'MEDICAL_HELP_NOT_NEEDED', label: 'Not Needed' },
          ].map((flt) => (
            <button
              key={flt.id}
              type="button"
              onClick={() => setFilterTriage(flt.id)}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer text-[11px] whitespace-nowrap ${
                filterTriage === flt.id ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {flt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/50 p-12 text-center text-slate-400">
          <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-300">No matching test records found</p>
          <p className="text-xs text-slate-500 mt-1">Complete a 60-second test to build the patient logbook</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectResult(item)}
              className="rounded-xl border border-slate-800 bg-slate-900/90 hover:border-slate-700 p-4 shadow-md transition cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className={`font-mono text-[10px] font-black uppercase ${
                      item.overallTriage === 'MEDICAL_HELP_NEEDED'
                        ? 'text-rose-400'
                        : item.overallTriage === 'MONITOR_RETEST'
                        ? 'text-amber-300'
                        : 'text-emerald-400'
                    }`}
                  >
                    {item.overallTriage === 'MEDICAL_HELP_NEEDED'
                      ? 'HELP NEEDED'
                      : item.overallTriage === 'MONITOR_RETEST'
                      ? 'MONITOR'
                      : 'NOT NEEDED'}
                  </span>

                  <span className="text-xs text-slate-400 font-mono tabular-nums">
                    {new Date(item.timestamp).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>

                  {item.isSimulated && (
                    <span className="text-[10px] font-mono text-amber-300 uppercase">SIM</span>
                  )}
                </div>

                <p className="text-sm font-bold text-white">{item.coughType}</p>
                <p className="text-xs text-slate-400 line-clamp-1 max-w-xl">{item.plainExplanation}</p>
              </div>

              <div className="flex items-center gap-2.5 self-end md:self-auto">
                <div className="text-right text-xs mr-1.5 font-mono tabular-nums">
                  <p className="font-bold text-white">{item.features?.breathingRate} bpm</p>
                  <p className="text-[11px] text-slate-400">
                    {item.features?.coughCount} coughs
                    {item.features?.avgContactTempC !== null && item.features?.avgContactTempC !== undefined
                      ? ` • ${item.features.avgContactTempC.toFixed(1)}°C`
                      : ''}
                  </p>
                </div>

                <a
                  href={getWhatsAppShareUrl(item, undefined, language)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-lg p-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/50 transition"
                  title="Share summary on WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>

                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const blob = await generateReportPngBlob(item, undefined, language);
                    const dateSlug = new Date(item.timestamp).toISOString().split('T')[0];
                    triggerBlobDownload(blob, `AuraPhragm_Report_${dateSlug}_${item.id.slice(-4)}.png`);
                  }}
                  className="rounded-lg p-2 text-teal-400 hover:text-teal-300 hover:bg-teal-950/50 transition cursor-pointer"
                  title="Download PNG report"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={(e) => handleDelete(item.id, e)}
                  className="rounded-lg p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                  title="Delete record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <ChevronRight className="w-4 h-4 text-slate-500" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
