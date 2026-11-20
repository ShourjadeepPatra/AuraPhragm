import {
  AiAudioAnalysisResult,
  AiChatMessage,
  AiSessionBrief,
  AnalysisResult,
  FeedbackRecord,
  PatientProfile,
  SignalFeatures,
  SymptomQuestionnaire,
} from '../types';
import { runOfflineRuleEngine } from './offlineTriage';
import { APP_CONFIG, SupportedLanguage } from '../config/appConfig';

export async function analyzeRespiratoryRecording(
  features: SignalFeatures,
  symptoms: SymptomQuestionnaire,
  isSimulated: boolean = true,
  groundTruthLabel?: string,
  feedbackExamples: FeedbackRecord[] = [],
  language: SupportedLanguage = 'en'
): Promise<AnalysisResult> {
  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(22000),
      body: JSON.stringify({
        features,
        symptoms,
        groundTruth: groundTruthLabel,
        feedbackExamples: feedbackExamples.slice(0, 5),
        language,
      }),
    });

    if (!res.ok) {
      console.warn('Backend Gemini API responded with error status:', res.status, 'Falling back to on-device engine.');
      return runOfflineRuleEngine(features, symptoms, isSimulated, groundTruthLabel);
    }

    const data = await res.json();
    return {
      id: `test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      coughType: data.coughType || 'Indeterminate',
      confidence: Number(data.confidence) || 75,
      overallTriage: data.overallTriage || 'MONITOR_RETEST',
      plainExplanation: data.plainExplanation || '',
      recommendation: data.recommendation || '',
      redFlagsDetected: Array.isArray(data.redFlagsDetected) ? data.redFlagsDetected : [],
      suspectedConditions: Array.isArray(data.suspectedConditions) ? data.suspectedConditions : [],
      features,
      symptoms,
      modelVersion: data.modelVersion || APP_CONFIG.modelVersion,
      isSimulated,
      groundTruthLabel,
      engineUsed: 'gemini-4-hydrogen',
    };
  } catch (err) {
    console.warn('Network offline or backend unreachable. Running on-device offline fallback engine:', err);
    return runOfflineRuleEngine(features, symptoms, isSimulated, groundTruthLabel);
  }
}

export async function sendAiCopilotMessage(params: {
  message: string;
  history: AiChatMessage[];
  context: {
    isSimulated: boolean;
    patient?: PatientProfile;
    features?: SignalFeatures;
    lastResult?: AnalysisResult | null;
  };
  language: SupportedLanguage;
}): Promise<{ reply: string; suggestedFollowups: string[] }> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(28000),
    body: JSON.stringify(params),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.message || `AI Copilot request failed (${res.status})`);
  }
  return {
    reply: payload.reply || '',
    suggestedFollowups: Array.isArray(payload.suggestedFollowups) ? payload.suggestedFollowups : [],
  };
}

export async function analyzeCoughAudioClip(params: {
  audioBase64: string;
  mimeType: string;
  features?: SignalFeatures;
  language: SupportedLanguage;
}): Promise<AiAudioAnalysisResult> {
  const res = await fetch('/api/ai/analyze-audio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(34000),
    body: JSON.stringify(params),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.message || `Audio analysis request failed (${res.status})`);
  }
  return payload as AiAudioAnalysisResult;
}

export async function generateLongitudinalSessionBrief(params: {
  tests: AnalysisResult[];
  feedback: FeedbackRecord[];
  patient?: PatientProfile;
  language: SupportedLanguage;
}): Promise<AiSessionBrief> {
  const res = await fetch('/api/ai/session-brief', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(28000),
    body: JSON.stringify(params),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.message || `Session brief generation failed (${res.status})`);
  }
  return payload as AiSessionBrief;
}
