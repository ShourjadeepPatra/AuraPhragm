import React, { useState, useEffect } from 'react';
import { SupportedLanguage } from '../config/appConfig';
import { CalibrationProfile, PatientProfile, SensorPacket } from '../types';
import { saveCalibrationProfile } from '../services/storage';
import { audioSpeech } from '../services/audioSpeech';
import { CheckCircle2, ArrowRight, Activity, ShieldAlert } from 'lucide-react';

interface Props {
  language: SupportedLanguage;
  currentPatient: PatientProfile;
  packet: SensorPacket | null;
  onCalibrationSaved: () => void;
}

export const CalibrationWizardScreen: React.FC<Props> = ({
  currentPatient,
  packet,
  onCalibrationSaved,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [countdown, setCountdown] = useState(10);
  const [baselineSamples, setBaselineSamples] = useState<number[]>([]);
  const [audioNoiseSamples, setAudioNoiseSamples] = useState<number[]>([]);
  const [isRecordingBaseline, setIsRecordingBaseline] = useState(false);
  const [calibrationProfile, setCalibrationProfile] = useState<CalibrationProfile>({
    baselineRestingZ: 0.98,
    gainZ: 1.0,
    audioNoiseFloor: 14,
    piezoNoiseFloor: null,
    beltTightnessThreshold: 60,
    lastCalibrated: new Date().toISOString(),
  });

  const liveTightness = packet ? Math.min(100, Math.max(10, Math.round(packet.az * 70))) : 75;
  const piezoActive = Boolean(packet && packet.sensorStatus.piezo === 'ok' && packet.piezo !== null);

  useEffect(() => {
    let timer: any;
    if (isRecordingBaseline && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((c) => c - 1);
        if (packet) {
          setBaselineSamples((prev) => [...prev, packet.az]);
          if (packet.sensorStatus.inmp441 === 'ok') {
            setAudioNoiseSamples((prev) => [...prev, packet.audioRms]);
          }
        }
      }, 1000);
    } else if (isRecordingBaseline && countdown === 0) {
      setIsRecordingBaseline(false);
      const avgZ =
        baselineSamples.length > 0
          ? baselineSamples.reduce((a, b) => a + b, 0) / baselineSamples.length
          : 0.98;
      const avgAudioFloor =
        audioNoiseSamples.length > 0
          ? Math.max(8, Math.round((audioNoiseSamples.reduce((a, b) => a + b, 0) / audioNoiseSamples.length) * 1.25))
          : 14;

      setCalibrationProfile((prev) => ({
        ...prev,
        baselineRestingZ: parseFloat(avgZ.toFixed(3)),
        audioNoiseFloor: avgAudioFloor,
        piezoNoiseFloor: piezoActive ? 25 : null,
        lastCalibrated: new Date().toISOString(),
      }));
      audioSpeech.playBeep(750, 150);
      setStep(3);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRecordingBaseline, countdown, packet, baselineSamples, audioNoiseSamples, piezoActive]);

  const startBaselineRecording = () => {
    setCountdown(10);
    setBaselineSamples([]);
    setAudioNoiseSamples([]);
    setIsRecordingBaseline(true);
    audioSpeech.playBeep(520, 100);
  };

  const handleSave = async () => {
    await saveCalibrationProfile(calibrationProfile, currentPatient.id);
    audioSpeech.playBeep(880, 200);
    setStep(4);
    setTimeout(() => {
      onCalibrationSaved();
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-16">
      <div className="border-b border-slate-800 pb-4">
        <span className="text-xs font-mono font-bold text-teal-400 uppercase tracking-wider">
          Calibration Wizard • AuraPhragm Belt
        </span>
        <h2 className="text-2xl font-black text-white tracking-tight mt-1 font-display">
          Chest Belt &amp; Multi-Sensor Fitment Tuning
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Tune resting MPU6050 baseline and INMP441 acoustic noise floor for {currentPatient.name}.
        </p>
      </div>

      {/* Step Indicators */}
      <div className="grid grid-cols-4 gap-2 text-xs font-semibold">
        {[
          { num: 1, title: 'Fitment' },
          { num: 2, title: 'Baseline' },
          { num: 3, title: 'Gain & Floor' },
          { num: 4, title: 'Done' },
        ].map(({ num, title }) => (
          <div
            key={num}
            className={`rounded-xl p-2.5 text-center border transition ${
              step === num
                ? 'border-teal-500 bg-teal-950/60 text-teal-300'
                : step > num
                ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-400'
                : 'border-slate-800 bg-slate-950 text-slate-500'
            }`}
          >
            <span className="block text-[10px] font-mono">STEP {num}</span>
            <span>{title}</span>
          </div>
        ))}
      </div>

      {/* Step 1: Belt Fitment Check */}
      {step === 1 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 md:p-8 space-y-6 shadow-xl">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">Step 1: Check Lower-Rib Fitment &amp; Contact</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Wrap the 50 mm breathable strap around the lower thoracic ribcage (xiphoid level). Keep the INMP441 acoustic port unobstructed and seat the DS18B20 probe snugly for skin/contact reading.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-300">Measured Belt Tension (MPU6050 Z)</span>
              <span
                className={`font-mono tabular-nums ${
                  liveTightness < 35
                    ? 'text-rose-400'
                    : liveTightness > 85
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {liveTightness}% ({liveTightness < 35 ? 'Too Loose' : liveTightness > 85 ? 'Too Tight' : 'Optimal Fit'})
              </span>
            </div>

            <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden relative">
              <div className="absolute left-[45%] w-[35%] h-full bg-emerald-900/40 border-x border-emerald-500/30" />
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  liveTightness < 35 ? 'bg-rose-500' : liveTightness > 85 ? 'bg-amber-500' : 'bg-emerald-400'
                }`}
                style={{ width: `${liveTightness}%` }}
              />
            </div>

            <p className="text-[11px] text-slate-400">
              Target tension is between 45% and 80%. Adjust hook-and-loop strap so deep inhalation remains comfortable.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex items-center gap-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 px-6 py-3 text-sm font-black transition cursor-pointer"
            >
              <span>Next: Record Baseline</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: 10s Resting Baseline Capture */}
      {step === 2 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 md:p-8 space-y-6 shadow-xl text-center">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Step 2: 10-Second Quiet Resting Baseline</h3>
            <p className="text-xs text-slate-300">
              Instruct the patient to sit quietly and breathe gently while AuraPhragm samples MPU6050 resting gravity and INMP441 ambient room noise.
            </p>
          </div>

          {isRecordingBaseline ? (
            <div className="space-y-4 py-6">
              <div className="w-24 h-24 rounded-full border-4 border-teal-500 flex items-center justify-center mx-auto text-3xl font-black font-mono tabular-nums text-teal-400">
                {countdown}s
              </div>
              <p className="text-xs text-slate-400">
                Sampling MPU6050 Z offset &amp; INMP441 ambient RMS floor...
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-6">
              <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-teal-400">
                <Activity className="w-8 h-8" />
              </div>
              <button
                type="button"
                onClick={startBaselineRecording}
                className="rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 px-8 py-3.5 text-sm font-black shadow-lg shadow-teal-500/20 transition cursor-pointer"
              >
                Start 10s Baseline Capture
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Gain & Threshold Tuning */}
      {step === 3 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 md:p-8 space-y-6 shadow-xl">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Step 3: Sensitivity &amp; Acoustic Floor Tuning</h3>
            <p className="text-xs text-slate-300">
              Baseline captured at <strong className="font-mono">{calibrationProfile.baselineRestingZ} g</strong>. Fine tune digital gain and acoustic gate.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            {/* Accelerometer Z Gain */}
            <div className="space-y-2 rounded-xl bg-slate-950 p-4 border border-slate-800">
              <div className="flex justify-between font-bold text-slate-300">
                <span>Diaphragm Expansion Gain (MPU6050 Z-axis)</span>
                <span className="text-teal-400 font-mono tabular-nums">{calibrationProfile.gainZ.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={calibrationProfile.gainZ}
                onChange={(e) =>
                  setCalibrationProfile({ ...calibrationProfile, gainZ: parseFloat(e.target.value) })
                }
                className="w-full accent-teal-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* INMP441 Audio Noise Floor */}
            <div className="space-y-2 rounded-xl bg-slate-950 p-4 border border-slate-800">
              <div className="flex justify-between font-bold text-slate-300">
                <span>INMP441 Acoustic Cough Gate (RMS Floor)</span>
                <span className="text-sky-300 font-mono tabular-nums">{calibrationProfile.audioNoiseFloor} RMS</span>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                step="1"
                value={calibrationProfile.audioNoiseFloor}
                onChange={(e) =>
                  setCalibrationProfile({
                    ...calibrationProfile,
                    audioNoiseFloor: parseInt(e.target.value, 10),
                  })
                }
                className="w-full accent-sky-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Conditional Piezo Noise Floor */}
            {piezoActive && calibrationProfile.piezoNoiseFloor !== null ? (
              <div className="space-y-2 rounded-xl bg-slate-950 p-4 border border-slate-800">
                <div className="flex justify-between font-bold text-slate-300">
                  <span>Piezo AFE Acoustic Noise Gate</span>
                  <span className="text-amber-400 font-mono tabular-nums">
                    {calibrationProfile.piezoNoiseFloor} ADC
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="80"
                  step="5"
                  value={calibrationProfile.piezoNoiseFloor}
                  onChange={(e) =>
                    setCalibrationProfile({
                      ...calibrationProfile,
                      piezoNoiseFloor: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full accent-amber-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            ) : (
              <div className="rounded-xl bg-amber-950/25 border border-amber-500/35 p-3.5 flex items-center gap-2.5 text-amber-200">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Piezo ADC (GPIO34) is safety-isolated (<code className="font-mono">ENABLE_PIEZO_ADC = 0</code>). Acoustic gating uses the 16 kHz INMP441 I²S channel.
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-xl border border-slate-800 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
            >
              Recapture Baseline
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 px-6 py-3 text-sm font-black transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Profile for {currentPatient.name}</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Complete */}
      {step === 4 && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-8 shadow-xl text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          <h3 className="text-xl font-bold text-white">Calibration Saved Successfully!</h3>
          <p className="text-xs text-emerald-200">
            Sensor offsets, INMP441 acoustic floor, and gain values have been stored locally for {currentPatient.name}.
          </p>
        </div>
      )}
    </div>
  );
};
