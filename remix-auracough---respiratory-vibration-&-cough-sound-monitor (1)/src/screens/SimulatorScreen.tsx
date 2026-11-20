import React, { useState } from 'react';
import { SupportedLanguage } from '../config/appConfig';
import { SimulationConfig, SimulationScenario, SensorPacket, SignalFeatures } from '../types';
import { SCENARIO_METADATA } from '../services/simulator';
import { LiveCanvasWaveform } from '../components/LiveCanvasWaveform';
import { SpectrogramInspector } from '../components/SpectrogramInspector';
import { audioSpeech } from '../services/audioSpeech';
import {
  Sliders,
  AlertTriangle,
  Play,
  Sparkles,
  Check,
  Volume2,
  Radio,
  ShieldAlert,
  Cpu,
} from 'lucide-react';

interface Props {
  language: SupportedLanguage;
  config: SimulationConfig;
  onChangeConfig: (newConfig: Partial<SimulationConfig>) => void;
  packet: SensorPacket | null;
  features: SignalFeatures;
  onStartTestWithScenario: () => void;
}

export const SimulatorScreen: React.FC<Props> = ({
  config,
  onChangeConfig,
  packet,
  features,
  onStartTestWithScenario,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<
    'all' | 'Cough Acoustic Variants' | 'Abnormal Breathing Wavelengths'
  >('all');
  const [activeTabVisual, setActiveTabVisual] = useState<'waveforms' | 'spectrogram'>('waveforms');
  const [playingScenario, setPlayingScenario] = useState<string | null>(null);

  const allScenarios: SimulationScenario[] = [
    'whooping',
    'barking_croup',
    'wheeze',
    'stridor',
    'crackles_rales',
    'dry_cough',
    'wet_cough',
    'spasmodic',
    'cheyne_stokes',
    'kussmaul',
    'fast_shallow',
    'chronic_bouts',
    'normal',
    'loose_belt_noisy',
  ];

  const filteredScenarios = allScenarios.filter((sc) => {
    if (selectedCategory === 'all') return true;
    return SCENARIO_METADATA[sc].category === selectedCategory;
  });

  const currentMeta = SCENARIO_METADATA[config.scenario];

  const handlePlaySound = (sc: SimulationScenario, e: React.MouseEvent) => {
    e.stopPropagation();
    setPlayingScenario(sc);
    audioSpeech.playScenarioAcousticSound(sc);
    setTimeout(() => setPlayingScenario(null), 1500);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Simulation Mandatory Notice Banner */}
      <div className="rounded-xl border border-amber-500/40 bg-amber-950/35 p-4 flex items-start gap-3 text-amber-200 text-xs">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-amber-300 uppercase tracking-wide block font-bold">
            AuraPhragm Multi-Sensor AP2 Synthesis Bench
          </strong>
          <span>
            Simulates dual-rate 50 Hz MPU6050 chest-wall motion + 16 kHz INMP441 digital audio spectral bands + experimental MAX30102 PPG + DS18B20 contact temperature. Toggle individual hardware availability below to inspect AP2 fault/disabled handling (including Piezo GPIO34 safety isolation).
          </span>
        </div>
      </div>

      {/* Scenario Selector Header with Filter Categories */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Select Respiratory Wavelength or Cough Variant ({filteredScenarios.length} Models)
            </h3>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
            {[
              { id: 'all', label: 'All (14)' },
              { id: 'Cough Acoustic Variants', label: 'Coughs' },
              { id: 'Abnormal Breathing Wavelengths', label: 'Breathing Waves' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer text-[11px] whitespace-nowrap ${
                  selectedCategory === cat.id ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid of Scenario Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredScenarios.map((sc) => {
            const meta = SCENARIO_METADATA[sc];
            const isSelected = config.scenario === sc;
            const isPlayingThis = playingScenario === sc;

            return (
              <div
                key={sc}
                onClick={() => onChangeConfig({ scenario: sc })}
                className={`rounded-xl p-4 border transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-teal-500 bg-teal-950/40 shadow-lg shadow-teal-950/50 ring-1 ring-teal-500/70'
                    : 'border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-950'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-white leading-snug">{meta.name}</h4>
                    {isSelected ? (
                      <span className="rounded-md bg-teal-500 text-slate-950 p-1 shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handlePlaySound(sc, e)}
                        className={`rounded-lg p-1.5 transition cursor-pointer ${
                          isPlayingThis
                            ? 'bg-teal-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400 hover:text-teal-300'
                        }`}
                        title="Play synthetic acoustic audio"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{meta.description}</p>

                  <div className="mt-3 rounded-lg bg-slate-900/90 p-2.5 border border-slate-800/80 space-y-1 text-[11px]">
                    <div className="flex justify-between text-slate-400">
                      <span>Wavelength:</span>
                      <span className="text-slate-200 font-medium text-right max-w-[170px] truncate">
                        {meta.waveType}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>INMP441 Band:</span>
                      <span className="text-amber-300 font-mono font-semibold tabular-nums">
                        {meta.acousticFrequencyRange}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="font-mono text-slate-400 tabular-nums">{meta.expectedBpm} bpm cadence</span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => handlePlaySound(sc, e)}
                      className="rounded-md bg-slate-900 hover:bg-slate-800 p-1 text-slate-400 hover:text-teal-400 transition cursor-pointer"
                      title="Listen to acoustic sound simulation"
                    >
                      <Volume2 className={`w-3.5 h-3.5 ${isPlayingThis ? 'text-teal-400' : ''}`} />
                    </button>

                    <span
                      className={`font-mono font-bold text-[10px] uppercase ${
                        meta.typicalTriage === 'MEDICAL_HELP_NEEDED'
                          ? 'text-rose-400'
                          : meta.typicalTriage === 'MONITOR_RETEST'
                          ? 'text-amber-300'
                          : 'text-emerald-400'
                      }`}
                    >
                      {meta.typicalTriage === 'MEDICAL_HELP_NEEDED'
                        ? 'HELP NEEDED'
                        : meta.typicalTriage === 'MONITOR_RETEST'
                        ? 'MONITOR'
                        : 'NORMAL'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Physics & Environmental Biomechanical Controls */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Sliders className="w-4 h-4 text-teal-400" />
          <span>Biomechanical &amp; Environmental Tuning</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Severity */}
          <div className="space-y-2">
            <label className="font-bold text-slate-300">Severity</label>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-950 p-1 border border-slate-800">
              {(['mild', 'moderate', 'severe'] as const).map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => onChangeConfig({ severity: sev })}
                  className={`py-1.5 rounded-lg font-semibold capitalize transition cursor-pointer ${
                    config.severity === sev ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          {/* Belt Tightness */}
          <div className="space-y-2">
            <label className="font-bold text-slate-300">Belt Tension</label>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-950 p-1 border border-slate-800">
              {(['loose', 'optimal', 'tight'] as const).map((tight) => (
                <button
                  key={tight}
                  type="button"
                  onClick={() => onChangeConfig({ beltTightness: tight })}
                  className={`py-1.5 rounded-lg font-semibold capitalize transition cursor-pointer ${
                    config.beltTightness === tight ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tight}
                </button>
              ))}
            </div>
          </div>

          {/* Motion Artifact */}
          <div className="space-y-2">
            <label className="font-bold text-slate-300">Motion Artifact</label>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-950 p-1 border border-slate-800">
              {(['still', 'talking', 'walking'] as const).map((mot) => (
                <button
                  key={mot}
                  type="button"
                  onClick={() => onChangeConfig({ motionArtifact: mot })}
                  className={`py-1.5 rounded-lg font-semibold capitalize transition cursor-pointer ${
                    config.motionArtifact === mot ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {mot}
                </button>
              ))}
            </div>
          </div>

          {/* Breathing Rate Multiplier */}
          <div className="space-y-2">
            <div className="flex justify-between font-bold text-slate-300">
              <span>Cadence Multiplier</span>
              <span className="text-teal-400 font-mono tabular-nums">{config.rateMultiplier.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="1.5"
              step="0.05"
              value={config.rateMultiplier}
              onChange={(e) => onChangeConfig({ rateMultiplier: parseFloat(e.target.value) })}
              className="w-full accent-teal-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-800">
          {/* Noise Level Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-slate-300">
              <span>Acoustic &amp; Vibration Noise Floor</span>
              <span className="text-amber-400 font-mono tabular-nums">{config.noiseLevel}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={config.noiseLevel}
              onChange={(e) => onChangeConfig({ noiseLevel: parseInt(e.target.value, 10) })}
              className="w-full accent-amber-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* DS18B20 Simulated Contact Temp Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-slate-300">
              <span>DS18B20 Simulated Skin/Contact Temp</span>
              <span className="text-sky-300 font-mono tabular-nums">{config.contactTempC.toFixed(1)} °C</span>
            </div>
            <input
              type="range"
              min="32.0"
              max="39.5"
              step="0.1"
              value={config.contactTempC}
              onChange={(e) => onChangeConfig({ contactTempC: parseFloat(e.target.value) })}
              className="w-full accent-sky-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Hardware Channel Availability & Safety Flags Simulation */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
            <Cpu className="w-4 h-4 text-teal-400" />
            <span>AP2 Hardware Channel &amp; Safety Flag Toggles</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <label className="flex items-center justify-between rounded-xl bg-slate-950 border border-slate-800 p-3 cursor-pointer">
              <div>
                <span className="font-bold text-white block">INMP441 16 kHz I2S</span>
                <span className="text-[10px] text-slate-500">Digital Microphone</span>
              </div>
              <input
                type="checkbox"
                checked={config.enableInmp441}
                onChange={(e) => onChangeConfig({ enableInmp441: e.target.checked })}
                className="h-4 w-4 accent-teal-500"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl bg-slate-950 border border-slate-800 p-3 cursor-pointer">
              <div>
                <span className="font-bold text-amber-300 block">MAX30102 PPG*</span>
                <span className="text-[10px] text-slate-500">Experimental HR / SpO2</span>
              </div>
              <input
                type="checkbox"
                checked={config.enableMax30102}
                onChange={(e) => onChangeConfig({ enableMax30102: e.target.checked })}
                className="h-4 w-4 accent-amber-400"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl bg-slate-950 border border-slate-800 p-3 cursor-pointer">
              <div>
                <span className="font-bold text-sky-300 block">DS18B20 Probe</span>
                <span className="text-[10px] text-slate-500">Skin/Contact Temp Only</span>
              </div>
              <input
                type="checkbox"
                checked={config.enableDs18b20}
                onChange={(e) => onChangeConfig({ enableDs18b20: e.target.checked })}
                className="h-4 w-4 accent-sky-400"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl bg-slate-950 border border-amber-500/35 p-3 cursor-pointer">
              <div>
                <span className="font-bold text-amber-300 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Piezo AFE (GPIO34)
                </span>
                <span className="text-[10px] text-slate-500">Off by default until 3.3V AFE tested</span>
              </div>
              <input
                type="checkbox"
                checked={config.enablePiezoAfe}
                onChange={(e) => onChangeConfig({ enablePiezoAfe: e.target.checked })}
                className="h-4 w-4 accent-amber-500"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Real-time Spectrogram & Waveform Laboratory */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-teal-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Live Synthesis Lab: "{currentMeta.name}"
            </h4>
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-slate-900 p-1 border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTabVisual('waveforms')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer text-[11px] whitespace-nowrap ${
                activeTabVisual === 'waveforms' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              4-Channel Waveforms
            </button>
            <button
              type="button"
              onClick={() => setActiveTabVisual('spectrogram')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer text-[11px] whitespace-nowrap ${
                activeTabVisual === 'spectrogram' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              INMP441 Spectrogram &amp; Signal Lab
            </button>
          </div>
        </div>

        {activeTabVisual === 'waveforms' ? (
          <LiveCanvasWaveform packet={packet} features={features} showAll={true} />
        ) : (
          <SpectrogramInspector packet={packet} features={features} />
        )}
      </div>

      {/* Launch formal test button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <div className="text-xs text-slate-400">
          Selected for test: <strong className="text-teal-300">{currentMeta.groundTruthDiagnosis}</strong>
        </div>

        <button
          type="button"
          onClick={onStartTestWithScenario}
          className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 px-8 py-4 text-sm font-black shadow-xl shadow-teal-500/20 transition active:scale-98 cursor-pointer whitespace-nowrap"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>Launch 60s Guided Test With "{currentMeta.name}"</span>
        </button>
      </div>
    </div>
  );
};
