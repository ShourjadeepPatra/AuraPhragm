import React, { useState, useEffect, useRef } from 'react';
import { SupportedLanguage } from '../config/appConfig';
import { TRANSLATIONS } from '../i18n/translations';
import { AnalysisResult, PatientProfile, SensorPacket, SignalFeatures, SymptomQuestionnaire } from '../types';
import { analyzeRespiratoryRecording } from '../services/geminiService';
import { getAllFeedbackRecords, saveTestResult } from '../services/storage';
import { audioSpeech } from '../services/audioSpeech';
import { EmergencyBanner } from '../components/EmergencyBanner';
import { Square, CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';

interface Props {
  language: SupportedLanguage;
  currentPatient: PatientProfile;
  packet: SensorPacket | null;
  features: SignalFeatures;
  isSimulated: boolean;
  groundTruthLabel?: string;
  hospitals?: import('../types').NearbyHospital[];
  locationStatus?: import('../types').LocationPermissionStatus;
  onRequestLocation?: () => void;
  onFinishTest: (result: AnalysisResult) => void;
  onCancel: () => void;
}

export const TestFlowScreen: React.FC<Props> = ({
  language,
  currentPatient,
  packet,
  features,
  isSimulated,
  groundTruthLabel,
  hospitals = [],
  locationStatus = 'idle',
  onRequestLocation,
  onFinishTest,
  onCancel,
}) => {
  const [step, setStep] = useState<'checklist' | 'countdown' | 'analyzing'>('checklist');
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [isTestActive, setIsTestActive] = useState(false);

  // Symptoms checklist state
  const [symptoms, setSymptoms] = useState<SymptomQuestionnaire>({
    fever: false,
    coughDuration: '<1_week',
    bloodInSputum: false,
    severeBreathlessness: false,
    blueLips: false,
    weightLoss: false,
    smokingHistory: false,
    tbContact: false,
  });

  const t = TRANSLATIONS[language];
  const timerRef = useRef<any>(null);
  const sensorStatus = packet?.sensorStatus || features.activeSensors;

  // Critical Emergency Flags Check
  const hasEmergency = symptoms.bloodInSputum || symptoms.blueLips || symptoms.severeBreathlessness;

  // Countdown timer logic
  useEffect(() => {
    if (step === 'countdown' && isTestActive) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            finishAndAnalyze();
            return 0;
          }
          if (prev % 4 === 0) {
            audioSpeech.playBeep(480, 70);
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step, isTestActive]);

  const startCountdown = () => {
    setSecondsLeft(60);
    setStep('countdown');
    setIsTestActive(true);
    audioSpeech.playBeep(600, 150);
  };

  const finishAndAnalyze = async () => {
    setIsTestActive(false);
    setStep('analyzing');
    audioSpeech.playBeep(700, 200);

    try {
      const feedbackRecords = await getAllFeedbackRecords();
      const result = await analyzeRespiratoryRecording(
        features,
        symptoms,
        isSimulated,
        groundTruthLabel,
        feedbackRecords,
        language
      );
      result.patientId = currentPatient.id;

      await saveTestResult(result);
      onFinishTest(result);
    } catch (err) {
      console.error('Test analysis failed:', err);
      onCancel();
    }
  };

  const handleStop = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsTestActive(false);
    onCancel();
  };

  const pacerCycle = (60 - secondsLeft) % 4;
  const isPacerInhale = pacerCycle < 2;

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      {/* Emergency Alert Banner if Emergency Symptoms Selected */}
      {hasEmergency && (
        <EmergencyBanner
          language={language}
          reason="Critical danger signs selected (blood in sputum, cyanosis, or acute breathlessness). Seek urgent clinical help immediately."
          hospitals={hospitals}
          locationStatus={locationStatus}
          onRequestLocation={onRequestLocation}
        />
      )}

      {/* Step 1: Symptoms Checklist & Pre-Test Posture */}
      {step === 'checklist' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 md:p-8 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <span className="text-xs font-mono font-bold text-teal-400 uppercase tracking-wider">
              Step 1 of 2 • AuraPhragm Protocol
            </span>
            <h2 className="text-2xl font-black text-white tracking-tight mt-1 font-display">
              {t.symptomsTitle}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select any reported symptoms to contextualize multi-sensor screening and detect critical red flags.
            </p>
          </div>

          {/* Multi-Sensor Channel Check */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
            <span className="text-slate-400">Active Channels:</span>
            <div className="flex flex-wrap gap-3">
              <span className={sensorStatus.mpu6050 === 'ok' ? 'text-emerald-400' : 'text-amber-400'}>
                MPU6050: {sensorStatus.mpu6050.toUpperCase()}
              </span>
              <span className={sensorStatus.inmp441 === 'ok' ? 'text-emerald-400' : 'text-slate-500'}>
                INMP441: {sensorStatus.inmp441.toUpperCase()}
              </span>
              <span className={sensorStatus.ds18b20 === 'ok' ? 'text-sky-300' : 'text-slate-500'}>
                DS18B20: {sensorStatus.ds18b20.toUpperCase()}
              </span>
              <span className={sensorStatus.max30102 === 'ok' ? 'text-amber-300' : 'text-slate-500'}>
                MAX30102*: {sensorStatus.max30102.toUpperCase()}
              </span>
              <span className="text-slate-400">
                PIEZO: {sensorStatus.piezo === 'ok' ? 'AFE OK' : 'ISOLATED'}
              </span>
            </div>
          </div>

          {/* Posture & Belt Instructions */}
          <div className="rounded-xl border border-teal-500/30 bg-teal-950/20 p-4 space-y-2 text-xs md:text-sm text-teal-200">
            <div className="flex items-center gap-2 font-bold text-teal-300">
              <CheckCircle2 className="w-4 h-4 text-teal-400" />
              <span>Pre-Test Belt &amp; Posture Guide</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>{t.sitUpright}</li>
              <li>{t.keepBeltSnug}</li>
              <li>{t.breatheNormally}</li>
            </ul>
          </div>

          {/* Interactive Symptoms Form */}
          <div className="space-y-3">
            {/* Cough Duration */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <label className="text-xs font-bold text-slate-300 block mb-2">{t.coughDuration}</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: '<1_week', label: '< 1 Week' },
                  { id: '1_to_3_weeks', label: '1 to 3 Weeks' },
                  { id: '>3_weeks', label: '> 3 Weeks (TB Risk!)' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSymptoms({ ...symptoms, coughDuration: opt.id as any })}
                    className={`rounded-lg py-2 px-3 text-xs font-semibold transition cursor-pointer border ${
                      symptoms.coughDuration === opt.id
                        ? opt.id === '>3_weeks'
                          ? 'bg-rose-600 border-rose-500 text-white'
                          : 'bg-teal-600 border-teal-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Checklist Checkboxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: 'fever', label: t.fever, critical: false },
                { key: 'bloodInSputum', label: t.bloodInSputum, critical: true },
                { key: 'severeBreathlessness', label: t.severeBreathlessness, critical: true },
                { key: 'blueLips', label: t.blueLips, critical: true },
                { key: 'weightLoss', label: t.weightLoss, critical: false },
                { key: 'smokingHistory', label: t.smoking, critical: false },
                { key: 'tbContact', label: t.tbContact, critical: false },
              ].map(({ key, label, critical }) => {
                const checked = (symptoms as any)[key];
                return (
                  <label
                    key={key}
                    className={`flex items-start gap-3 rounded-xl border p-3.5 transition cursor-pointer select-none ${
                      checked
                        ? critical
                          ? 'border-rose-500 bg-rose-950/40 text-rose-200'
                          : 'border-teal-500 bg-teal-950/40 text-teal-200'
                        : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => setSymptoms({ ...symptoms, [key]: e.target.checked })}
                      className="mt-0.5 rounded-sm border-slate-700 text-teal-500 focus:ring-teal-400 h-4 w-4"
                    />
                    <div className="text-xs font-medium leading-snug">
                      <span>{label}</span>
                      {critical && (
                        <span className="block text-[10px] font-bold text-rose-400 uppercase mt-0.5">
                          Red Flag Indicator
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={startCountdown}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black py-4 text-base shadow-xl shadow-teal-500/20 transition active:scale-98 cursor-pointer"
            >
              <span>Begin 60-Second Test</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-6 py-4 text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Step 2: 60-Second Guided Test Countdown */}
      {step === 'countdown' && (
        <div className="rounded-2xl border border-teal-500/30 bg-slate-900 p-6 md:p-10 shadow-2xl space-y-8 text-center">
          <div className="space-y-1">
            <span className="text-xs font-mono font-bold text-teal-400 uppercase tracking-wider">
              Test In Progress
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-white font-display">{t.breatheNormally}</h2>
            <p className="text-xs text-slate-400">Keep hands resting on knees. Do not speak unless coughing.</p>
          </div>

          {/* Visual Breathing Pacer Circle */}
          <div className="relative w-52 h-52 mx-auto flex items-center justify-center">
            <div
              className={`absolute inset-0 rounded-full transition-all duration-1000 ease-in-out ${
                isPacerInhale
                  ? 'bg-teal-500/20 scale-110 border-2 border-teal-400/50'
                  : 'bg-teal-900/10 scale-90 border border-teal-500/20'
              }`}
            />
            <div
              className={`w-36 h-36 rounded-full flex flex-col items-center justify-center transition-all duration-1000 ease-in-out shadow-2xl ${
                isPacerInhale ? 'bg-teal-500 text-slate-950 scale-105' : 'bg-slate-800 text-teal-300 scale-95'
              }`}
            >
              <span className="text-4xl font-black font-mono tabular-nums">{secondsLeft}</span>
              <span className="text-[11px] font-bold uppercase tracking-wider mt-0.5">
                {isPacerInhale ? 'Inhale...' : 'Exhale...'}
              </span>
            </div>
          </div>

          {/* Live mini metrics during test */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto text-xs">
            <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
              <span className="text-slate-500 block">Rate</span>
              <span className="text-xl font-bold text-white mt-1 block font-mono tabular-nums">
                {features.breathingRate} bpm
              </span>
            </div>
            <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
              <span className="text-slate-500 block">Coughs</span>
              <span className="text-xl font-bold text-rose-400 mt-1 block font-mono tabular-nums">
                {features.coughCount}
              </span>
            </div>
            <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
              <span className="text-slate-500 block">Contact Temp</span>
              <span className="text-xl font-bold text-sky-300 mt-1 block font-mono tabular-nums">
                {features.avgContactTempC !== null ? `${features.avgContactTempC.toFixed(1)}°C` : 'NA'}
              </span>
            </div>
            <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
              <span className="text-slate-500 block">Signal</span>
              <span className="text-xl font-bold text-emerald-400 mt-1 block font-mono tabular-nums">
                {features.signalQuality.score}%
              </span>
            </div>
          </div>

          {/* Abort button */}
          <button
            type="button"
            onClick={handleStop}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 px-5 py-2.5 text-xs font-bold transition cursor-pointer"
          >
            <Square className="w-4 h-4 fill-current" />
            <span>{t.stopTest}</span>
          </button>
        </div>
      )}

      {/* Step 3: Analysis Pipeline Running */}
      {step === 'analyzing' && (
        <div className="rounded-2xl border border-teal-500/30 bg-slate-900 p-10 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center mx-auto animate-spin">
            <Sparkles className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Analyzing Multi-Sensor Respiratory Features...</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Running digital FFT, spectral band decomposition, multi-sensor telemetry fusion, and Gemini 4 Hydrogen triage analysis with few-shot adaptation.
            </p>
          </div>
          <div className="w-48 h-1.5 bg-slate-800 rounded-full mx-auto overflow-hidden">
            <div className="w-2/3 h-full bg-teal-400" />
          </div>
        </div>
      )}
    </div>
  );
};
