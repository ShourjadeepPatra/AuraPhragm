import React, { useState } from 'react';
import {
  Download,
  Share2,
  FileText,
  Image as ImageIcon,
  MessageCircle,
  Copy,
  Check,
  Printer,
  Loader2,
} from 'lucide-react';
import { SupportedLanguage } from '../config/appConfig';
import { AnalysisResult, PatientProfile } from '../types';
import {
  buildWhatsAppSummaryText,
  generatePrintableHtmlReport,
  generateReportPngBlob,
  getWhatsAppShareUrl,
  triggerBlobDownload,
} from '../services/reportGenerator';

interface Props {
  result: AnalysisResult;
  patient?: PatientProfile;
  language: SupportedLanguage;
}

export const ReportShareActions: React.FC<Props> = ({ result, patient, language }) => {
  const [busyAction, setBusyAction] = useState<'png' | 'html' | 'share' | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  const dateSlug = new Date(result.timestamp).toISOString().split('T')[0];
  const safeName = (patient?.name || 'patient').replace(/[^a-z0-9]+/gi, '_').toLowerCase();
  const whatsAppHref = getWhatsAppShareUrl(result, patient, language);

  const handleDownloadPngReport = async () => {
    setBusyAction('png');
    setStatusMessage(null);
    try {
      const blob = await generateReportPngBlob(result, patient, language);
      triggerBlobDownload(blob, `AuraPhragm_Report_${safeName}_${dateSlug}.png`);
      setStatusMessage('Visual screening report image (.png) downloaded. Attach directly in WhatsApp if desired.');
    } catch (err) {
      console.error('PNG report error:', err);
      setStatusMessage('Could not generate PNG report image.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleDownloadHtmlReport = () => {
    setBusyAction('html');
    setStatusMessage(null);
    try {
      const html = generatePrintableHtmlReport(result, patient, language);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      triggerBlobDownload(blob, `AuraPhragm_Clinic_Report_${safeName}_${dateSlug}.html`);
      setStatusMessage('Printable clinic report (.html) downloaded for offline viewing or PDF saving.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleShareWithAttachment = async () => {
    setBusyAction('share');
    setStatusMessage(null);
    const summaryText = buildWhatsAppSummaryText(result, patient, language);

    try {
      const pngBlob = await generateReportPngBlob(result, patient, language);
      const pngFile = new File([pngBlob], `AuraPhragm_Report_${safeName}_${dateSlug}.png`, {
        type: 'image/png',
      });

      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [pngFile] })
      ) {
        await navigator.share({
          title: `AuraPhragm Screening Report - ${patient?.name || 'Patient'}`,
          text: summaryText,
          files: [pngFile],
        });
        setStatusMessage('Report shared successfully!');
      } else {
        triggerBlobDownload(pngBlob, `AuraPhragm_Report_${safeName}_${dateSlug}.png`);
        setStatusMessage(
          'Report PNG downloaded. Click "Send via WhatsApp" to open WhatsApp with the summary and attach the image.'
        );
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.warn('Native share unavailable or cancelled:', err);
        setStatusMessage('Use "Send via WhatsApp" or download the PNG/HTML report to share manually.');
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handleCopyText = async () => {
    const summaryText = buildWhatsAppSummaryText(result, patient, language);
    await navigator.clipboard.writeText(summaryText);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Share2 className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="text-sm sm:text-base font-display font-bold text-white">
              Downloadable Report &amp; WhatsApp Share
            </h3>
            <p className="text-[11px] text-slate-400">
              Save this screening summary offline or share with a PHC clinician on WhatsApp
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 self-start sm:self-auto">
          Offline Ready
        </span>
      </div>

      {/* Primary WhatsApp & Download Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Direct WhatsApp Text Summary Link */}
        <a
          href={whatsAppHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 px-4 py-3 text-xs font-black shadow-lg shadow-emerald-950/40 transition active:scale-95"
        >
          <MessageCircle className="w-4 h-4 fill-current" />
          <span>Send via WhatsApp</span>
        </a>

        {/* Share Image + Summary (Native Web Share on Android / Download fallback) */}
        <button
          type="button"
          onClick={handleShareWithAttachment}
          disabled={busyAction !== null}
          className="flex items-center justify-center gap-2 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 px-4 py-3 text-xs font-black shadow-lg shadow-teal-950/30 transition active:scale-95 cursor-pointer disabled:opacity-60"
        >
          {busyAction === 'share' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Share2 className="w-4 h-4" />
          )}
          <span>Share Report Card</span>
        </button>

        {/* Download Visual PNG Card */}
        <button
          type="button"
          onClick={handleDownloadPngReport}
          disabled={busyAction !== null}
          className="flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-100 px-4 py-3 text-xs font-bold transition cursor-pointer disabled:opacity-60"
        >
          {busyAction === 'png' ? (
            <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
          ) : (
            <ImageIcon className="w-4 h-4 text-teal-400" />
          )}
          <span>Download PNG</span>
        </button>

        {/* Download Printable HTML Clinic Sheet */}
        <button
          type="button"
          onClick={handleDownloadHtmlReport}
          disabled={busyAction !== null}
          className="flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-100 px-4 py-3 text-xs font-bold transition cursor-pointer disabled:opacity-60"
        >
          {busyAction === 'html' ? (
            <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
          ) : (
            <Download className="w-4 h-4 text-sky-400" />
          )}
          <span>Download Report</span>
        </button>
      </div>

      {/* Secondary Quick Utilities */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyText}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 px-3 py-1.5 text-slate-300 font-semibold transition cursor-pointer"
          >
            {copiedSummary ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>{copiedSummary ? 'WhatsApp Text Copied' : 'Copy WhatsApp Summary'}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 px-3 py-1.5 text-slate-300 font-semibold transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>Print / Save PDF</span>
          </button>
        </div>

        <span className="text-[10px] text-slate-500">
          Includes triage banner, biometrics, probabilities &amp; disclaimer
        </span>
      </div>

      {statusMessage && (
        <div className="rounded-xl border border-teal-500/30 bg-teal-950/30 px-3.5 py-2.5 text-xs text-teal-200 flex items-center gap-2">
          <FileText className="w-4 h-4 text-teal-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}
    </div>
  );
};
