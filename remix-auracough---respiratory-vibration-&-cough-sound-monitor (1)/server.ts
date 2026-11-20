import express from 'express';
import type { Request, Response } from 'express';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import dotenv from 'dotenv';
import http from 'http';
import path from 'path';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '15mb' }));

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    hasMapsKey: !!(
      process.env.GOOGLE_MAPS_API_KEY ||
      process.env.VITE_GOOGLE_MAPS_API_KEY ||
      process.env.MAPS_API_KEY
    ),
    timestamp: new Date().toISOString(),
  });
});

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Nearby Hospitals Lookup using Google Maps Platform Places API (New)
app.post('/api/hospitals/nearby', async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, radiusMeters = 20000, languageCode = 'en' } = req.body || {};

    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      Number.isNaN(latitude) ||
      Number.isNaN(longitude)
    ) {
      return res.status(400).json({ error: 'INVALID_COORDINATES', message: 'Valid latitude and longitude required.' });
    }

    const mapsApiKey =
      process.env.GOOGLE_MAPS_API_KEY ||
      process.env.VITE_GOOGLE_MAPS_API_KEY ||
      process.env.MAPS_API_KEY;

    if (!mapsApiKey) {
      return res.status(503).json({
        error: 'MAPS_KEY_NOT_CONFIGURED',
        message: 'Google Maps API key is not configured on the server.',
      });
    }

    const fieldMask = [
      'places.id',
      'places.displayName',
      'places.formattedAddress',
      'places.shortFormattedAddress',
      'places.location',
      'places.nationalPhoneNumber',
      'places.internationalPhoneNumber',
      'places.googleMapsUri',
      'places.currentOpeningHours',
      'places.businessStatus',
    ].join(',');

    const queryNearby = async (radius: number) => {
      const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': mapsApiKey,
          'X-Goog-FieldMask': fieldMask,
          'X-Goog-Maps-Solution-ID': 'gmp_mcp_codeassist_v1_aistudio',
        },
        body: JSON.stringify({
          includedTypes: ['hospital'],
          maxResultCount: 15,
          rankPreference: 'DISTANCE',
          languageCode: languageCode === 'hi' || languageCode === 'bn' ? languageCode : 'en',
          locationRestriction: {
            circle: {
              center: { latitude, longitude },
              radius: Math.min(50000, Math.max(1000, Number(radius) || 20000)),
            },
          },
        }),
      });

      const payload: any = await response.json().catch(() => ({}));

      if (response.status === 429 || payload?.error?.status === 'RESOURCE_EXHAUSTED') {
        return { quotaExceeded: true as const, status: 429, payload };
      }

      if (!response.ok) {
        return { ok: false as const, status: response.status, payload };
      }

      return { ok: true as const, places: Array.isArray(payload.places) ? payload.places : [] };
    };

    let result = await queryNearby(radiusMeters);
    if ('quotaExceeded' in result && result.quotaExceeded) {
      return res.status(429).json({
        error: 'QUOTA_EXCEEDED',
        quotaExceeded: true,
        message: 'Google Maps Platform quota reached.',
      });
    }

    if (!result.ok) {
      console.error('Places Nearby Error:', result.status, result.payload);
      return res.status(result.status >= 400 && result.status < 600 ? result.status : 502).json({
        error: 'PLACES_API_ERROR',
        message: result.payload?.error?.message || 'Failed to retrieve nearby hospitals.',
      });
    }

    // In rural areas, automatically widen radius to 50km if 20km returns 0 hospitals
    if (result.places.length === 0 && radiusMeters < 50000) {
      const widened = await queryNearby(50000);
      if ('quotaExceeded' in widened && widened.quotaExceeded) {
        return res.status(429).json({
          error: 'QUOTA_EXCEEDED',
          quotaExceeded: true,
          message: 'Google Maps Platform quota reached.',
        });
      }
      if (widened.ok) {
        result = widened;
      }
    }

    const hospitals = result.places
      .filter((p: any) => p.businessStatus !== 'CLOSED_PERMANENTLY')
      .map((p: any) => {
        const phone = p.nationalPhoneNumber || p.internationalPhoneNumber || undefined;
        const dialSource = p.internationalPhoneNumber || p.nationalPhoneNumber || '';
        const sanitizedDial = dialSource.replace(/[^+\d]/g, '');
        const loc = p.location;
        const distanceKm =
          loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number'
            ? Number(haversineDistanceKm(latitude, longitude, loc.latitude, loc.longitude).toFixed(1))
            : 0;

        return {
          id: p.id || Math.random().toString(36).slice(2),
          name: p.displayName?.text || 'Nearby Hospital',
          address: p.shortFormattedAddress || p.formattedAddress || 'Address unavailable',
          phone,
          internationalPhone: p.internationalPhoneNumber,
          telHref: sanitizedDial ? `tel:${sanitizedDial}` : undefined,
          distanceKm,
          openNow: typeof p.currentOpeningHours?.openNow === 'boolean' ? p.currentOpeningHours.openNow : undefined,
          googleMapsUri: p.googleMapsUri,
          location: loc ? { latitude: loc.latitude, longitude: loc.longitude } : undefined,
        };
      })
      .sort((a: any, b: any) => {
        if (Boolean(a.telHref) !== Boolean(b.telHref)) {
          return a.telHref ? -1 : 1;
        }
        return a.distanceKm - b.distanceKm;
      })
      .slice(0, 10);

    res.json({ hospitals });
  } catch (error: any) {
    console.error('Nearby hospitals lookup error:', error);
    res.status(500).json({
      error: 'NEARBY_HOSPITALS_FAILED',
      message: error.message || 'Unknown error querying nearby hospitals',
    });
  }
});

// Gemini Analysis API
app.post('/api/analyze', async (req: Request, res: Response) => {
  try {
    const { features, symptoms, groundTruth, feedbackExamples, language = 'en' } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: 'API_KEY_NOT_CONFIGURED',
        message: 'No GEMINI_API_KEY configured on server. Falling back to on-device engine.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const langInstruction =
      language === 'hi'
        ? 'Write the plainExplanation and recommendation in simple, colloquial Hindi (Devanagari script) suitable for rural ASHA health workers.'
        : language === 'bn'
        ? 'Write the plainExplanation and recommendation in simple, colloquial Bengali (Bangla script) suitable for rural ASHA health workers.'
        : 'Write the plainExplanation and recommendation in clear, plain simple English suitable for rural health workers.';

    let fewShotContext = '';
    if (Array.isArray(feedbackExamples) && feedbackExamples.length > 0) {
      fewShotContext = `\nDoctor Validated Feedback from Prior Cases:\n${feedbackExamples
        .slice(0, 5)
        .map(
          (ex: any) =>
            `- Case: Rate=${ex.features?.breathingRate} bpm, Coughs=${ex.features?.coughCount}, Symptoms=${JSON.stringify(
              ex.symptoms || {}
            )} => Doctor diagnosed: ${ex.doctorFinding || ex.predictedCondition} (Triage: ${ex.predictedTriage})`
        )
        .join('\n')}\n`;
    }

    const prompt = `You are AuraPhragm Clinical AI, an expert multi-sensor respiratory triage screening assistant built for research and rural India health workers.
You analyze chest-wall accelerometer/gyroscope motion (MPU6050), digital I2S microphone acoustic features (INMP441), optional conditioned piezoelectric vibration (Piezo GPIO34, if active), contact skin temperature (DS18B20 - skin/contact only, NOT core body temperature), and experimental optical PPG pulse/SpO2 (MAX30102), plus patient symptoms.
IMPORTANT MEDICAL SAFETY CONSTRAINTS:
1. AuraPhragm is a student/research prototype. NEVER say a patient "has" a disease. Strictly use expressions like "pattern similar to" and "suspected".
2. Treat MAX30102 SpO2/HR as experimental and DS18B20 as skin/contact temperature only; do not diagnose fever or hypoxemia solely from uncalibrated prototype readings.
3. If red flags are present (breathing rate > 30 or < 8, severe repeated bouts > 4, coughing blood, blue lips, severe breathlessness, cough > 3 weeks), overallTriage MUST be "MEDICAL_HELP_NEEDED".
4. For borderline cases without red flags, use "MONITOR_RETEST".
5. For normal rhythmic breathing (12-20 bpm) with no red flags and minimal coughs, use "MEDICAL_HELP_NOT_NEEDED".
${fewShotContext}
Patient Measured Biometrics:
- Respiration Rate (MPU6050 proxy): ${features?.breathingRate ?? 'Unknown'} bpm (normal: 12-20)
- Inspiration to Expiration (I:E) Ratio: ${features?.inspirationExpirationRatio ?? '1:2.0'}
- Breath Depth / Amplitude: ${features?.breathDepth ?? 'Normal'}
- Cough Count: ${features?.coughCount ?? 0}
- Cough Rate: ${features?.coughRatePerHour ?? 0} / hr
- Cough Duration (avg): ${features?.avgCoughDurationMs ?? 0} ms
- Dominant Frequency: ${features?.dominantFrequency ?? 0} Hz
- Acoustic Spectral Centroid (INMP441): ${features?.spectralCentroid ?? 0} Hz
- DS18B20 Skin/Contact Temperature: ${features?.avgContactTempC !== null && features?.avgContactTempC !== undefined ? `${features.avgContactTempC} C (skin/contact only)` : 'Unavailable'}
- MAX30102 Optical PPG (Experimental): ${features?.avgHeartRateBpm !== null && features?.avgHeartRateBpm !== undefined ? `HR=${features.avgHeartRateBpm} bpm, SpO2=${features?.avgSpo2Pct ?? 'NA'}%` : 'Unavailable'}
- Piezo Channel Status: ${features?.activeSensors?.piezo ?? 'disabled'}
- Signal Quality Index: ${features?.signalQuality?.score ?? 80}% (${features?.signalQuality?.status ?? 'good'})
${groundTruth ? `- Simulated Scenario Reference: ${groundTruth}` : ''}

Patient Reported Symptoms:
- Fever: ${symptoms?.fever ? 'Yes' : 'No'}
- Cough Duration: ${symptoms?.coughDuration || '<1_week'}
- Blood in Sputum: ${symptoms?.bloodInSputum ? 'YES (CRITICAL)' : 'No'}
- Severe Breathlessness: ${symptoms?.severeBreathlessness ? 'YES (CRITICAL)' : 'No'}
- Blue Lips / Fingertips: ${symptoms?.blueLips ? 'YES (EMERGENCY)' : 'No'}
- Unexplained Weight Loss / Night Sweats: ${symptoms?.weightLoss ? 'Yes' : 'No'}
- Smoking History: ${symptoms?.smokingHistory ? 'Yes' : 'No'}
- Known TB Contact: ${symptoms?.tbContact ? 'Yes' : 'No'}

Language Instruction: ${langInstruction}`;

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('GEMINI_REQUEST_TIMEOUT')), 20000)
    );

    const callPromise = ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction:
          'You are an expert respiratory screening model for rural health triage. Output strictly valid JSON conforming to the schema. Do not include markdown code block syntax.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            coughType: {
              type: Type.STRING,
              description: 'Classified cough acoustic/vibration type: Dry, Wet/Productive, Barking/Croupy, Whooping/Paroxysmal, or None/Minimal',
            },
            confidence: {
              type: Type.NUMBER,
              description: 'Confidence percentage between 0 and 100',
            },
            overallTriage: {
              type: Type.STRING,
              description: 'Must be one of: MEDICAL_HELP_NEEDED, MEDICAL_HELP_NOT_NEEDED, or MONITOR_RETEST',
            },
            plainExplanation: {
              type: Type.STRING,
              description: 'Short 2-3 sentence plain language explanation of findings in requested language',
            },
            recommendation: {
              type: Type.STRING,
              description: 'Actionable guidance for the health worker/patient',
            },
            redFlagsDetected: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'List of any dangerous indicators found',
            },
            suspectedConditions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  condition: { type: Type.STRING, description: 'E.g. Normal respiratory pattern, Asthma-like pattern, COPD-like pattern, Acute Bronchitis, Pneumonia-like pattern, TB-suspect pattern, Whooping-cough-like' },
                  probability: { type: Type.NUMBER, description: 'Probability percentage 0-100' },
                  description: { type: Type.STRING, description: 'Brief observation' },
                  tag: { type: Type.STRING, description: 'normal | caution | warning | urgent' },
                },
                required: ['condition', 'probability', 'description', 'tag'],
              },
            },
            modelVersion: {
              type: Type.STRING,
              description: 'Version tag: v2.0-gemini-4-hydrogen',
            },
          },
          required: [
            'coughType',
            'confidence',
            'overallTriage',
            'plainExplanation',
            'recommendation',
            'redFlagsDetected',
            'suspectedConditions',
            'modelVersion',
          ],
        },
      },
    });

    const response: any = await Promise.race([callPromise, timeoutPromise]);


    const responseText = response.text || '{}';
    const parsed = JSON.parse(responseText);
    res.json(parsed);
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.status(500).json({
      error: 'GEMINI_CALL_FAILED',
      message: error.message || 'Unknown error during Gemini analysis',
    });
  }
});

function createGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getLangInstruction(language: string) {
  if (language === 'hi') {
    return 'Respond in clear, accessible Hindi (Devanagari script) suitable for rural India community health workers and patients.';
  }
  if (language === 'bn') {
    return 'Respond in clear, accessible Bengali (Bangla script) suitable for rural community health workers and patients.';
  }
  return 'Respond in clear, structured English suitable for biomedical engineers and community health workers.';
}

// Gemini AI Copilot Multi-Turn Chat (/api/ai/chat)
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const ai = createGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'API_KEY_NOT_CONFIGURED',
        message: 'GEMINI_API_KEY is not configured on the server.',
      });
    }

    const { message, history = [], context = {}, language = 'en' } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'INVALID_MESSAGE', message: 'A non-empty message is required.' });
    }

    const systemInstruction = `You are AuraPhragm AI Copilot, an embedded respiratory screening & hardware engineering assistant.
AuraPhragm v2.1 (Protocol AP2) runs on an ESP32 DevKit V1 (30-Pin):
- MPU6050 (0x68, GPIO21/22): 50 Hz chest-wall motion using orientation-independent 3-axis vector magnitude delta (F-04).
- INMP441 (GPIO14/33/32, L/R=GND): 16 kHz I2S digital microphone using 256-sample DMA chunks into a 512-sample sliding ring window (Core v2 & v3 compatible, F-01/F-02).
- DS18B20 (GPIO4 + 4.7k pull-up): skin/contact temperature ONLY (never core body temperature).
- MAX30102 (0x57): experimental optical HR/SpO2, resets cleanly when IR < 50,000 (F-03).
- Piezo disc (GPIO34): isolated by default (#define ENABLE_PIEZO_ADC 0) until a 0-3.3V clamped AFE is bench-verified.
- SSD1306 OLED (0x3C) + Common-Cathode RGB LED (GPIO25/26/27). BLE supports RX commands: RESET_COUGH, RESET_RESP, LED_TEST, PING.

SAFETY GUARDRAILS:
1. Never diagnose diseases definitively. Use "pattern similar to" or "suspected".
2. Highlight red flags (rate >30 or <8 bpm, coughing blood, blue lips, severe breathlessness, >3 weeks cough) immediately.
3. ${getLangInstruction(language)}`;

    const telemetrySummary = `Live Telemetry Snapshot:
- Source: ${context.isSimulated ? 'Multi-Sensor Simulator (AP2)' : 'ESP32 BLE Hardware (AP2)'}
- Patient: ${context.patient ? `${context.patient.name} (${context.patient.age}y, ${context.patient.gender}, ${context.patient.village})` : 'Not specified'}
- Live Features: RespRate=${context.features?.breathingRate ?? 'NA'} bpm, Coughs=${context.features?.coughCount ?? 0}, Centroid=${context.features?.spectralCentroid ?? 0} Hz, SQI=${context.features?.signalQuality?.status ?? 'unknown'} (${context.features?.signalQuality?.score ?? 0}%)
- Aux Sensors: ContactTemp=${context.features?.avgContactTempC ?? 'NA'} C, PPG* HR=${context.features?.avgHeartRateBpm ?? 'NA'} / SpO2=${context.features?.avgSpo2Pct ?? 'NA'}%
- Active Flags: ${JSON.stringify(context.features?.activeSensors || {})}
- Latest Screening Result: ${context.lastResult ? `${context.lastResult.overallTriage} | Cough=${context.lastResult.coughType} | Conf=${context.lastResult.confidence}% | Explanation=${context.lastResult.plainExplanation}` : 'None yet'}`;

    const safeHistory = Array.isArray(history)
      ? history.slice(-8).map((h: any) => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: String(h.content || '') }],
        }))
      : [];

    const contents = [
      ...safeHistory,
      {
        role: 'user',
        parts: [{ text: `${telemetrySummary}\n\nUser Question: ${message}` }],
      },
    ];

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('GEMINI_CHAT_TIMEOUT')), 25000)
    );

    const callPromise = ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: 'Helpful, medically safe answer tailored to telemetry, triage results, or ESP32 hardware context',
            },
            suggestedFollowups: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2-3 concise follow-up questions the user can click next',
            },
          },
          required: ['reply', 'suggestedFollowups'],
        },
      },
    });

    const response: any = await Promise.race([callPromise, timeoutPromise]);
    const parsed = JSON.parse(response.text || '{}');
    res.json({
      reply: parsed.reply || 'No response generated.',
      suggestedFollowups: Array.isArray(parsed.suggestedFollowups) ? parsed.suggestedFollowups.slice(0, 3) : [],
    });
  } catch (error: any) {
    console.error('Gemini AI Chat Error:', error);
    res.status(500).json({
      error: 'GEMINI_CHAT_FAILED',
      message: error.message || 'Failed to generate AI Copilot response',
    });
  }
});

// Multimodal Audio Acoustic Analyzer (/api/ai/analyze-audio)
app.post('/api/ai/analyze-audio', async (req: Request, res: Response) => {
  try {
    const ai = createGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'API_KEY_NOT_CONFIGURED',
        message: 'GEMINI_API_KEY is not configured on the server.',
      });
    }

    const { audioBase64, mimeType, features, language = 'en' } = req.body || {};
    if (!audioBase64 || typeof audioBase64 !== 'string' || !mimeType) {
      return res.status(400).json({
        error: 'INVALID_AUDIO_PAYLOAD',
        message: 'Base64 audio data and mimeType are required.',
      });
    }

    const prompt = `Analyze this recorded respiratory/cough audio clip alongside AuraPhragm belt features:
- Belt Respiration Rate: ${features?.breathingRate ?? 'NA'} bpm
- Belt Cough Events Detected: ${features?.coughCount ?? 0}
- Belt Spectral Centroid (INMP441): ${features?.spectralCentroid ?? 0} Hz
- Belt Signal Quality: ${features?.signalQuality?.status ?? 'unknown'}

Instructions:
1. Listen closely for dry coughs, wet/productive rattles, wheezing, stridor, paroxysmal/whooping bouts, or ambient noise.
2. NEVER diagnose a disease definitively—describe acoustic patterns only and correlate with the belt telemetry.
3. Flag immediate referral signs if severe respiratory distress sounds (stridor, severe wheeze, prolonged paroxysms) are audible.
4. ${getLangInstruction(language)}`;

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('GEMINI_AUDIO_TIMEOUT')), 30000)
    );

    const callPromise = ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: audioBase64,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction:
          'You are a non-diagnostic respiratory acoustic screening analyzer. Output strictly valid JSON matching the requested schema.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            coughClassification: { type: Type.STRING, description: 'E.g. Dry Cough Pattern, Wet/Productive Pattern, Wheeze-Like, Ambient/No Cough' },
            soundObservations: { type: Type.STRING, description: 'Detailed acoustic timbre, crackle/wheeze/burst observations from the clip' },
            breathingAcousticNotes: { type: Type.STRING, description: 'Inspiration/expiration sound observations' },
            correlationWithBelt: { type: Type.STRING, description: 'How audio clip compares with AuraPhragm belt metrics' },
            confidenceNote: { type: Type.STRING, description: 'Recording clarity, mic clipping, or noise caveats' },
            screeningGuidance: { type: Type.STRING, description: 'Safe next-step screening recommendation (non-diagnostic)' },
            warningFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
            modelVersion: { type: Type.STRING },
          },
          required: [
            'coughClassification',
            'soundObservations',
            'breathingAcousticNotes',
            'correlationWithBelt',
            'confidenceNote',
            'screeningGuidance',
            'warningFlags',
            'modelVersion',
          ],
        },
      },
    });

    const response: any = await Promise.race([callPromise, timeoutPromise]);
    const parsed = JSON.parse(response.text || '{}');
    res.json({
      ...parsed,
      modelVersion: parsed.modelVersion || 'v2.1-gemini-4-hydrogen-audio',
    });
  } catch (error: any) {
    console.error('Gemini Audio Analysis Error:', error);
    res.status(500).json({
      error: 'GEMINI_AUDIO_FAILED',
      message: error.message || 'Failed to analyze audio clip',
    });
  }
});

// Longitudinal Clinical Session & PHC Handover Brief (/api/ai/session-brief)
app.post('/api/ai/session-brief', async (req: Request, res: Response) => {
  try {
    const ai = createGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'API_KEY_NOT_CONFIGURED',
        message: 'GEMINI_API_KEY is not configured on the server.',
      });
    }

    const { tests = [], feedback = [], patient, language = 'en' } = req.body || {};
    if (!Array.isArray(tests) || tests.length === 0) {
      return res.status(400).json({
        error: 'NO_TESTS_PROVIDED',
        message: 'At least one saved screening session is required to generate a handover brief.',
      });
    }

    const compactTests = tests.slice(0, 12).map((t: any) => ({
      timestamp: t.timestamp,
      triage: t.overallTriage,
      coughType: t.coughType,
      respBpm: t.features?.breathingRate,
      coughs: t.features?.coughCount,
      centroidHz: t.features?.spectralCentroid,
      contactTempC: t.features?.avgContactTempC,
      expPpgHr: t.features?.avgHeartRateBpm,
      expPpgSpo2: t.features?.avgSpo2Pct,
      redFlags: t.redFlagsDetected,
      simulated: t.isSimulated,
    }));

    const compactFeedback = Array.isArray(feedback)
      ? feedback.slice(0, 6).map((f: any) => ({
          vote: f.userFeedback,
          doctorFinding: f.doctorFinding,
          notes: f.clinicalNotes,
        }))
      : [];

    const prompt = `Generate a concise longitudinal PHC doctor referral & session summary brief for:
Patient: ${patient ? `${patient.name}, ${patient.age}y ${patient.gender}, Village: ${patient.village}` : 'Unknown Patient'}
Screening Sessions (newest first): ${JSON.stringify(compactTests)}
Clinician/ASHA Feedback: ${JSON.stringify(compactFeedback)}

Constraints:
- Prototype data only; label DS18B20 as skin/contact temp and MAX30102 HR/SpO2 as experimental.
- Note clearly if sessions were simulated vs hardware belt recordings.
- ${getLangInstruction(language)}`;

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('GEMINI_BRIEF_TIMEOUT')), 25000)
    );

    const callPromise = ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction:
          'You synthesize longitudinal respiratory prototype screening sessions into structured, non-diagnostic PHC handover briefs. Output valid JSON.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            trendSummary: { type: Type.STRING, description: 'Concise longitudinal pattern narrative across sessions' },
            clinicalHandoverNote: { type: Type.STRING, description: 'Structured PHC referral paragraph citing respiration, cough bursts, and symptom trajectory' },
            keyMetricsTrend: { type: Type.ARRAY, items: { type: Type.STRING } },
            followUpQuestionsForDoctor: { type: Type.ARRAY, items: { type: Type.STRING } },
            modelVersion: { type: Type.STRING },
          },
          required: ['trendSummary', 'clinicalHandoverNote', 'keyMetricsTrend', 'followUpQuestionsForDoctor', 'modelVersion'],
        },
      },
    });

    const response: any = await Promise.race([callPromise, timeoutPromise]);
    const parsed = JSON.parse(response.text || '{}');
    res.json({
      ...parsed,
      modelVersion: parsed.modelVersion || 'v2.1-gemini-4-hydrogen-brief',
    });
  } catch (error: any) {
    console.error('Gemini Session Brief Error:', error);
    res.status(500).json({
      error: 'GEMINI_BRIEF_FAILED',
      message: error.message || 'Failed to synthesize clinical handover brief',
    });
  }
});

async function startServer() {
  const httpServer = http.createServer(app);

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`AuraPhragm server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
