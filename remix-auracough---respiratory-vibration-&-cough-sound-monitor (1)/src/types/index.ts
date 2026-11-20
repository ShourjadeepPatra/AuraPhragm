export type TriageOutcome = 'MEDICAL_HELP_NEEDED' | 'MEDICAL_HELP_NOT_NEEDED' | 'MONITOR_RETEST';

export type SignalQualityStatus = 'good' | 'fair' | 'poor';

export type BleConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export type SensorChannelStatus = 'ok' | 'disabled' | 'fault' | 'unavailable';

export interface SensorStatusMap {
  mpu6050: SensorChannelStatus;
  inmp441: SensorChannelStatus;
  max30102: SensorChannelStatus;
  ds18b20: SensorChannelStatus;
  piezo: SensorChannelStatus;
  oled: SensorChannelStatus;
  rgbLed: SensorChannelStatus;
}

declare global {
  interface Navigator {
    bluetooth?: {
      requestDevice: (options: any) => Promise<any>;
    };
  }
}

export interface SensorPacket {
  protocolVersion: 'AP2';
  timestamp: number;
  sequence: number;
  deviceTimestampMs: number;
  flagsHex: string;
  sensorStatus: SensorStatusMap;
  ax: number; // MPU6050 accelerometer X (g)
  ay: number; // accelerometer Y (g)
  az: number; // accelerometer Z (chest expansion / vibration) (g)
  gx: number; // gyroscope X (deg/s)
  gy: number; // gyroscope Y (deg/s)
  gz: number; // gyroscope Z (deg/s)
  // INMP441 16 kHz I2S digital audio frame summaries
  audioRms: number; // normalized RMS (0 - 4095 equivalent scale or normalized)
  audioPeak: number;
  audioCentroidHz: number;
  audioZcr: number;
  audioBands: {
    low: number; // 100 - 300 Hz
    mid: number; // 300 - 1000 Hz
    high: number; // 1000 - 4000 Hz
  };
  // Piezo ADC (GPIO34) - null when ENABLE_PIEZO_ADC = 0 / safety isolated
  piezo: number | null;
  piezoFiltered: number | null;
  // MAX30102 experimental peripheral optical PPG - null when absent or no contact
  heartRateBpm: number | null;
  spo2Pct: number | null;
  // DS18B20 skin/contact temperature (NOT core body temp) - null when absent/fault
  contactTempC: number | null;
  // Derived & Firmware telemetry
  chestDisplacement: number; // integrated/filtered chest wall displacement (mm)
  breathingWave: number; // 0.1 - 0.8 Hz respiratory band waveform
  powerSource: 'USB' | 'BATTERY';
  batteryPct: number | null;
  coughCountDevice: number | null;
  respBpmDevice: number | null;
  sqiDevice: string | null;
  isSimulated?: boolean;
}

export interface CoughEvent {
  timestamp: number;
  durationMs: number;
  peakAmplitude: number;
  energy: number;
  boutIndex: number;
  source: 'inmp441_imu' | 'piezo_imu' | 'fused';
}

export interface SignalFeatures {
  breathingRate: number; // breaths per minute (bpm)
  inspirationExpirationRatio: string; // e.g. "1:2.0"
  breathDepth: 'Shallow' | 'Normal' | 'Deep';
  breathAmplitudeMm: number;
  coughCount: number;
  coughRatePerHour: number;
  avgCoughDurationMs: number;
  coughEvents: CoughEvent[];
  dominantFrequency: number; // Hz
  spectralCentroid: number; // Hz
  bandEnergies: {
    low: number; // 100 - 300 Hz (INMP441) or 0 - 5 Hz fallback
    mid: number; // 300 - 1000 Hz (INMP441) or 5 - 15 Hz fallback
    high: number; // 1000 - 4000 Hz (INMP441) or 15 - 25 Hz fallback
  };
  zeroCrossingRate: number;
  audioPeakEnergy: number;
  // Multi-sensor auxiliary averages (null = unavailable)
  avgContactTempC: number | null;
  avgHeartRateBpm: number | null;
  avgSpo2Pct: number | null;
  activeSensors: SensorStatusMap;
  signalQuality: {
    score: number; // 0 - 100%
    status: SignalQualityStatus;
    advice: string;
  };
  sampleCount: number;
  rawPacketSampleCount: number;
  durationSeconds: number;
}

export interface SymptomQuestionnaire {
  fever: boolean;
  coughDuration: '<1_week' | '1_to_3_weeks' | '>3_weeks';
  bloodInSputum: boolean;
  severeBreathlessness: boolean;
  blueLips: boolean;
  weightLoss: boolean;
  smokingHistory: boolean;
  tbContact: boolean;
}

export interface SuspectedCondition {
  condition: string;
  probability: number; // 0 - 100%
  description: string;
  tag: 'normal' | 'caution' | 'warning' | 'urgent';
}

export interface AnalysisResult {
  id: string;
  timestamp: string;
  patientId?: string;
  coughType: string; // Dry, Wet/Productive, Barking, Whooping, None
  confidence: number;
  overallTriage: TriageOutcome;
  plainExplanation: string;
  recommendation: string;
  redFlagsDetected: string[];
  suspectedConditions: SuspectedCondition[];
  features: SignalFeatures;
  symptoms: SymptomQuestionnaire;
  modelVersion: string;
  isSimulated: boolean;
  groundTruthLabel?: string;
  engineUsed: 'gemini-4-hydrogen' | 'on-device-rule-fallback';
}

export interface FeedbackRecord {
  id: string;
  testId: string;
  timestamp: string;
  predictedTriage: TriageOutcome;
  predictedCondition: string;
  userFeedback: 'correct' | 'wrong';
  doctorFinding: string;
  clinicalNotes: string;
  features: Partial<SignalFeatures>;
  symptoms: Partial<SymptomQuestionnaire>;
  modelVersion: string;
  groundTruth?: string;
}

export interface PatientProfile {
  id: string;
  name: string;
  age: number;
  gender: 'Female' | 'Male' | 'Other';
  village: string;
  ashaWorkerId?: string;
  notes?: string;
  lastTestDate?: string;
}

export interface CalibrationProfile {
  baselineRestingZ: number;
  gainZ: number;
  audioNoiseFloor: number;
  piezoNoiseFloor: number | null;
  beltTightnessThreshold: number;
  lastCalibrated: string;
}

export type SimulationScenario =
  | 'normal'
  | 'fast_shallow'
  | 'wheeze'
  | 'dry_cough'
  | 'wet_cough'
  | 'barking_croup'
  | 'whooping'
  | 'chronic_bouts'
  | 'stridor'
  | 'crackles_rales'
  | 'cheyne_stokes'
  | 'kussmaul'
  | 'spasmodic'
  | 'loose_belt_noisy';

export interface SimulationConfig {
  scenario: SimulationScenario;
  severity: 'mild' | 'moderate' | 'severe';
  noiseLevel: number; // 0 - 100%
  beltTightness: 'loose' | 'optimal' | 'tight';
  motionArtifact: 'still' | 'talking' | 'walking';
  rateMultiplier: number; // 0.8 - 1.5x
  // Hardware availability toggles for testing AP2 validity & safety states
  enableInmp441: boolean;
  enableMax30102: boolean;
  enableDs18b20: boolean;
  enablePiezoAfe: boolean; // Defaults to false (safety isolated until verified AFE)
  contactTempC: number;
}

export type LocationPermissionStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';

export interface UserCoordinates {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  updatedAt: string;
}

export interface NearbyHospital {
  id: string;
  name: string;
  address: string;
  phone?: string;
  internationalPhone?: string;
  telHref?: string;
  distanceKm: number;
  openNow?: boolean;
  googleMapsUri?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestedFollowups?: string[];
}

export interface AiAudioAnalysisResult {
  coughClassification: string;
  soundObservations: string;
  breathingAcousticNotes: string;
  correlationWithBelt: string;
  confidenceNote: string;
  screeningGuidance: string;
  warningFlags: string[];
  modelVersion: string;
}

export interface AiSessionBrief {
  trendSummary: string;
  clinicalHandoverNote: string;
  keyMetricsTrend: string[];
  followUpQuestionsForDoctor: string[];
  modelVersion: string;
}

