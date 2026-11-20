import React, { useRef, useEffect } from 'react';
import { SensorPacket, SignalQualityStatus } from '../types';

interface Props {
  packet: SensorPacket | null;
  breathingRate: number;
  coughCount: number;
  sqiStatus: SignalQualityStatus;
  isConnected: boolean;
}

export const OledPreview: React.FC<Props> = ({
  packet,
  breathingRate,
  coughCount,
  sqiStatus,
  isConnected,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 128;
    const h = 64;

    ctx.fillStyle = '#050911';
    ctx.fillRect(0, 0, w, h);

    const oledColor = '#38bdf8';
    const dimColor = '#0c4a6e';

    // Header bar (y: 0 to 9)
    ctx.fillStyle = oledColor;
    ctx.font = '7px monospace';
    ctx.fillText('AuraPhragm', 2, 7);
    ctx.fillText(isConnected ? '[BLE]' : '[SIM]', 64, 7);
    ctx.fillText(packet?.powerSource || 'USB', 105, 7);

    ctx.strokeStyle = oledColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 9.5);
    ctx.lineTo(128, 9.5);
    ctx.stroke();

    // Primary metrics labels
    ctx.fillStyle = dimColor;
    ctx.font = '6px monospace';
    ctx.fillText('RESP', 3, 18);
    ctx.fillText('COUGHS', 70, 18);

    // Primary values (show NA if sensor unavailable or not yet calculated)
    ctx.fillStyle = oledColor;
    ctx.font = 'bold 15px monospace';
    const respText =
      packet?.sensorStatus.mpu6050 === 'ok' && breathingRate > 0 ? String(breathingRate) : 'NA';
    ctx.fillText(respText, 3, 33);

    if (respText !== 'NA') {
      ctx.font = '6px monospace';
      ctx.fillText('bpm', 34, 33);
    }

    ctx.font = 'bold 15px monospace';
    ctx.fillText(String(coughCount), 70, 33);

    // Lower telemetry bar
    ctx.beginPath();
    ctx.moveTo(0, 38.5);
    ctx.lineTo(128, 38.5);
    ctx.stroke();

    ctx.font = '6px monospace';
    const tempText =
      packet?.sensorStatus.ds18b20 === 'ok' && packet.contactTempC !== null
        ? `${packet.contactTempC.toFixed(1)}C`
        : 'NA';
    ctx.fillStyle = oledColor;
    ctx.fillText(`T:${tempText}`, 3, 48);

    const sqiText = packet?.sqiDevice || sqiStatus.toUpperCase();
    ctx.fillStyle = sqiStatus === 'poor' ? '#f43f5e' : oledColor;
    ctx.fillText(`SQI:${sqiText}`, 64, 48);

    // Experimental PPG line
    ctx.fillStyle = oledColor;
    const ppgText =
      packet?.sensorStatus.max30102 === 'ok' &&
      packet.heartRateBpm !== null &&
      packet.spo2Pct !== null
        ? `${Math.round(packet.heartRateBpm)}bpm / ${Math.round(packet.spo2Pct)}%`
        : 'NA';
    ctx.fillText(`PPG*:${ppgText}`, 3, 59);
  }, [packet, breathingRate, coughCount, sqiStatus, isConnected]);

  return (
    <div className="relative rounded-2xl border-2 border-slate-800 bg-black p-3.5 shadow-xl inline-block max-w-full">
      <div className="flex items-center justify-between pb-1.5 px-1 text-[10px] text-slate-500 font-mono tracking-wider">
        <span>SSD1306 0.96&quot; I2C</span>
        <span>128x64 OLED</span>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-900 bg-black p-1">
        <canvas
          ref={canvasRef}
          width={128}
          height={64}
          className="w-full max-w-[280px] h-[140px] block mx-auto"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between px-1 text-[10px] text-slate-400 font-mono">
        <span>Hardware Screen Mirror</span>
        <span className="text-cyan-400">I2C 0x3C</span>
      </div>
    </div>
  );
};
