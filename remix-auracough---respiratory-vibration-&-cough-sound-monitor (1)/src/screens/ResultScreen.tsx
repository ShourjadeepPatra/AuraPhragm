import React, { useState } from 'react';
import { APP_CONFIG, SupportedLanguage } from '../config/appConfig';
import { TRANSLATIONS } from '../i18n/translations';
import {
  AnalysisResult,
  FeedbackRecord,
  LocationPermissionStatus,
  NearbyHospital,
  PatientProfile,
  UserCoordinates,
} from '../types';
import { audioSpeech } from '../services/audioSpeech';
import { saveFeedbackRecord } from '../services/storage';
import {
  Volume2,
  VolumeX,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  ThumbsUp,
  ThumbsDown,
  Stethoscope,
  Printer,
  Info,
  Activity,
  Bot,
} from 'lucide-react';
import { EmergencyBanner } from '../components/EmergencyBanner';
import { ReportShareActions } from '../components/ReportShareActions';
import { NearbyHospitalsPanel } from '../components/NearbyHospitalsPanel';

interface Props {
  language: SupportedLanguage;
  result: AnalysisResult;
  patient?: PatientProfile;
  locationStatus: LocationPermissionStatus;
  coords: UserCoordinates | null;
  hospitals: NearbyHospital[];
  hospitalsLoading: boolean;
  hospitalsError?: string | null;
  onRequestLocation: () => void;
  onRefreshHospitals: () => void;
  onRevokeLocation: () => void;
  onRetest: () => void;
  onNavigate: (tab: string) => void;
}

const DOCTOR_FINDING_OPTIONS = [
  'Normal healthy respiratory pattern',
  'Acute Viral Upper Respiratory Infection (URI)',
  'Acute Bronchitis (Bacterial/Viral)',
  'Bronchial Asthma (Exacerbation)',
  'Chronic Obstructive Pulmonary Disease (COPD)',
  'Community-Acquired Pneumonia (CAP)',
  'Tuberculosis (TB - Suspected/Confirmed)',
  'Pertussis (Whooping Cough)',
  'Croup / Laryngitis',
  'Allergic Rhinitis / Post-Nasal Drip',
  'Other / Inconclusive',
];

export const ResultScreen: React.FC<Props> = ({
  language,
  result,
  patient,
  locationStatus,
  coords,
  hospitals,
  hospitalsLoading,
  hospitalsError,
  onRequestLocation,
  onRefreshHospitals,
  onRevokeLocation,
  onRetest,
  onNavigate,
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<'correct' | 'wrong' | null>(null);
  const [doctorFinding, setDoctorFinding] = useState<string>('');
  const [clinicalNotes, setClinicalNotes] = useState<string>('');
  const [feedbackSaved, setFeedbackSaved] = useState(false);

  const t = TRANSLATIONS[language];

  const handleVoiceReadout = () => {
    if (isSpeaking) {
      audioSpeech.stopSpeaking();
      setIsSpeaking(false);
    } else {
      audioSpeech.speakResult(result, language);
      setIsSpeaking(true);
    }
  };

  const handleSaveFeedback = async (vote: 'correct' | 'wrong') => {
    setFeedbackGiven(vote);
    const feedback: FeedbackRecord = {
      id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      testId: result.id,
      timestamp: new Date().toISOString(),
      predictedTriage: result.overallTriage,
      predictedCondition: result.suspectedConditions[0]?.condition || result.coughType,
      userFeedback: vote,
      doctorFinding: doctorFinding || result.suspectedConditions[0]?.condition || 'Unspecified',
      clinicalNotes,
      features: result.features,
      symptoms: result.symptoms,
      modelVersion: result.modelVersion,
      groundTruth: result.groundTruthLabel,
    };

    await saveFeedbackRecord(feedback);
    setFeedbackSaved(true);
    audioSpeech.playBeep(880, 100);
  };

  const top3Conditions = result.suspectedConditions.slice(0, 3);
  const hasEmergency = result.redFlagsDetected.some(
    (f) => f.includes('hemoptysis') || f.includes('Cyanosis') || f.includes('severe')
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Emergency Helpline Banner if Emergency Red Flags Present */}
      {hasEmergency && (
        <EmergencyBanner
          language={language}
          reason="Immediate medical consultation required due to severe respiratory distress, cyanosis, or coughing blood."
          hospitals={hospitals}
          locationStatus={locationStatus}
          onRequestLocation={onRequestLocation}
        />
      )}

      {/* Simulated Data Warning Badge if applicable */}
      {result.isSimulated && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-950/40 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold uppercase tracking-wider">{t.simulatedDataWarning}</span>
          </div>
          {result.groundTruthLabel && (
            <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[11px] font-mono text-amber-300">
              Ground Truth: {result.groundTruthLabel}
            </span>
          )}
        </div>
      )}

      {/* BIG TRIAGE BANNER (Red / Amber / Green) */}
      <div
        className={`rounded-2xl p-6 md:p-8 text-center shadow-2xl transition-all ${
          result.overallTriage === 'MEDICAL_HELP_NEEDED'
            ? 'bg-gradient-to-b from-red-600 to-red-700 text-white shadow-red-950/70 border-2 border-red-400'
            : result.overallTriage === 'MONITOR_RETEST'
            ? 'bg-gradient-to-b from-amber-500 to-amber-600 text-slate-950 shadow-amber-950/70 border-2 border-amber-300'
            : 'bg-gradient-to-b from-emerald-600 to-emerald-700 text-white shadow-emerald-950/70 border-2 border-emerald-400'
        }`}
      >
        <div className="inline-flex items-center gap-2 rounded-lg bg-black/20 backdrop-blur-md px-3.5 py-1 text-xs font-black uppercase tracking-wider mb-3">
          {result.overallTriage === 'MEDICAL_HELP_NEEDED' ? (
            <AlertOctagon className="w-4 h-4" />
          ) : result.overallTriage === 'MONITOR_RETEST' ? (
            <AlertTriangle className="w-4 h-4" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          <span>Official AuraPhragm Screening Outcome</span>
        </div>

        <h1 className="text-3xl md:text-5xl font-black tracking-tight uppercase font-display">
          {result.overallTriage === 'MEDICAL_HELP_NEEDED'
            ? t.helpNeeded
            : result.overallTriage === 'MONITOR_RETEST'
            ? t.monitorRetest
            : t.helpNotNeeded}
        </h1>

        <p className="mt-3 text-sm md:text-base font-medium max-w-xl mx-auto opacity-95 leading-relaxed">
          {result.recommendation}
        </p>

        {/* Voice Read-out Button */}
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={handleVoiceReadout}
            className="flex items-center gap-2 rounded-xl bg-black/30 hover:bg-black/40 text-white px-5 py-2.5 text-xs md:text-sm font-bold shadow-md backdrop-blur-md transition cursor-pointer active:scale-95"
          >
            {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span>{isSpeaking ? t.stopVoice : `${t.voiceReadout} (${language.toUpperCase()})`}</span>
          </button>
        </div>
      </div>

      {/* DOWNLOADABLE REPORT & WHATSAPP SHARE PANEL */}
      <ReportShareActions result={result} patient={patient} language={language} />

      {/* AMBULANCE 108 & NEARBY HOSPITALS CALL PANEL */}
      <NearbyHospitalsPanel
        language={language}
        locationStatus={locationStatus}
        coords={coords}
        hospitals={hospitals}
        hospitalsLoading={hospitalsLoading}
        hospitalsError={hospitalsError}
        onRequestLocation={onRequestLocation}
        onRefreshHospitals={onRefreshHospitals}
        onRevokeLocation={onRevokeLocation}
      />

      {/* Red Flags Alert Card if Detected */}
      {result.redFlagsDetected.length > 0 && (
        <div className="rounded-2xl border border-rose-500/50 bg-rose-950/40 p-5 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
            <AlertOctagon className="w-5 h-5 shrink-0" />
            <span>Escalation Red Flags Detected ({result.redFlagsDetected.length})</span>
          </div>
          <ul className="space-y-2 text-xs md:text-sm text-rose-200">
            {result.redFlagsDetected.map((rf, idx) => (
              <li key={idx} className="flex items-start gap-2 bg-rose-950/60 p-2.5 rounded-xl border border-rose-900/60">
                <span className="font-bold text-rose-400">•</span>
                <span>{rf}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Plain-Language Explanation */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-3">
        <h3 className="text-sm font-bold text-teal-400 uppercase tracking-wider flex items-center gap-2">
          <Info className="w-4 h-4" />
          <span>Why this result was reached (Plain Language)</span>
        </h3>
        <p className="text-sm md:text-base text-slate-200 leading-relaxed font-normal">
          {result.plainExplanation}
        </p>

        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-2">
            <strong>Cough Pattern:</strong>
            <span className="rounded-md bg-teal-950 border border-teal-800 px-2 py-0.5 text-teal-300 font-bold">
              {result.coughType}
            </span>
          </span>
          <span>
            Overall Model Confidence:{' '}
            <strong className="text-white font-mono tabular-nums">{result.confidence}%</strong>
          </span>
          <span className="font-mono text-slate-500 text-[11px]">
            Engine: {result.engineUsed} ({result.modelVersion})
          </span>
        </div>
      </div>

      {/* Top 3 Suspected Condition Probabilities */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-400" />
            <span>Top Suspected Respiratory Patterns</span>
          </h3>
          <span className="text-[11px] text-slate-400">Probabilistic match (Non-diagnostic)</span>
        </div>

        <div className="space-y-4">
          {top3Conditions.map((cond, idx) => (
            <div key={idx} className="rounded-xl bg-slate-950 p-4 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs md:text-sm font-bold">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-md bg-slate-800 text-[11px] text-teal-400 font-mono">
                    {idx + 1}
                  </span>
                  <span className="text-white">{cond.condition}</span>
                </div>
                <span
                  className={`font-mono tabular-nums text-xs font-bold ${
                    cond.tag === 'urgent'
                      ? 'text-rose-400'
                      : cond.tag === 'warning'
                      ? 'text-amber-300'
                      : 'text-emerald-400'
                  }`}
                >
                  {cond.probability}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    cond.tag === 'urgent'
                      ? 'bg-rose-500'
                      : cond.tag === 'warning'
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                  }`}
                  style={{ width: `${cond.probability}%` }}
                />
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">{cond.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Patient Key Biometrics Summary (Including Multi-Sensor Channels) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
        <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
          <span className="text-slate-500">Respiration Rate</span>
          <p className="text-lg font-bold text-white mt-0.5 font-mono tabular-nums">
            {result.features.breathingRate} bpm
          </p>
        </div>
        <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
          <span className="text-slate-500">Coughs in 60s</span>
          <p className="text-lg font-bold text-rose-400 mt-0.5 font-mono tabular-nums">
            {result.features.coughCount} ({result.features.coughRatePerHour}/hr)
          </p>
        </div>
        <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
          <span className="text-slate-500">I:E Ratio</span>
          <p className="text-lg font-bold text-sky-400 mt-0.5 font-mono tabular-nums">
            {result.features.inspirationExpirationRatio}
          </p>
        </div>
        <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
          <span className="text-slate-500">Spectral Centroid</span>
          <p className="text-lg font-bold text-amber-400 mt-0.5 font-mono tabular-nums">
            {result.features.spectralCentroid} Hz
          </p>
        </div>
        <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
          <span className="text-slate-500">DS18B20 Contact Temp</span>
          <p className="text-lg font-bold text-sky-300 mt-0.5 font-mono tabular-nums">
            {result.features.avgContactTempC !== null && result.features.avgContactTempC !== undefined
              ? `${result.features.avgContactTempC.toFixed(1)} °C`
              : 'Unavailable'}
          </p>
          <span className="text-[10px] text-slate-500 block">Skin temp only</span>
        </div>
        <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
          <span className="text-slate-500">MAX30102 PPG*</span>
          <p className="text-lg font-bold text-amber-300 mt-0.5 font-mono tabular-nums">
            {result.features.avgHeartRateBpm !== null && result.features.avgHeartRateBpm !== undefined
              ? `${result.features.avgHeartRateBpm}/${result.features.avgSpo2Pct ?? '--'}%`
              : 'Unavailable'}
          </p>
          <span className="text-[10px] text-slate-500 block">Experimental only</span>
        </div>
      </div>

      {/* USER FEEDBACK & SELF-IMPROVEMENT LOOP */}
      <div className="rounded-2xl border border-teal-500/30 bg-gradient-to-br from-slate-900 to-teal-950/30 p-6 md:p-8 shadow-xl space-y-5">
        <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-teal-400" />
            <h3 className="text-base font-bold text-white">{t.provideFeedback}</h3>
          </div>
          <span className="text-[11px] text-teal-400 font-mono">Gemini Few-Shot Loop</span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Help train and calibrate AuraPhragm! Your clinical feedback is stored locally and passed as few-shot calibration examples in future Gemini screenings.
        </p>

        {feedbackSaved ? (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-center text-emerald-200 text-xs font-semibold flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Thank you! Your feedback has been stored and added to the AI model calibration dataset.</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-slate-300 font-medium">Do you agree with this triage?</span>
              <button
                type="button"
                onClick={() => handleSaveFeedback('correct')}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-xs font-bold transition cursor-pointer active:scale-95"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>Agree (Correct)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSaveFeedback('wrong')}
                className="flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 text-xs font-bold transition cursor-pointer active:scale-95"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
                <span>Disagree (Wrong)</span>
              </button>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-xs font-semibold text-slate-300 block">
                {t.actualDoctorFinding} (Optional Clinical Audit)
              </label>
              <select
                value={doctorFinding}
                onChange={(e) => setDoctorFinding(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-teal-500"
              >
                <option value="">Select Doctor's Diagnosis...</option>
                {DOCTOR_FINDING_OPTIONS.map((opt, i) => (
                  <option key={i} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">Doctor / ASHA Notes</label>
              <textarea
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                rows={2}
                placeholder="E.g., Stethoscope auscultation revealed bilateral expiratory wheezing in lower lobes..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-teal-500"
              />
            </div>

            <button
              type="button"
              onClick={() => handleSaveFeedback(feedbackGiven || 'correct')}
              className="rounded-lg bg-teal-600 hover:bg-teal-500 text-white px-5 py-2.5 text-xs font-bold shadow-md transition cursor-pointer"
            >
              {t.saveFeedback}
            </button>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="button"
          onClick={onRetest}
          className="flex-1 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 py-3.5 text-sm font-black shadow-lg shadow-teal-500/20 transition active:scale-98 cursor-pointer"
        >
          Perform Another Test
        </button>
        <button
          type="button"
          onClick={() => onNavigate('ai')}
          className="rounded-xl border border-teal-500/40 bg-teal-950/40 hover:bg-teal-900/50 text-teal-300 px-5 py-3.5 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer whitespace-nowrap"
        >
          <Bot className="w-4 h-4" />
          <span>Ask AI Copilot</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('model')}
          className="rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 px-6 py-3.5 text-xs font-bold transition cursor-pointer whitespace-nowrap"
        >
          View Model Improvement
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 px-5 py-3.5 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer whitespace-nowrap"
        >
          <Printer className="w-4 h-4" />
          <span>Print / PDF</span>
        </button>
      </div>

      {/* Mandatory Safety Disclaimer Footer */}
      <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 text-xs text-rose-300 text-center leading-relaxed">
        <strong>SAFETY DISCLAIMER:</strong> {APP_CONFIG.disclaimer}
      </div>
    </div>
  );
};
