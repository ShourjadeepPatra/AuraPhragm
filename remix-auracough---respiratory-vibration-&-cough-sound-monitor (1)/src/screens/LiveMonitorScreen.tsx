import React, { useState } from 'react';
import { SupportedLanguage } from '../config/appConfig';
import { TRANSLATIONS } from '../i18n/translations';
import { SensorPacket, SignalFeatures } from '../types';
import { LiveCanvasWaveform } from '../components/LiveCanvasWaveform';
import { SpectrogramInspector } from '../components/SpectrogramInspector';
import { audioSpeech } from '../services/audioSpeech';
import {
  Volume2,
  VolumeX,
  Play,
  Square,
  AlertCircle,
  Heart,
  Activity,
  Waves,
  Sliders,
  Thermometer,
  Mic,
  HeartPulse,
  ShieldAlert,
} from 'lucide-react';

interface Props {
  language: SupportedLanguage;
  packet: SensorPacket | null;
  features: SignalFeatures;
  isPaused: boolean;
  onTogglePause: () => void;
  onStartTest: () => void;
  onNavigate: (tab: string) => void;
}

export const LiveMonitorScreen: React.FC<Props> = ({
  language,
  packet,
  features,
  isPaused,
  onTogglePause,
  onStartTest,
  onNavigate,
}) => {
  const [audioFeedbackEnabled, setAudioFeedbackEnabled] = useState(false);
  const [monitorView, setMonitorView] = useState<'waveforms' | 'spectrogram'>('waveforms');
  const t = TRANSLATIONS[language];

  const toggleAudio = () => {
    const next = !audioFeedbackEnabled;
    setAudioFeedbackEnabled(next);
    if (next) {
      audioSpeech.playBeep(520, 80);
    }
  };

  const sensorStatus = packet?.sensorStatus || features.activeSensors;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Simulation Warning Badge if Simulated */}
      {packet?.isSimulated && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-950/35 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold uppercase tracking-wider">{t.simulatedDataWarning}</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('simulator')}
            className="rounded-lg bg-amber-500/20 hover:bg-amber-500/30 px-2.5 py-1 text-[11px] font-bold text-amber-300 transition cursor-pointer whitespace-nowrap shrink-0"
          >
            Configure Scenario
          </button>
        </div>
      )}

      {/* Primary Biometrics Header Grid (4 KPIs) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Respiration Rate */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{t.breathingRate}</span>
            <Heart className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-white font-mono tabular-nums">
              {features.breathingRate}
            </span>
            <span className="text-xs font-mono text-slate-400">bpm</span>
          </div>
          <p className="mt-1 text-[11px] text-teal-300 font-medium">
            {features.breathingRate > 30
              ? 'Tachypnea Flag'
              : features.breathingRate < 10
              ? 'Bradypnea'
              : 'Normal Cadence'}
          </p>
        </div>

        {/* Cough Counter */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{t.coughCount}</span>
            <Activity className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-rose-400 font-mono tabular-nums">
              {features.coughCount}
            </span>
            <span className="text-xs font-mono text-slate-400">bursts</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 font-mono tabular-nums">
            Est. {features.coughRatePerHour}/hr
          </p>
        </div>

        {/* Inspiration/Expiration Ratio */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>I:E RATIO</span>
            <Waves className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-sky-300 font-mono tabular-nums">
              {features.inspirationExpirationRatio}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {parseFloat(features.inspirationExpirationRatio.split(':')[1] || '2') > 2.5
              ? 'Prolonged Expiration'
              : 'Balanced Phase'}
          </p>
        </div>

        {/* Signal Quality Index */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{t.signalQuality}</span>
            <span
              className={`w-2.5 h-2.5 rounded-xs ${
                features.signalQuality.status === 'good'
                  ? 'bg-emerald-400'
                  : features.signalQuality.status === 'fair'
                  ? 'bg-amber-400'
                  : 'bg-rose-500'
              }`}
            />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-white font-mono tabular-nums">
              {features.signalQuality.score}%
            </span>
            <span className="text-xs font-bold uppercase text-slate-300">
              {features.signalQuality.status}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 truncate">
            {features.signalQuality.advice}
          </p>
        </div>
      </div>

      {/* Multi-Sensor Auxiliary Telemetry Panel */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-4 space-y-3">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 uppercase tracking-wider">
          <span>Multi-Sensor Auxiliary Channels (AP2 Telemetry)</span>
          <span>Seq: #{packet?.sequence ?? 0}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* DS18B20 Skin/Contact Temp */}
          <div className="rounded-xl bg-slate-950 border border-slate-800 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5 font-semibold">
                <Thermometer className="w-3.5 h-3.5 text-sky-400" />
                <span>{t.contactTemp}</span>
              </span>
              <span className="font-mono text-[10px] text-slate-500">DS18B20</span>
            </div>
            <p className="text-lg font-bold text-white font-mono tabular-nums">
              {sensorStatus.ds18b20 === 'ok' && features.avgContactTempC !== null
                ? `${features.avgContactTempC.toFixed(1)} °C`
                : t.sensorUnavailable}
            </p>
            <p className="text-[10px] text-slate-500">Skin/contact temp only (not core temp)</p>
          </div>

          {/* MAX30102 Experimental PPG */}
          <div className="rounded-xl bg-slate-950 border border-slate-800 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5 font-semibold">
                <HeartPulse className="w-3.5 h-3.5 text-amber-400" />
                <span>{t.experimentalPpg}</span>
              </span>
              <span className="font-mono text-[10px] text-amber-400">MAX30102*</span>
            </div>
            <p className="text-lg font-bold text-amber-300 font-mono tabular-nums">
              {sensorStatus.max30102 === 'ok' && features.avgHeartRateBpm !== null
                ? `${features.avgHeartRateBpm} bpm / ${features.avgSpo2Pct ?? '--'}%`
                : t.sensorUnavailable}
            </p>
            <p className="text-[10px] text-slate-500">Experimental uncalibrated optical reading</p>
          </div>

          {/* INMP441 16 kHz Digital Audio */}
          <div className="rounded-xl bg-slate-950 border border-slate-800 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5 font-semibold">
                <Mic className="w-3.5 h-3.5 text-teal-400" />
                <span>{t.audioEnergy}</span>
              </span>
              <span className="font-mono text-[10px] text-teal-400">INMP441 16kHz</span>
            </div>
            <p className="text-lg font-bold text-white font-mono tabular-nums">
              {sensorStatus.inmp441 === 'ok' && packet
                ? `${packet.audioRms.toFixed(1)} RMS`
                : t.sensorUnavailable}
            </p>
            <p className="text-[10px] text-slate-500 font-mono tabular-nums">
              Peak {packet ? packet.audioPeak.toFixed(1) : '0.0'} • Centroid {features.spectralCentroid} Hz
            </p>
          </div>

          {/* Piezo GPIO34 Safety State */}
          <div className="rounded-xl bg-slate-950 border border-slate-800 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5 font-semibold">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>Piezo ADC (GPIO34)</span>
              </span>
              <span className="font-mono text-[10px] text-slate-500">ADC1_CH6</span>
            </div>
            <p
              className={`text-sm font-bold font-mono tabular-nums pt-0.5 ${
                sensorStatus.piezo === 'ok' && packet !== null && packet.piezo !== null
                  ? 'text-emerald-400'
                  : 'text-amber-300'
              }`}
            >
              {sensorStatus.piezo === 'ok' && packet !== null && packet.piezo !== null
                ? `${packet.piezo} ADC (AFE OK)`
                : t.piezoSafetyDisabled}
            </p>
            <p className="text-[10px] text-slate-500">Requires 0–3.3V verified clamp AFE</p>
          </div>
        </div>
      </div>

      {/* View Switcher: Live Waveforms vs Spectrogram & Acoustic Lab */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Telemetry Visualizer
        </span>
        <div className="flex items-center gap-1 rounded-xl bg-slate-900 p-1 border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setMonitorView('waveforms')}
            className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer text-[11px] whitespace-nowrap ${
              monitorView === 'waveforms' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            4-Channel Waveforms
          </button>
          <button
            type="button"
            onClick={() => setMonitorView('spectrogram')}
            className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer text-[11px] whitespace-nowrap ${
              monitorView === 'spectrogram' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            INMP441 Spectrogram &amp; Frequency Lab
          </button>
        </div>
      </div>

      {/* Main High-Performance Waveform Canvas or Spectrogram Inspector */}
      {monitorView === 'waveforms' ? (
        <LiveCanvasWaveform packet={isPaused ? null : packet} features={features} showAll={true} />
      ) : (
        <SpectrogramInspector packet={isPaused ? null : packet} features={features} />
      )}

      {/* Action Bar (Audio Tone, Pause, Start 60s Test) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTogglePause}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              isPaused
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Square className="w-4 h-4 fill-current" />}
            <span>{isPaused ? 'Resume Stream' : 'Freeze Stream'}</span>
          </button>

          <button
            type="button"
            onClick={toggleAudio}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              audioFeedbackEnabled
                ? 'border-teal-500 bg-teal-950/60 text-teal-300'
                : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            {audioFeedbackEnabled ? <Volume2 className="w-4 h-4 text-teal-400" /> : <VolumeX className="w-4 h-4" />}
            <span>{audioFeedbackEnabled ? 'Audio Pacer ON' : 'Audio Tone OFF'}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onStartTest}
          className="flex items-center gap-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 px-6 py-2.5 text-xs font-black shadow-lg shadow-teal-500/20 transition active:scale-95 cursor-pointer ml-auto whitespace-nowrap"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{t.startTest}</span>
        </button>
      </div>

      {/* Detailed Technical Extraction Panel */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-teal-400" />
          <span>Extracted Feature Vector (Fed into Gemini 4 Hydrogen &amp; On-Device Engine)</span>
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
            <span className="text-slate-500">Spectral Centroid</span>
            <p className="text-base font-bold text-white mt-0.5 font-mono tabular-nums">
              {features.spectralCentroid} Hz
            </p>
          </div>
          <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
            <span className="text-slate-500">Dominant Frequency</span>
            <p className="text-base font-bold text-white mt-0.5 font-mono tabular-nums">
              {features.dominantFrequency} Hz
            </p>
          </div>
          <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
            <span className="text-slate-500">Zero Crossing Rate</span>
            <p className="text-base font-bold text-white mt-0.5 font-mono tabular-nums">
              {features.zeroCrossingRate}
            </p>
          </div>
          <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
            <span className="text-slate-500">Breath Depth</span>
            <p className="text-base font-bold text-white mt-0.5 font-mono tabular-nums">
              {features.breathDepth} ({features.breathAmplitudeMm} mm)
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono tabular-nums">
          <span className="text-slate-400">
            INMP441 Bands: Low={features.bandEnergies.low} | Mid={features.bandEnergies.mid} | High=
            {features.bandEnergies.high}
          </span>
          <span className="text-teal-400">
            Buffer: {features.sampleCount} samples @ 50Hz • Peak Audio: {features.audioPeakEnergy}
          </span>
        </div>
      </div>
    </div>
  );
};
