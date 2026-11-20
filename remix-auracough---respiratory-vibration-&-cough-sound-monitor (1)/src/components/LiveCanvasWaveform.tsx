import React, { useRef, useEffect, useState } from 'react';
import { SensorPacket, SignalFeatures } from '../types';
import { Activity, Radio, ShieldAlert } from 'lucide-react';

interface Props {
  packet: SensorPacket | null;
  features?: SignalFeatures;
  showAll?: boolean;
}

export const LiveCanvasWaveform: React.FC<Props> = ({ packet, features }) => {
  const [activeView, setActiveView] = useState<'all' | 'breathing' | 'acoustic' | 'spectrum'>('all');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const breathHistory = useRef<number[]>([]);
  const dispHistory = useRef<number[]>([]);
  const audioHistory = useRef<number[]>([]);
  const bandHistory = useRef<Array<{ low: number; mid: number; high: number }>>([]);
  const packetRef = useRef<SensorPacket | null>(null);

  useEffect(() => {
    packetRef.current = packet;
    if (!packet) return;

    breathHistory.current.push(packet.breathingWave);
    if (breathHistory.current.length > 250) breathHistory.current.shift();

    dispHistory.current.push(packet.chestDisplacement);
    if (dispHistory.current.length > 250) dispHistory.current.shift();

    // Use INMP441 RMS when available; fall back to conditioned piezo amplitude if enabled
    const acousticSample =
      packet.sensorStatus.inmp441 === 'ok'
        ? packet.audioRms
        : packet.piezoFiltered !== null
        ? Math.abs(packet.piezoFiltered)
        : 0;
    audioHistory.current.push(acousticSample);
    if (audioHistory.current.length > 250) audioHistory.current.shift();

    bandHistory.current.push({ ...packet.audioBands });
    if (bandHistory.current.length > 120) bandHistory.current.shift();
  }, [packet]);

  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const w = canvas.width;
      const h = canvas.height;
      const pkt = packetRef.current;

      ctx.fillStyle = '#07090e';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);

      const gridYCount = activeView === 'all' ? 4 : 6;
      for (let y = 0; y <= h; y += h / gridYCount) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      for (let x = 0; x <= w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      const renderWave = (
        data: number[],
        topY: number,
        plotHeight: number,
        color: string,
        label: string,
        unit: string,
        scale: number,
        unavailableReason?: string
      ) => {
        const midY = topY + plotHeight / 2;

        ctx.fillStyle = color;
        ctx.font = '600 10px "JetBrains Mono", monospace';
        ctx.fillText(label, 12, topY + 15);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, midY);
        ctx.lineTo(w, midY);
        ctx.stroke();

        if (unavailableReason) {
          ctx.fillStyle = '#94a3b8';
          ctx.font = '11px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(unavailableReason, w / 2, midY + 4);
          ctx.textAlign = 'left';
          return;
        }

        if (data.length < 2) return;

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.8;
        ctx.beginPath();

        const step = w / 250;
        for (let i = 0; i < data.length; i++) {
          const x = i * step;
          const y = Math.max(topY + 18, Math.min(topY + plotHeight - 4, midY - data[i] * scale));
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        const latest = data[data.length - 1];
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${(latest || 0).toFixed(1)} ${unit}`, w - 12, topY + 15);
        ctx.textAlign = 'left';
      };

      const inmpOk = pkt?.sensorStatus.inmp441 === 'ok';
      const piezoOk = pkt?.sensorStatus.piezo === 'ok';
      const mpuOk = pkt?.sensorStatus.mpu6050 === 'ok';

      if (activeView === 'all') {
        const slotH = h / 4;

        renderWave(
          breathHistory.current,
          0,
          slotH,
          '#2dd4bf',
          'RESPIRATION PROXY (MPU6050 0.1-0.8 Hz)',
          'norm',
          slotH * 0.4,
          pkt && !mpuOk ? 'MPU6050 UNAVAILABLE' : undefined
        );

        renderWave(
          dispHistory.current,
          slotH,
          slotH,
          '#38bdf8',
          'CHEST DISPLACEMENT (MPU6050)',
          'mm',
          slotH * 0.12,
          pkt && !mpuOk ? 'MPU6050 UNAVAILABLE' : undefined
        );

        const acousticLabel = inmpOk
          ? 'INMP441 16kHz AUDIO ENVELOPE (I2S)'
          : piezoOk
          ? 'PIEZO CONDITIONED VIBRATION (GPIO34)'
          : 'ACOUSTIC / PIEZO CHANNEL';
        const acousticUnavailable =
          pkt && !inmpOk && !piezoOk
            ? 'INMP441 DISABLED & PIEZO GPIO34 SAFETY ISOLATED'
            : undefined;

        renderWave(
          audioHistory.current,
          slotH * 2,
          slotH,
          '#f59e0b',
          acousticLabel,
          'rms',
          slotH * 0.004,
          acousticUnavailable
        );

        // Slot 4: 3-Band I2S Acoustic Spectral Waterfall (100-4000 Hz)
        const specTop = slotH * 3;
        ctx.fillStyle = '#fbbf24';
        ctx.font = '600 10px "JetBrains Mono", monospace';
        ctx.fillText('INMP441 3-BAND ACOUSTIC ENERGY (100-300 / 300-1k / 1k-4k Hz)', 12, specTop + 15);

        if (pkt && !inmpOk) {
          ctx.fillStyle = '#94a3b8';
          ctx.font = '11px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText('INMP441 I2S SPECTRAL CHANNEL UNAVAILABLE', w / 2, specTop + slotH / 2 + 4);
          ctx.textAlign = 'left';
        } else {
          const cols = bandHistory.current;
          const colW = Math.max(2, (w - 190) / 120);
          const bandH = (slotH - 24) / 3;
          for (let c = 0; c < cols.length; c++) {
            const b = cols[c];
            const x = 12 + c * colW;
            const vals = [b.high, b.mid, b.low];
            for (let row = 0; row < 3; row++) {
              const intensity = Math.min(255, Math.round(vals[row] * 3.2));
              ctx.fillStyle = `rgb(${intensity}, ${Math.round(intensity * 0.72)}, ${Math.max(20, 210 - intensity)})`;
              ctx.fillRect(x, specTop + 20 + row * bandH, colW, bandH - 1);
            }
          }

          const latestBands = pkt?.audioBands || { low: 0, mid: 0, high: 0 };
          const barX = w - 160;
          const barLabels = [
            { name: 'LOW', val: latestBands.low, color: '#2dd4bf' },
            { name: 'MID', val: latestBands.mid, color: '#38bdf8' },
            { name: 'HIGH', val: latestBands.high, color: '#f59e0b' },
          ];
          barLabels.forEach((bl, idx) => {
            const by = specTop + 24 + idx * 20;
            ctx.fillStyle = '#94a3b8';
            ctx.font = '9px "JetBrains Mono", monospace';
            ctx.fillText(bl.name, barX, by + 9);
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(barX + 32, by + 1, 90, 10);
            ctx.fillStyle = bl.color;
            ctx.fillRect(barX + 32, by + 1, Math.min(90, bl.val * 0.9), 10);
          });
        }
      } else if (activeView === 'breathing') {
        renderWave(breathHistory.current, 0, h, '#2dd4bf', 'RESPIRATION PROXY (MPU6050)', 'norm', h * 0.35);
      } else if (activeView === 'acoustic') {
        renderWave(
          audioHistory.current,
          0,
          h,
          '#f59e0b',
          inmpOk ? 'INMP441 16kHz AUDIO ENVELOPE' : 'PIEZO CONDITIONED CHANNEL',
          'rms',
          h * 0.008,
          pkt && !inmpOk && !piezoOk ? 'AUDIO & PIEZO CHANNELS DISABLED' : undefined
        );
      } else {
        ctx.fillStyle = '#fbbf24';
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.fillText('INMP441 I2S FREQUENCY BANDS (100 Hz – 4000 Hz)', 14, 22);

        const latestBands = pkt?.audioBands || { low: 0, mid: 0, high: 0 };
        const bars = [
          { label: 'Low Band (100-300 Hz · Mucus/Rumble)', value: latestBands.low, color: '#2dd4bf' },
          { label: 'Mid Band (300-1000 Hz · Bark/Cough Core)', value: latestBands.mid, color: '#38bdf8' },
          { label: 'High Band (1000-4000 Hz · Wheeze/Stridor/Whoop)', value: latestBands.high, color: '#f59e0b' },
        ];
        bars.forEach((b, idx) => {
          const y = 65 + idx * 95;
          ctx.fillStyle = '#e2e8f0';
          ctx.font = '12px "JetBrains Mono", monospace';
          ctx.fillText(b.label, 24, y);
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(24, y + 12, w - 48, 34);
          ctx.fillStyle = b.color;
          ctx.fillRect(24, y + 12, Math.min(w - 48, b.value * 6), 34);
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'right';
          ctx.fillText(`${b.value.toFixed(1)}`, w - 28, y);
          ctx.textAlign = 'left';
        });
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [activeView]);

  const piezoStatus = packet?.sensorStatus.piezo ?? 'disabled';

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-teal-500/10 p-1.5 text-teal-400 border border-teal-500/20">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-display font-bold text-white tracking-wide">
              REAL-TIME MULTI-SENSOR TELEMETRY
            </span>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono tabular-nums">
              <span>50 Hz AP2 Stream</span>
              <span>·</span>
              <span>16 kHz I2S Audio</span>
              <span>·</span>
              <span className={piezoStatus === 'ok' ? 'text-emerald-400' : 'text-amber-400'}>
                Piezo GPIO34: {piezoStatus === 'ok' ? 'AFE Active' : 'Isolated (OFF)'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
          {([
            { id: 'all', label: 'All Channels' },
            { id: 'breathing', label: 'Respiration' },
            { id: 'acoustic', label: 'I2S Audio' },
            { id: 'spectrum', label: 'Bands' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                activeView === tab.id ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-[#07090e]">
        <canvas
          ref={canvasRef}
          width={800}
          height={380}
          className="w-full h-[280px] sm:h-[340px] block cursor-crosshair"
        />

        {features && (
          <div className="absolute top-3 right-3 rounded-lg bg-slate-950/90 px-3 py-1 border border-slate-800 text-[11px] font-mono tabular-nums text-white">
            SQI {features.signalQuality.score}% · {features.signalQuality.status.toUpperCase()}
          </div>
        )}
      </div>

      {piezoStatus !== 'ok' && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-xs text-amber-200">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Piezo ADC (<span className="font-mono">GPIO34</span>) is isolated (<span className="font-mono">ENABLE_PIEZO_ADC = 0</span>) until a verified 0–3.3 V clamp/bias analogue front-end is bench-tested. Acoustic telemetry uses the INMP441 I2S microphone.
          </span>
        </div>
      )}

      {features && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-950 p-2.5 border border-slate-800 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-teal-400 shrink-0" />
            <span>
              <strong className="text-white">Signal Advice:</strong> {features.signalQuality.advice}
            </span>
          </div>
          <span className="font-mono tabular-nums text-[11px] text-slate-400">
            I:E {features.inspirationExpirationRatio} · Centroid {features.spectralCentroid} Hz
          </span>
        </div>
      )}
    </div>
  );
};
