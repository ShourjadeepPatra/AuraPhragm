import { APP_CONFIG, SupportedLanguage } from '../config/appConfig';
import { TRANSLATIONS } from '../i18n/translations';
import { AnalysisResult, PatientProfile } from '../types';

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export function buildWhatsAppSummaryText(
  result: AnalysisResult,
  patient: PatientProfile | undefined,
  language: SupportedLanguage
): string {
  const t = TRANSLATIONS[language];
  const triageLabel =
    result.overallTriage === 'MEDICAL_HELP_NEEDED'
      ? t.helpNeeded
      : result.overallTriage === 'MONITOR_RETEST'
      ? t.monitorRetest
      : t.helpNotNeeded;

  const dateStr = new Date(result.timestamp).toLocaleString();
  const topPatterns = result.suspectedConditions
    .slice(0, 3)
    .map((c, idx) => `${idx + 1}. ${c.condition}: ${c.probability}%`)
    .join('\n');

  const redFlagBlock =
    result.redFlagsDetected.length > 0
      ? `\n*Red Flags:*\n${result.redFlagsDetected.map((r) => `- ${r}`).join('\n')}`
      : '';

  const patientLine = patient
    ? `Patient: ${patient.name} (${patient.age}y, ${patient.gender}) | ${patient.village}`
    : `Patient ID: ${result.patientId || 'Walk-in'}`;

  const simTag = result.isSimulated
    ? `\n[SIMULATED PROTOTYPE DATA${result.groundTruthLabel ? ` - ${result.groundTruthLabel}` : ''}]`
    : '';

  const contactTempStr =
    result.features.avgContactTempC !== null
      ? `${result.features.avgContactTempC}°C (Skin/contact only)`
      : 'Unavailable';
  const ppgStr =
    result.features.avgHeartRateBpm !== null && result.features.avgSpo2Pct !== null
      ? `${result.features.avgHeartRateBpm} bpm / ${result.features.avgSpo2Pct}% (Experimental)`
      : 'Unavailable';

  return [
    `*${APP_CONFIG.name} Multi-Sensor Screening Report*`,
    `Date: ${dateStr}`,
    patientLine,
    simTag,
    '',
    `*Result: ${triageLabel}*`,
    `Cough Pattern: ${result.coughType} (${result.confidence}% confidence)`,
    '',
    `*Biometrics (60s):*`,
    `- Breathing Rate: ${result.features.breathingRate} bpm (I:E ${result.features.inspirationExpirationRatio})`,
    `- Coughs Detected: ${result.features.coughCount} (${result.features.coughRatePerHour}/hr)`,
    `- Acoustic Centroid: ${result.features.spectralCentroid} Hz | Signal Quality: ${result.features.signalQuality.score}%`,
    `- DS18B20 Contact Temp: ${contactTempStr}`,
    `- MAX30102 PPG: ${ppgStr}`,
    '',
    `*Suspected Patterns (Guide Only):*`,
    topPatterns,
    redFlagBlock,
    '',
    `*Summary:* ${result.plainExplanation}`,
    `*Guidance:* ${result.recommendation}`,
    '',
    result.overallTriage === 'MEDICAL_HELP_NEEDED'
      ? `Emergency Ambulance (India): ${APP_CONFIG.emergencyNumber}`
      : '',
    `Note: Student/research prototype only — not a clinically validated diagnosis.`,
  ]
    .filter((line) => line !== undefined && line !== null)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function getWhatsAppShareUrl(
  result: AnalysisResult,
  patient: PatientProfile | undefined,
  language: SupportedLanguage
): string {
  const message = buildWhatsAppSummaryText(result, patient, language);
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export async function generateReportPngBlob(
  result: AnalysisResult,
  patient: PatientProfile | undefined,
  language: SupportedLanguage
): Promise<Blob> {
  const t = TRANSLATIONS[language];
  const width = 1080;
  const height = 1560;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#07090e';
  ctx.fillRect(0, 0, width, 165);

  ctx.fillStyle = '#2dd4bf';
  ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
  ctx.fillText('AURAPHRAGM MULTI-SENSOR EXPERIMENTAL SCREENING REPORT', 56, 56);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 40px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${APP_CONFIG.name} Clinical Summary`, 56, 112);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '18px monospace';
  const dateText = new Date(result.timestamp).toLocaleString();
  ctx.fillText(`Report ID: ${result.id.slice(0, 18)}  |  ${dateText}`, 56, 145);

  let y = 195;

  if (result.isSimulated) {
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(56, y, width - 112, 48);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.strokeRect(56, y, width - 112, 48);
    ctx.fillStyle = '#92400e';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(
      `SIMULATED PROTOTYPE READING${result.groundTruthLabel ? ` (${result.groundTruthLabel})` : ''}`,
      76,
      y + 31
    );
    y += 68;
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(56, y, width - 112, 92);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(56, y, width - 112, 92);

  ctx.fillStyle = '#475569';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText('PATIENT & HEALTH WORKER', 76, y + 30);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 24px system-ui, sans-serif';
  const patientTitle = patient
    ? `${patient.name} (${patient.age} yrs, ${patient.gender})  •  ${patient.village}`
    : `Patient ID: ${result.patientId || 'Walk-in Screening'}`;
  ctx.fillText(patientTitle, 76, y + 66);

  y += 116;

  const isUrgent = result.overallTriage === 'MEDICAL_HELP_NEEDED';
  const isMonitor = result.overallTriage === 'MONITOR_RETEST';
  const bannerBg = isUrgent ? '#dc2626' : isMonitor ? '#f59e0b' : '#059669';
  const bannerTextColor = isMonitor ? '#0f172a' : '#ffffff';
  const triageLabel = isUrgent ? t.helpNeeded : isMonitor ? t.monitorRetest : t.helpNotNeeded;

  ctx.fillStyle = bannerBg;
  ctx.fillRect(56, y, width - 112, 145);

  ctx.fillStyle = bannerTextColor;
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText('SCREENING TRIAGE OUTCOME', 80, y + 36);

  ctx.font = 'bold 38px system-ui, sans-serif';
  ctx.fillText(triageLabel, 80, y + 86);

  ctx.font = '20px system-ui, sans-serif';
  const recLines = wrapCanvasText(ctx, result.recommendation, width - 160).slice(0, 2);
  recLines.forEach((line, i) => {
    ctx.fillText(line, 80, y + 118 + i * 24);
  });

  y += 170;

  // Primary Biometrics Row
  const cardW = (width - 112 - 36) / 4;
  const metrics = [
    { label: 'BREATHING RATE', value: `${result.features.breathingRate} bpm` },
    { label: 'COUGHS (60s)', value: `${result.features.coughCount} (${result.features.coughRatePerHour}/hr)` },
    { label: 'I:E RATIO', value: result.features.inspirationExpirationRatio },
    { label: 'CENTROID (I2S)', value: `${result.features.spectralCentroid} Hz` },
  ];

  metrics.forEach((m, i) => {
    const cx = 56 + i * (cardW + 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx, y, cardW, 92);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(cx, y, cardW, 92);

    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText(m.label, cx + 16, y + 30);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(m.value, cx + 16, y + 66);
  });

  y += 108;

  // Auxiliary Multi-Sensor Strip (DS18B20 Contact Temp + MAX30102 Experimental PPG)
  const halfW = (width - 112 - 12) / 2;
  const auxCards = [
    {
      label: 'DS18B20 SKIN / CONTACT TEMP (NOT CORE TEMP)',
      value: result.features.avgContactTempC !== null ? `${result.features.avgContactTempC} °C` : 'Unavailable',
    },
    {
      label: 'MAX30102 PPG HR / SpO2 (EXPERIMENTAL)',
      value:
        result.features.avgHeartRateBpm !== null && result.features.avgSpo2Pct !== null
          ? `${result.features.avgHeartRateBpm} bpm  •  ${result.features.avgSpo2Pct}%`
          : 'Unavailable',
    },
  ];

  auxCards.forEach((m, i) => {
    const cx = 56 + i * (halfW + 12);
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(cx, y, halfW, 78);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(cx, y, halfW, 78);

    ctx.fillStyle = '#475569';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText(m.label, cx + 16, y + 26);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(m.value, cx + 16, y + 58);
  });

  y += 98;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(56, y, width - 112, 175);
  ctx.strokeStyle = '#cbd5e1';
  ctx.strokeRect(56, y, width - 112, 175);

  ctx.fillStyle = '#0d9488';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText(
    `ACOUSTIC & MOTION SUMMARY  •  COUGH: ${result.coughType.toUpperCase()} (${result.confidence}%)`,
    76,
    y + 34
  );

  ctx.fillStyle = '#1e293b';
  ctx.font = '20px system-ui, sans-serif';
  const expLines = wrapCanvasText(ctx, result.plainExplanation, width - 152).slice(0, 4);
  expLines.forEach((line, idx) => {
    ctx.fillText(line, 76, y + 70 + idx * 28);
  });

  y += 196;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(56, y, width - 112, 246);
  ctx.strokeStyle = '#cbd5e1';
  ctx.strokeRect(56, y, width - 112, 246);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText('TOP SUSPECTED RESPIRATORY PATTERNS (GUIDE ONLY)', 76, y + 34);

  result.suspectedConditions.slice(0, 3).forEach((cond, idx) => {
    const rowY = y + 62 + idx * 58;
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 19px system-ui, sans-serif';
    ctx.fillText(`${idx + 1}. ${cond.condition}`, 76, rowY + 18);

    ctx.font = 'bold 19px monospace';
    ctx.fillText(`${cond.probability}%`, width - 140, rowY + 18);

    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(76, rowY + 28, width - 152, 13);
    ctx.fillStyle =
      cond.tag === 'urgent' ? '#e11d48' : cond.tag === 'warning' ? '#f59e0b' : '#10b981';
    ctx.fillRect(76, rowY + 28, Math.max(12, ((width - 152) * cond.probability) / 100), 13);
  });

  y += 264;

  if (result.redFlagsDetected.length > 0) {
    ctx.fillStyle = '#fff1f2';
    ctx.fillRect(56, y, width - 112, 96);
    ctx.strokeStyle = '#fda4af';
    ctx.strokeRect(56, y, width - 112, 96);

    ctx.fillStyle = '#be123c';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText(`RED FLAGS DETECTED (${result.redFlagsDetected.length})`, 76, y + 28);

    ctx.fillStyle = '#881337';
    ctx.font = '17px system-ui, sans-serif';
    const rfText = result.redFlagsDetected.slice(0, 3).join('  •  ');
    wrapCanvasText(ctx, rfText, width - 152)
      .slice(0, 2)
      .forEach((line, i) => ctx.fillText(line, 76, y + 54 + i * 22));
  } else {
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(56, y, width - 112, 80);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(56, y, width - 112, 80);

    ctx.fillStyle = '#334155';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText(
      `Signal Quality Index: ${result.features.signalQuality.score}% (${result.features.signalQuality.status.toUpperCase()})`,
      76,
      y + 32
    );
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText(
      `Engine: ${result.engineUsed} (${result.modelVersion})  •  Emergency Ambulance: ${APP_CONFIG.emergencyNumber}`,
      76,
      y + 60
    );
  }

  ctx.fillStyle = '#07090e';
  ctx.fillRect(0, height - 115, width, 115);
  ctx.fillStyle = '#fca5a5';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('RESEARCH PROTOTYPE DISCLAIMER', 56, height - 82);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '15px system-ui, sans-serif';
  wrapCanvasText(ctx, APP_CONFIG.disclaimer, width - 112)
    .slice(0, 3)
    .forEach((line, i) => ctx.fillText(line, 56, height - 56 + i * 20));

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to render report image'));
    }, 'image/png');
  });
}

export function generatePrintableHtmlReport(
  result: AnalysisResult,
  patient: PatientProfile | undefined,
  language: SupportedLanguage
): string {
  const t = TRANSLATIONS[language];
  const triageLabel =
    result.overallTriage === 'MEDICAL_HELP_NEEDED'
      ? t.helpNeeded
      : result.overallTriage === 'MONITOR_RETEST'
      ? t.monitorRetest
      : t.helpNotNeeded;

  const badgeBg =
    result.overallTriage === 'MEDICAL_HELP_NEEDED'
      ? '#dc2626'
      : result.overallTriage === 'MONITOR_RETEST'
      ? '#d97706'
      : '#059669';

  const dateStr = new Date(result.timestamp).toLocaleString();
  const tempDisplay =
    result.features.avgContactTempC !== null ? `${result.features.avgContactTempC} °C` : 'Unavailable';
  const ppgDisplay =
    result.features.avgHeartRateBpm !== null && result.features.avgSpo2Pct !== null
      ? `${result.features.avgHeartRateBpm} bpm / ${result.features.avgSpo2Pct}%`
      : 'Unavailable';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${APP_CONFIG.name} Screening Report - ${patient?.name || result.id}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; color: #0f172a; margin: 0; padding: 24px; background: #f8fafc; }
  .sheet { max-width: 780px; margin: 0 auto; background: #fff; border: 1px solid #cbd5e1; border-radius: 14px; overflow: hidden; }
  .header { background: #07090e; color: #fff; padding: 24px; }
  .header small { color: #2dd4bf; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
  .header h1 { margin: 6px 0 4px; font-size: 24px; }
  .section { padding: 20px 24px; border-bottom: 1px solid #e2e8f0; }
  .banner { background: ${badgeBg}; color: #fff; padding: 20px; border-radius: 12px; text-align: center; }
  .banner h2 { margin: 0; font-size: 26px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 12px; }
  .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; }
  .card span { font-size: 11px; color: #64748b; display: block; text-transform: uppercase; font-weight: 700; }
  .card strong { font-size: 17px; color: #0f172a; font-variant-numeric: tabular-nums; }
  .sim { background: #fef3c7; border: 1px solid #f59e0b; color: #92400e; padding: 10px 14px; border-radius: 8px; font-weight: 700; font-size: 13px; margin-bottom: 14px; }
  .disclaimer { background: #fff1f2; color: #9f1239; font-size: 12px; padding: 16px 24px; }
  @media print { body { background: #fff; padding: 0; } .sheet { border: none; } }
</style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <small>${APP_CONFIG.name} ${APP_CONFIG.version} • Multi-Sensor Prototype Summary</small>
      <h1>Diaphragm Motion, Acoustic &amp; Respiratory Report</h1>
      <div style="font-size:12px;color:#cbd5e1;">Generated: ${dateStr} • Report ID: ${result.id}</div>
    </div>
    <div class="section">
      ${
        result.isSimulated
          ? `<div class="sim">SIMULATED PROTOTYPE DATA${result.groundTruthLabel ? ` (${result.groundTruthLabel})` : ''}</div>`
          : ''
      }
      <div style="font-size:14px;margin-bottom:14px;">
        <strong>Patient:</strong> ${patient ? `${patient.name} (${patient.age}y, ${patient.gender}) • Village: ${patient.village}` : 'Walk-in Screening'}
        ${patient?.ashaWorkerId ? ` • <strong>ASHA ID:</strong> ${patient.ashaWorkerId}` : ''}
      </div>
      <div class="banner">
        <h2>${triageLabel}</h2>
        <p style="margin:8px 0 0;font-size:14px;">${result.recommendation}</p>
      </div>
    </div>
    <div class="section">
      <strong>Measured Multi-Sensor Biometrics (60s Test)</strong>
      <div class="grid">
        <div class="card"><span>Breathing Rate</span><strong>${result.features.breathingRate} bpm</strong></div>
        <div class="card"><span>Coughs (60s)</span><strong>${result.features.coughCount} (${result.features.coughRatePerHour}/hr)</strong></div>
        <div class="card"><span>I:E Ratio</span><strong>${result.features.inspirationExpirationRatio}</strong></div>
        <div class="card"><span>Spectral Centroid</span><strong>${result.features.spectralCentroid} Hz</strong></div>
        <div class="card"><span>DS18B20 Contact Temp*</span><strong>${tempDisplay}</strong></div>
        <div class="card"><span>MAX30102 PPG*</span><strong>${ppgDisplay}</strong></div>
      </div>
      <p style="font-size:11px;color:#64748b;margin-top:8px;">*DS18B20 measures skin/contact temperature only (not core body temp). MAX30102 HR/SpO2 outputs are experimental and require clinical oximeter confirmation.</p>
    </div>
    <div class="section">
      <strong>Plain-Language Summary</strong>
      <p style="font-size:14px;line-height:1.5;">${result.plainExplanation}</p>
      <p style="font-size:13px;color:#475569;"><strong>Cough Pattern:</strong> ${result.coughType} • <strong>Confidence:</strong> ${result.confidence}% • <strong>Engine:</strong> ${result.engineUsed} (${result.modelVersion})</p>
    </div>
    <div class="section">
      <strong>Top Suspected Respiratory Patterns (Guide Only)</strong>
      <ul>
        ${result.suspectedConditions
          .slice(0, 3)
          .map((c) => `<li><strong>${c.condition} (${c.probability}%)</strong>: ${c.description}</li>`)
          .join('')}
      </ul>
      ${
        result.redFlagsDetected.length > 0
          ? `<strong style="color:#be123c;">Red Flags Detected:</strong><ul>${result.redFlagsDetected
              .map((rf) => `<li>${rf}</li>`)
              .join('')}</ul>`
          : ''
      }
    </div>
    <div class="disclaimer">
      <strong>PROTOTYPE DISCLAIMER:</strong> ${APP_CONFIG.disclaimer} National Emergency Ambulance: ${APP_CONFIG.emergencyNumber}.
    </div>
  </div>
</body>
</html>`;
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
