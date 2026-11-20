import {
  AnalysisResult,
  SignalFeatures,
  SymptomQuestionnaire,
  SuspectedCondition,
  TriageOutcome,
} from '../types';
import { APP_CONFIG } from '../config/appConfig';

export function runOfflineRuleEngine(
  features: SignalFeatures,
  symptoms: SymptomQuestionnaire,
  isSimulated: boolean = true,
  groundTruthLabel?: string
): AnalysisResult {
  const redFlags: string[] = [];
  const suspected: SuspectedCondition[] = [];

  if (symptoms.bloodInSputum) {
    redFlags.push('Blood in sputum (hemoptysis) reported — requires immediate clinical evaluation');
  }
  if (symptoms.blueLips) {
    redFlags.push('Cyanosis (blue lips/fingertips) — emergency sign of severe low oxygenation');
  }
  if (symptoms.severeBreathlessness) {
    redFlags.push('Severe acute breathlessness / respiratory struggle');
  }
  if (features.breathingRate > 30) {
    redFlags.push(`Severe tachypnea detected: ${features.breathingRate} breaths/min (normal 12–20 bpm)`);
  } else if (features.breathingRate > 0 && features.breathingRate < 8) {
    redFlags.push(`Severe bradypnea / respiratory depression: ${features.breathingRate} bpm`);
  }
  if (features.coughCount >= 6) {
    redFlags.push(`High cough frequency: ${features.coughCount} cough events in 60s (${features.coughRatePerHour}/hr)`);
  }
  if (symptoms.coughDuration === '>3_weeks') {
    redFlags.push('Chronic cough duration exceeding 3 weeks (India National TB guideline red flag)');
  }
  if (features.avgSpo2Pct !== null && features.avgSpo2Pct < 92) {
    redFlags.push(`Experimental MAX30102 SpO2 reading below 92% (${features.avgSpo2Pct}%) — confirm with a medical pulse oximeter`);
  }

  // 1. TB-suspect pattern
  let tbScore = 5;
  if (symptoms.coughDuration === '>3_weeks') tbScore += 45;
  if (symptoms.bloodInSputum) tbScore += 25;
  if (symptoms.weightLoss) tbScore += 20;
  if (symptoms.tbContact) tbScore += 15;
  if (features.coughCount > 2) tbScore += 10;
  const tbProb = Math.min(95, Math.max(5, tbScore));
  suspected.push({
    condition: 'TB-suspect pattern',
    probability: tbProb,
    description:
      tbProb > 40
        ? 'Pattern fits chronic cough >3wks screening criteria under national TB guidelines'
        : 'Low risk pattern for tuberculosis',
    tag: tbProb > 50 ? 'urgent' : tbProb > 25 ? 'caution' : 'normal',
  });

  // 2. Pneumonia-like pattern
  let pneuScore = 5;
  if (features.breathingRate >= 28) pneuScore += 35;
  if (symptoms.fever) pneuScore += 25;
  if (features.coughCount >= 3) pneuScore += 20;
  if (symptoms.severeBreathlessness) pneuScore += 20;
  if (features.avgContactTempC !== null && features.avgContactTempC >= 37.3) pneuScore += 8;
  const pneuProb = Math.min(95, Math.max(5, pneuScore));
  suspected.push({
    condition: 'Pneumonia-like pattern',
    probability: pneuProb,
    description:
      pneuProb > 50
        ? 'Combination of elevated respiratory rate, reported fever, and cough acoustic energy'
        : 'Low probability of acute pneumonia pattern',
    tag: pneuProb > 50 ? 'urgent' : pneuProb > 30 ? 'warning' : 'normal',
  });

  // 3. Asthma / Bronchospasm pattern
  let asthmaScore = 10;
  const ieParts = features.inspirationExpirationRatio.split(':');
  const expFactor = ieParts.length > 1 ? parseFloat(ieParts[1]) : 2.0;
  if (expFactor >= 2.6) asthmaScore += 35;
  if (features.bandEnergies.high > 22 || features.spectralCentroid > 700) asthmaScore += 25;
  if (symptoms.severeBreathlessness) asthmaScore += 15;
  const asthmaProb = Math.min(90, Math.max(5, asthmaScore));
  suspected.push({
    condition: 'Asthma / Bronchospasm pattern',
    probability: asthmaProb,
    description:
      asthmaProb > 45
        ? 'Prolonged expiratory phase with elevated high-frequency acoustic energy'
        : 'Mild or absent bronchospasm features',
    tag: asthmaProb > 50 ? 'warning' : 'normal',
  });

  // 4. Acute Bronchitis
  let bronchScore = 10;
  if (features.coughCount >= 3) bronchScore += 35;
  if (features.bandEnergies.low > 18) bronchScore += 20;
  if (symptoms.fever) bronchScore += 15;
  const bronchProb = Math.min(85, Math.max(10, bronchScore));
  suspected.push({
    condition: 'Acute Bronchitis pattern',
    probability: bronchProb,
    description:
      bronchProb > 40 ? 'Repeated productive or irritative cough acoustic bursts' : 'Low bronchial acoustic energy',
    tag: bronchProb > 40 ? 'caution' : 'normal',
  });

  // 5. Normal respiratory pattern
  let normScore = 82;
  if (features.breathingRate > 22 || (features.breathingRate > 0 && features.breathingRate < 12)) normScore -= 40;
  if (features.coughCount > 0) normScore -= features.coughCount * 18;
  if (redFlags.length > 0) normScore -= 50;
  const normProb = Math.min(98, Math.max(2, normScore));
  suspected.push({
    condition: 'Normal healthy pattern',
    probability: normProb,
    description:
      normProb > 60 ? 'Smooth rhythmic tidal diaphragm motion with quiet INMP441 baseline' : 'Deviations from baseline observed',
    tag: normProb > 60 ? 'normal' : 'caution',
  });

  suspected.sort((a, b) => b.probability - a.probability);

  let overallTriage: TriageOutcome;
  let plainExplanation = '';
  let recommendation = '';

  if (redFlags.length > 0 || tbProb >= 50 || pneuProb >= 55) {
    overallTriage = 'MEDICAL_HELP_NEEDED';
    plainExplanation =
      'Significant respiratory irregularities or clinical red flags were recorded. Elevated breathing rate, cough clusters, or critical symptoms require prompt evaluation by a qualified doctor.';
    recommendation =
      'Refer the patient to the nearest Primary Health Centre (PHC), Community Health Centre (CHC), or hospital for clinical examination and reference diagnostics.';
  } else if (features.breathingRate > 22 || features.coughCount >= 2 || asthmaProb > 45 || bronchProb > 45) {
    overallTriage = 'MONITOR_RETEST';
    plainExplanation =
      'Mild to moderate breathing or acoustic variations were detected without acute red flags. Continue observation and confirm sensor fitment.';
    recommendation =
      'Rest upright, hydrate adequately, and repeat the 60s screening in 12–24 hours. Seek clinical care promptly if symptoms worsen.';
  } else {
    overallTriage = 'MEDICAL_HELP_NOT_NEEDED';
    plainExplanation =
      'Diaphragm motion and respiratory cadence fall within typical resting limits with minimal cough acoustic activity and no clinical red flags.';
    recommendation =
      'Routine observation only. Remember AuraPhragm is a non-diagnostic research prototype; consult a clinician whenever unwell.';
  }

  let coughType = 'None';
  if (features.coughCount > 0) {
    if (features.spectralCentroid > 1100) coughType = 'Whooping / High-Pitch';
    else if (features.spectralCentroid > 650) coughType = 'Dry / Irritative';
    else if (features.bandEnergies.low > features.bandEnergies.high) coughType = 'Wet / Productive';
    else coughType = 'Mixed Cough';
  }

  return {
    id: `test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    coughType,
    confidence: Math.round(suspected[0].probability),
    overallTriage,
    plainExplanation,
    recommendation,
    redFlagsDetected: redFlags,
    suspectedConditions: suspected,
    features,
    symptoms,
    modelVersion: `${APP_CONFIG.version}-offline-engine`,
    isSimulated,
    groundTruthLabel,
    engineUsed: 'on-device-rule-fallback',
  };
}
