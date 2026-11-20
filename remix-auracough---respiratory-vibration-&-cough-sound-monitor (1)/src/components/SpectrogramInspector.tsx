import React, { useRef, useEffect, useState } from 'react';
import { SensorPacket, SignalFeatures } from '../types';
import { Activity, Layers, Sparkles, Info } from 'lucide-react';

interface Props {
  packet: SensorPacket | null;
  features: SignalFeatures;
}

type ColorMapType = 'turbo' | 'neon' | 'matrix';

export const SpectrogramInspector: React.FC<Props> = ({ packet, features }) => {
  const [colorMap, setColorMap] = useState<ColorMapType>('turbo');
  const [gainLevel, setGainLevel] = useState<number>(1.2);
  const [selectedPipelineStep, setSelectedPipelineStep] = useState<number>(3);
  const [hoverInfo, setHoverInfo] = useState<{ band: string; timeSec: number; energy: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fftCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const bandHistory = useRef<Array<{ low: number; mid: number; high: number; rms: number }>>([]);
  const packetRef = useRef<SensorPacket | null>(null);

  useEffect(() => {
    packetRef.current = packet;
    if (!packet) return;

    bandHistory.current.push({
      low: packet.audioBands.low,
      mid: packet.audioBands.mid,
      high: packet.audioBands.high,
      rms: packet.audioRms,
    });
    if (bandHistory.current.length > 150) {
      bandHistory.current.shift();
    }
  }, [packet]);

  // 2D Acoustic Waterfall (100 Hz - 4000 Hz from INMP441)
  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(render);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animId = requestAnimationFrame(render);
        return;
      }

      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = '#07090e';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);

      const freqSteps = [
        { label: '4000 Hz (Whoop/Stridor)', y: 0.08 },
        { label: '1000 Hz (Dry/Wheeze)', y: 0.40 },
        { label: '300 Hz (Bark/Bronchial)', y: 0.72 },
        { label: '100 Hz (Mucus Rumble)', y: 0.94 },
      ];

      for (const fs of freqSteps) {
        const y = fs.y * h;
        ctx.beginPath();
        ctx.moveTo(145, y);
        ctx.lineTo(w, y);
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillText(fs.label, 8, y + 3);
      }
      ctx.setLineDash([]);

      const cols = bandHistory.current;
      const colWidth = (w - 150) / 150;
      const numRows = 24;
      const binHeight = (h - 22) / numRows;

      for (let c = 0; c < cols.length; c++) {
        const col = cols[c];
        const x = 150 + c * colWidth;

        for (let b = 0; b < numRows; b++) {
          const frac = b / (numRows - 1);
          const rawVal =
            frac < 0.33
              ? col.low
              : frac < 0.67
              ? col.mid
              : col.high;
          const mag = Math.min(255, Math.max(0, rawVal * gainLevel * 3.8));
          const y = h - 18 - (b + 1) * binHeight;

          if (colorMap === 'turbo') {
            if (mag < 40) ctx.fillStyle = `rgb(10, 15, ${Math.floor(mag * 2 + 30)})`;
            else if (mag < 95) ctx.fillStyle = `rgb(0, ${Math.floor(mag * 2)}, ${Math.floor(255 - mag)})`;
            else if (mag < 170) ctx.fillStyle = `rgb(${Math.floor((mag - 95) * 3)}, 220, 50)`;
            else ctx.fillStyle = `rgb(255, ${Math.floor(255 - (mag - 170) * 2)}, ${Math.floor((mag - 170) * 1.5)})`;
          } else if (colorMap === 'neon') {
            ctx.fillStyle = `rgb(${Math.floor(mag * 1.1)}, ${Math.floor(mag * 0.4)}, ${Math.floor(240 - mag * 0.4)})`;
          } else {
            ctx.fillStyle = `rgb(${Math.floor(mag * 0.2)}, ${Math.floor(mag)}, ${Math.floor(mag * 0.35)})`;
          }

          ctx.fillRect(x, y, colWidth + 0.5, binHeight + 0.5);
        }
      }

      ctx.fillStyle = '#64748b';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillText('-3s', 150, h - 4);
      ctx.fillText('-1.5s', (w + 150) / 2, h - 4);
      ctx.fillText('Live', w - 32, h - 4);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [colorMap, gainLevel]);

  // Band-Energy Bar Curve
  useEffect(() => {
    let animId: number;

    const renderBands = () => {
      const canvas = fftCanvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(renderBands);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animId = requestAnimationFrame(renderBands);
        return;
      }

      const w = canvas.width;
      const h = canvas.height;
      const pkt = packetRef.current;

      ctx.fillStyle = '#07090e';
      ctx.fillRect(0, 0, w, h);

      const bands = pkt?.audioBands || features.bandEnergies;
      const points = [
        { hz: '100Hz', val: bands.low * 0.6 },
        { hz: '200Hz', val: bands.low },
        { hz: '450Hz', val: bands.mid },
        { hz: '750Hz', val: bands.mid * 0.85 },
        { hz: '1.4kHz', val: bands.high },
        { hz: '2.6kHz', val: bands.high * 0.7 },
        { hz: '4.0kHz', val: bands.high * 0.3 },
      ];

      const step = w / (points.length - 1);
      ctx.beginPath();
      ctx.moveTo(0, h);
      points.forEach((pt, idx) => {
        const x = idx * step;
        const y = Math.max(12, h - pt.val * gainLevel * 1.4);
        ctx.lineTo(x, y);
      });
      ctx.lineTo(w, h);
      ctx.closePath();

      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, 'rgba(45, 212, 191, 0.5)');
      gradient.addColorStop(1, 'rgba(7, 9, 14, 0)');
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.strokeStyle = '#2dd4bf';
      ctx.lineWidth = 2;
      ctx.beginPath();
      points.forEach((pt, idx) => {
        const x = idx * step;
        const y = Math.max(12, h - pt.val * gainLevel * 1.4);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px "JetBrains Mono", monospace';
      points.forEach((pt, idx) => {
        const x = Math.min(w - 36, Math.max(4, idx * step - 12));
        ctx.fillText(pt.hz, x, h - 5);
      });

      animId = requestAnimationFrame(renderBands);
    };

    animId = requestAnimationFrame(renderBands);
    return () => cancelAnimationFrame(animId);
  }, [gainLevel, features]);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x >= 150 && y <= canvas.height - 18) {
      const relY = 1 - y / (canvas.height - 18);
      const band = relY < 0.33 ? '100-300 Hz (Low)' : relY < 0.67 ? '300-1000 Hz (Mid)' : '1000-4000 Hz (High)';
      const relX = (x - 150) / (canvas.width - 150);
      const timeSec = parseFloat((-3 * (1 - relX)).toFixed(1));
      const energy = Math.round(relY * 80 * gainLevel);
      setHoverInfo({ band, timeSec, energy });
    } else {
      setHoverInfo(null);
    }
  };

  const pipelineStages = [
    {
      num: 1,
      title: 'Dual-Rate Acquisition',
      subtitle: '50 Hz I2C/1-Wire + 16 kHz I2S',
      desc: 'MPU6050 (0x68) and experimental MAX30102 (0x57) run on shared I2C, DS18B20 runs async 1-Wire on GPIO4, and INMP441 samples true 16 kHz audio via DMA. Piezo GPIO34 stays isolated until AFE verification.',
    },
    {
      num: 2,
      title: 'Bus Validation & Conditioning',
      subtitle: 'Checked I2C + Bandpass',
      desc: 'Every I2C read checks Wire.requestFrom() == 14 bytes; missing or disabled channels emit NA rather than fabricated defaults. Motion signals pass through a 0.1-0.8 Hz respiration filter.',
    },
    {
      num: 3,
      title: '16 kHz Goertzel / Spectral Bands',
      subtitle: '100-4000 Hz Acoustic Bands',
      desc: 'INMP441 DMA frames compute RMS, peak, ZCR, and three acoustic energy bands (100-300 Hz mucus rumble, 300-1000 Hz cough core, 1000-4000 Hz wheeze/stridor/whoop) without exceeding BLE MTU limits.',
    },
    {
      num: 4,
      title: 'Hysteresis & Sensor Fusion',
      subtitle: 'Refractory 350ms Segmentation',
      desc: 'Adaptive noise-floor thresholding with hysteresis, 60-1200 ms burst bounds, and a 350 ms lockout prevent single cough events from double-counting, cross-checked with MPU6050 jerk context.',
    },
    {
      num: 5,
      title: 'AP2 Telemetry & Triage',
      subtitle: 'Gemini 4 + Offline Fallback',
      desc: 'Versioned AP2 packets stream to the companion console for waveform plotting, OLED mirroring, local IndexedDB archival, and AI/offline triage with explicit non-diagnostic disclaimers.',
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-400" />
            <h3 className="text-base font-display font-bold text-white tracking-tight">
              INMP441 Acoustic Spectrogram &amp; Pipeline Lab
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Time-frequency band decomposition (100 Hz – 4000 Hz) from 16 kHz I2S digital audio summaries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1 rounded-xl bg-slate-950 p-1 border border-slate-800">
            {(['turbo', 'neon', 'matrix'] as const).map((map) => (
              <button
                key={map}
                onClick={() => setColorMap(map)}
                className={`px-2.5 py-1 rounded-lg capitalize font-semibold transition cursor-pointer text-[11px] whitespace-nowrap shrink-0 ${
                  colorMap === map ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                {map}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 rounded-xl bg-slate-950 px-3 py-1.5 border border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium">Gain:</span>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={gainLevel}
              onChange={(e) => setGainLevel(parseFloat(e.target.value))}
              className="w-16 accent-teal-400 h-1 bg-slate-800 rounded cursor-pointer"
            />
            <span className="font-mono tabular-nums text-teal-300 text-[11px]">{gainLevel.toFixed(1)}x</span>
          </div>
        </div>
      </div>

      <div className="relative rounded-xl border border-slate-800 bg-[#07090e] overflow-hidden">
        <canvas
          ref={canvasRef}
          width={760}
          height={230}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={() => setHoverInfo(null)}
          className="w-full h-[220px] md:h-[240px] block cursor-crosshair"
        />

        {hoverInfo && (
          <div className="absolute top-3 right-3 rounded-lg bg-slate-950/95 border border-slate-700 px-3 py-1.5 text-[11px] font-mono tabular-nums text-white flex items-center gap-3">
            <span>Band: <strong className="text-teal-400">{hoverInfo.band}</strong></span>
            <span>Time: <strong className="text-sky-300">{hoverInfo.timeSec}s</strong></span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5 text-teal-400" />
            I2S Acoustic Band Profile (100 Hz – 4.0 kHz)
          </span>
          <span className="text-[11px] font-mono tabular-nums text-teal-300">
            Centroid: {features.spectralCentroid} Hz · ZCR: {features.zeroCrossingRate}
          </span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#07090e] overflow-hidden">
          <canvas ref={fftCanvasRef} width={760} height={100} className="w-full h-[95px] block" />
        </div>
      </div>

      <div className="space-y-3 pt-2 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-display font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-teal-400" />
            <span>AuraPhragm 5-Stage Signal Pipeline</span>
          </h4>
          <span className="text-[11px] text-slate-400">Select stage</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          {pipelineStages.map((st) => (
            <button
              key={st.num}
              onClick={() => setSelectedPipelineStep(st.num)}
              className={`rounded-xl p-3 text-left border transition cursor-pointer flex flex-col justify-between ${
                selectedPipelineStep === st.num
                  ? 'border-teal-500 bg-teal-950/30'
                  : 'border-slate-800 bg-slate-950 hover:border-slate-700'
              }`}
            >
              <div>
                <span className="text-[10px] font-mono font-bold text-teal-400 block">STAGE {st.num}</span>
                <span className="font-semibold text-white block mt-0.5">{st.title}</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-2 block truncate">{st.subtitle}</span>
            </button>
          ))}
        </div>

        {selectedPipelineStep && (
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-300 leading-relaxed space-y-1">
            <div className="flex items-center gap-2 font-semibold text-teal-300">
              <Info className="w-4 h-4 text-teal-400 shrink-0" />
              <span>
                Stage {selectedPipelineStep}: {pipelineStages[selectedPipelineStep - 1].title} ({pipelineStages[selectedPipelineStep - 1].subtitle})
              </span>
            </div>
            <p>{pipelineStages[selectedPipelineStep - 1].desc}</p>
          </div>
        )}
      </div>
    </div>
  );
};
