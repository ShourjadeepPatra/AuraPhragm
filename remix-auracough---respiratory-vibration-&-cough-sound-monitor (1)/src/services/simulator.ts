import {
  SensorPacket,
  SensorStatusMap,
  SimulationConfig,
  SimulationScenario,
} from '../types';

export interface ScenarioDetail {
  name: string;
  category: 'Cough Acoustic Variants' | 'Abnormal Breathing Wavelengths' | 'System & Quality';
  description: string;
  groundTruthDiagnosis: string;
  expectedBpm: number;
  expectedCoughType: string;
  waveType: string;
  acousticFrequencyRange: string;
  typicalTriage: 'MEDICAL_HELP_NEEDED' | 'MEDICAL_HELP_NOT_NEEDED' | 'MONITOR_RETEST';
}

export const SCENARIO_METADATA: Record<SimulationScenario, ScenarioDetail> = {
  normal: {
    name: 'Normal Rhythmic Breathing',
    category: 'Abnormal Breathing Wavelengths',
    description: '15 bpm regular tidal breathing, quiet INMP441 baseline, balanced I:E ratio 1:2, no cough events.',
    groundTruthDiagnosis: 'Normal healthy respiratory pattern',
    expectedBpm: 15,
    expectedCoughType: 'None',
    waveType: 'Smooth sinusoidal tidal wave (0.25 Hz)',
    acousticFrequencyRange: '100 – 300 Hz (Quiet airflow)',
    typicalTriage: 'MEDICAL_HELP_NOT_NEEDED',
  },
  fast_shallow: {
    name: 'Fast / Shallow Tachypnea',
    category: 'Abnormal Breathing Wavelengths',
    description: '34 bpm rapid shallow breathing, low tidal displacement amplitude, compensatory respiratory distress.',
    groundTruthDiagnosis: 'Tachypnea / Respiratory distress pattern',
    expectedBpm: 34,
    expectedCoughType: 'None',
    waveType: 'High-frequency low-amplitude sinusoidal wave (0.57 Hz)',
    acousticFrequencyRange: '180 – 650 Hz (Rapid airflow)',
    typicalTriage: 'MEDICAL_HELP_NEEDED',
  },
  wheeze: {
    name: 'Wheeze-like Breathing (Asthma/COPD)',
    category: 'Abnormal Breathing Wavelengths',
    description: 'Prolonged expiratory phase (I:E 1:3.2) with musical INMP441 harmonic bands during exhalation.',
    groundTruthDiagnosis: 'Bronchospasm / Asthma-like wheeze pattern',
    expectedBpm: 22,
    expectedCoughType: 'Dry/Irritative',
    waveType: 'Asymmetric sawtooth wave with expiratory flutter',
    acousticFrequencyRange: '320 – 950 Hz (Musical Harmonics)',
    typicalTriage: 'MONITOR_RETEST',
  },
  stridor: {
    name: 'Inspiratory Stridor (Upper Airway Obstruction)',
    category: 'Abnormal Breathing Wavelengths',
    description: 'High-pitched continuous monophonic crowing captured on INMP441 and chest retraction during inhalation.',
    groundTruthDiagnosis: 'Stridor / Laryngeal upper airway obstruction pattern',
    expectedBpm: 26,
    expectedCoughType: 'Stridor/Harsh',
    waveType: 'Inspiratory plateau with high-frequency acoustic flutter',
    acousticFrequencyRange: '900 – 2200 Hz (Harsh Monophonic)',
    typicalTriage: 'MEDICAL_HELP_NEEDED',
  },
  crackles_rales: {
    name: 'Crackles / Rales (Alveolar Fluid / Pneumonia)',
    category: 'Abnormal Breathing Wavelengths',
    description: 'Discontinuous explosive micro-clicks during mid-to-late inspiration as fluid-filled alveoli pop open.',
    groundTruthDiagnosis: 'Fine/Coarse Crackles (Pneumonia or Pulmonary Edema pattern)',
    expectedBpm: 25,
    expectedCoughType: 'Productive/Crackling',
    waveType: 'Rhythmic breath superimposed with explosive acoustic impulses',
    acousticFrequencyRange: '450 – 1800 Hz (Explosive Popping Clicks)',
    typicalTriage: 'MEDICAL_HELP_NEEDED',
  },
  cheyne_stokes: {
    name: 'Cheyne-Stokes Periodic Breathing',
    category: 'Abnormal Breathing Wavelengths',
    description: 'Undulating periodic breathing: waxing and waning crescendo-decrescendo tidal wave followed by central apnea flatline.',
    groundTruthDiagnosis: 'Cheyne-Stokes periodic breathing pattern (Central neurological/cardiac)',
    expectedBpm: 18,
    expectedCoughType: 'None',
    waveType: 'Modulated amplitude envelope with recurring flatline apnea periods',
    acousticFrequencyRange: '100 – 400 Hz Envelope',
    typicalTriage: 'MEDICAL_HELP_NEEDED',
  },
  kussmaul: {
    name: 'Kussmaul Breathing (Deep Sighing Hyperventilation)',
    category: 'Abnormal Breathing Wavelengths',
    description: 'Deep, labored, rapid sighing breathing (~28 bpm) with massive chest excursion amplitude.',
    groundTruthDiagnosis: 'Kussmaul hyperventilation pattern',
    expectedBpm: 28,
    expectedCoughType: 'None',
    waveType: 'Large-amplitude steep-slope excursion wave',
    acousticFrequencyRange: '220 – 900 Hz (High Airflow Energy)',
    typicalTriage: 'MEDICAL_HELP_NEEDED',
  },
  dry_cough: {
    name: 'Dry Irritative Cough',
    category: 'Cough Acoustic Variants',
    description: 'Sharp, violent high-frequency acoustic/vibration spikes (90–140 ms) with abrupt diaphragm dip.',
    groundTruthDiagnosis: 'Acute dry cough / upper airway irritation',
    expectedBpm: 18,
    expectedCoughType: 'Dry',
    waveType: 'Isolated high-gradient transient impulse spike (90–130 ms)',
    acousticFrequencyRange: '600 – 2400 Hz (Sharp Crack)',
    typicalTriage: 'MONITOR_RETEST',
  },
  wet_cough: {
    name: 'Wet / Productive Rattling Cough',
    category: 'Cough Acoustic Variants',
    description: 'Multi-peaked acoustic bursts (280–450 ms) with low-frequency mucosal rattling vibrations.',
    groundTruthDiagnosis: 'Productive bronchitis / lower airway mucus pattern',
    expectedBpm: 24,
    expectedCoughType: 'Wet/Productive',
    waveType: 'Multi-lobed oscillatory burst with mucosal frequency damping',
    acousticFrequencyRange: '140 – 550 Hz (Low Mucus Rumble)',
    typicalTriage: 'MEDICAL_HELP_NEEDED',
  },
  barking_croup: {
    name: 'Barking / Croupy Cough (Laryngotracheobronchitis)',
    category: 'Cough Acoustic Variants',
    description: 'Harsh metallic brassy resonant blast with subglottic vibration and inspiratory stridor.',
    groundTruthDiagnosis: 'Croup / Laryngotracheobronchitis barking pattern',
    expectedBpm: 26,
    expectedCoughType: 'Barking/Croupy',
    waveType: 'High-amplitude brassy resonant burst',
    acousticFrequencyRange: '300 – 1100 Hz (Brassy Resonance)',
    typicalTriage: 'MEDICAL_HELP_NEEDED',
  },
  whooping: {
    name: 'Whooping / Paroxysmal Bouts (Pertussis)',
    category: 'Cough Acoustic Variants',
    description: 'Barrage of staccato coughs terminated by a prolonged high-pitched inspiratory whoop gasp.',
    groundTruthDiagnosis: 'Pertussis-like / Paroxysmal whooping cough pattern',
    expectedBpm: 32,
    expectedCoughType: 'Whooping/Paroxysmal',
    waveType: 'Rapid staccato train followed by high-frequency inspiratory whoop',
    acousticFrequencyRange: '1100 – 2800 Hz (High-Pitch Whoop)',
    typicalTriage: 'MEDICAL_HELP_NEEDED',
  },
  spasmodic: {
    name: 'Spasmodic Paroxysmal Cough (Diaphragm Spasm)',
    category: 'Cough Acoustic Variants',
    description: 'Sudden uncontrollable paroxysms with violent diaphragmatic recoil and high acceleration jerk.',
    groundTruthDiagnosis: 'Severe spasmodic cough with chest muscle strain',
    expectedBpm: 26,
    expectedCoughType: 'Spasmodic',
    waveType: 'Violent multi-spike cluster with negative acceleration jerk (-1.8g)',
    acousticFrequencyRange: '350 – 1600 Hz',
    typicalTriage: 'MEDICAL_HELP_NEEDED',
  },
  chronic_bouts: {
    name: 'Chronic Repeated Cough Bouts',
    category: 'Cough Acoustic Variants',
    description: 'Frequent paroxysmal cough bouts with prolonged tachypneic recovery cycles (TB / chronic lung risk).',
    groundTruthDiagnosis: 'Severe chronic cough pattern (TB/COPD evaluation indicated)',
    expectedBpm: 28,
    expectedCoughType: 'Mixed/Chronic',
    waveType: 'Recurring multi-cough trains interspersed with tachypnea',
    acousticFrequencyRange: '250 – 1400 Hz',
    typicalTriage: 'MEDICAL_HELP_NEEDED',
  },
  loose_belt_noisy: {
    name: 'No Signal / Loose Belt / High Artifact',
    category: 'System & Quality',
    description: 'Poor contact, wandering baseline drift, excessive motion artifact, degraded SQI.',
    groundTruthDiagnosis: 'Inconclusive / Artifact-dominated recording',
    expectedBpm: 12,
    expectedCoughType: 'Artifact',
    waveType: 'Wandering non-periodic chaotic drift + jitter',
    acousticFrequencyRange: 'Broadband Noise (100 – 4000 Hz)',
    typicalTriage: 'MONITOR_RETEST',
  },
};

export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  scenario: 'normal',
  severity: 'moderate',
  noiseLevel: 15,
  beltTightness: 'optimal',
  motionArtifact: 'still',
  rateMultiplier: 1.0,
  enableInmp441: true,
  enableMax30102: true,
  enableDs18b20: true,
  enablePiezoAfe: false, // Safety default OFF matching firmware ENABLE_PIEZO_ADC 0
  contactTempC: 35.8,
};

export class SensorSimulator {
  private config: SimulationConfig;
  private timeStep: number = 0;
  private fs: number = 50;
  private coughTriggerTimer: number = 0;
  private currentCoughPhase: number = 0;
  private coughBoutRemaining: number = 0;
  private simulatedCoughCount: number = 0;

  constructor(initialConfig: SimulationConfig = DEFAULT_SIMULATION_CONFIG) {
    this.config = initialConfig;
  }

  setConfig(newConfig: Partial<SimulationConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): SimulationConfig {
    return this.config;
  }

  generateSample(nowMs: number): SensorPacket {
    this.timeStep++;
    const t = this.timeStep / this.fs;

    const meta = SCENARIO_METADATA[this.config.scenario];
    const targetBpm = meta.expectedBpm * this.config.rateMultiplier;
    const respFreq = targetBpm / 60;

    let respSine: number;
    let baseRespAmplitude = 0.28;

    if (this.config.scenario === 'wheeze') {
      const phase = (t * respFreq) % 1.0;
      respSine = phase < 0.25 ? Math.sin((phase / 0.25) * (Math.PI / 2)) : Math.cos(((phase - 0.25) / 0.75) * (Math.PI / 2));
    } else if (this.config.scenario === 'cheyne_stokes') {
      const envelopePhase = (t % 40) / 40;
      respSine = envelopePhase < 0.7 ? Math.sin(2 * Math.PI * respFreq * t) * Math.sin((envelopePhase / 0.7) * Math.PI) : 0;
    } else if (this.config.scenario === 'kussmaul') {
      respSine = Math.sin(2 * Math.PI * respFreq * t);
      baseRespAmplitude = 0.55;
    } else if (this.config.scenario === 'stridor') {
      const phase = (t * respFreq) % 1.0;
      respSine = phase < 0.6 ? Math.sin((phase / 0.6) * (Math.PI / 2)) : Math.cos(((phase - 0.6) / 0.4) * (Math.PI / 2));
    } else if (this.config.scenario === 'fast_shallow') {
      respSine = Math.sin(2 * Math.PI * respFreq * t);
      baseRespAmplitude = 0.08;
    } else {
      respSine = Math.sin(2 * Math.PI * respFreq * t);
    }

    let beltGain = 1.0;
    if (this.config.beltTightness === 'loose') beltGain = 0.25;
    else if (this.config.beltTightness === 'tight') beltGain = 1.4;

    let severityFactor = 1.0;
    if (this.config.severity === 'mild') severityFactor = 0.7;
    else if (this.config.severity === 'severe') severityFactor = 1.4;

    let motionNoiseAx = 0;
    let motionNoiseAy = 0;
    let motionNoiseAz = 0;
    if (this.config.motionArtifact === 'talking') {
      motionNoiseAz = Math.sin(t * 14) * 0.08 + Math.cos(t * 22) * 0.05;
    } else if (this.config.motionArtifact === 'walking') {
      motionNoiseAx = Math.sin(t * 2 * Math.PI * 1.8) * 0.35;
      motionNoiseAy = Math.cos(t * 2 * Math.PI * 1.8) * 0.25;
      motionNoiseAz = Math.abs(Math.sin(t * 2 * Math.PI * 1.8)) * 0.45;
    }

    const noiseScale = (this.config.noiseLevel / 100) * 0.15;
    const randNoise = (Math.random() - 0.5) * noiseScale;

    this.coughTriggerTimer += 1 / this.fs;
    let isCoughActive = false;
    let coughImpulse = 0;
    let coughAccelJerk = 0;

    const coughInterval =
      this.config.scenario === 'dry_cough'
        ? 5.5 / severityFactor
        : this.config.scenario === 'wet_cough'
        ? 4.8 / severityFactor
        : this.config.scenario === 'barking_croup'
        ? 6.0 / severityFactor
        : this.config.scenario === 'whooping'
        ? 7.5 / severityFactor
        : this.config.scenario === 'spasmodic'
        ? 5.0 / severityFactor
        : this.config.scenario === 'chronic_bouts'
        ? 4.2 / severityFactor
        : 9999;

    if (this.coughTriggerTimer > coughInterval && this.coughBoutRemaining === 0) {
      this.coughTriggerTimer = 0;
      if (this.config.scenario === 'whooping') this.coughBoutRemaining = 7;
      else if (this.config.scenario === 'spasmodic') this.coughBoutRemaining = 4;
      else if (this.config.scenario === 'chronic_bouts') this.coughBoutRemaining = 5;
      else this.coughBoutRemaining = 1;
      this.currentCoughPhase = 1;
      this.simulatedCoughCount++;
    }

    if (this.coughBoutRemaining > 0) {
      isCoughActive = true;
      this.currentCoughPhase++;
      const idx = this.currentCoughPhase;

      if (this.config.scenario === 'dry_cough') {
        if (idx < 6) {
          coughImpulse = Math.sin((idx / 6) * Math.PI) * 95 * severityFactor;
          coughAccelJerk = -0.55 * Math.sin((idx / 6) * Math.PI) * severityFactor;
        } else {
          this.coughBoutRemaining--;
          this.currentCoughPhase = 0;
        }
      } else if (this.config.scenario === 'wet_cough') {
        if (idx < 16) {
          const env = Math.sin((idx / 16) * Math.PI);
          coughImpulse = (Math.sin(idx * 1.8) * 45 + 80) * env * severityFactor;
          coughAccelJerk = -0.65 * env * severityFactor;
        } else {
          this.coughBoutRemaining--;
          this.currentCoughPhase = 0;
        }
      } else if (this.config.scenario === 'barking_croup') {
        if (idx < 14) {
          const env = Math.sin((idx / 14) * Math.PI);
          coughImpulse = (Math.sin(idx * 0.9) * 115 + 75) * env * severityFactor;
          coughAccelJerk = -0.8 * env * severityFactor;
        } else {
          this.coughBoutRemaining--;
          this.currentCoughPhase = 0;
        }
      } else if (this.config.scenario === 'whooping') {
        const sub = idx % 10;
        if (sub < 5) {
          coughImpulse = Math.sin((sub / 5) * Math.PI) * 125 * severityFactor;
          coughAccelJerk = -0.75 * Math.sin((sub / 5) * Math.PI);
        }
        if (this.coughBoutRemaining === 1 && sub >= 5) {
          coughImpulse = Math.sin(sub * 3.8) * 90 * severityFactor;
        }
        if (idx >= 10) {
          this.coughBoutRemaining--;
          this.currentCoughPhase = 0;
        }
      } else if (this.config.scenario === 'spasmodic') {
        const sub = idx % 12;
        if (sub < 7) {
          coughImpulse = (Math.sin((sub / 7) * Math.PI) * 130 + (Math.random() - 0.5) * 35) * severityFactor;
          coughAccelJerk = -1.1 * Math.sin((sub / 7) * Math.PI) * severityFactor;
        }
        if (idx >= 12) {
          this.coughBoutRemaining--;
          this.currentCoughPhase = 0;
        }
      } else if (this.config.scenario === 'chronic_bouts') {
        const sub = idx % 12;
        if (sub < 6) {
          coughImpulse = (Math.sin((sub / 6) * Math.PI) * 90 + (Math.random() - 0.5) * 30) * severityFactor;
          coughAccelJerk = -0.55 * Math.sin((sub / 6) * Math.PI);
        }
        if (idx >= 12) {
          this.coughBoutRemaining--;
          this.currentCoughPhase = 0;
        }
      }
    }

    let acousticVibration = 0;
    if (this.config.scenario === 'wheeze' && respSine < 0) {
      acousticVibration += Math.sin(t * 2 * Math.PI * 18) * 42 * severityFactor * Math.abs(respSine);
    }
    if (this.config.scenario === 'stridor' && respSine > 0) {
      acousticVibration += (Math.sin(t * 2 * Math.PI * 22) * 50 + Math.sin(t * 2 * Math.PI * 14) * 25) * severityFactor * respSine;
    }
    if (this.config.scenario === 'crackles_rales' && respSine > 0.4 && Math.random() > 0.65) {
      acousticVibration += (Math.random() > 0.5 ? 1 : -1) * (50 + Math.random() * 60) * severityFactor;
    }

    let drift = 0;
    if (this.config.scenario === 'loose_belt_noisy') {
      drift = Math.sin(t * 0.15) * 0.4 + (Math.random() - 0.5) * 0.35;
      beltGain = 0.2;
    }

    const az = 0.98 + respSine * baseRespAmplitude * beltGain * severityFactor + coughAccelJerk + motionNoiseAz + drift + randNoise;
    const ax = 0.04 + motionNoiseAx + randNoise * 0.5;
    const ay = 0.02 + motionNoiseAy + randNoise * 0.5;
    const gx = motionNoiseAx * 15 + (Math.random() - 0.5) * 2;
    const gy = motionNoiseAy * 15 + (Math.random() - 0.5) * 2;
    const gz = respSine * 4 + (Math.random() - 0.5) * 2;

    // INMP441 I2S digital audio frame synthesis (16 kHz summary)
    const audioBase = 10 + this.config.noiseLevel * 0.25;
    const audioDynamic = Math.abs(coughImpulse) * 1.45 + Math.abs(acousticVibration) * 0.95;
    const audioRms = this.config.enableInmp441 ? parseFloat((audioBase + audioDynamic).toFixed(1)) : 0;
    const audioPeak = this.config.enableInmp441 ? parseFloat((audioRms * 1.65).toFixed(1)) : 0;

    let bandLow = 8;
    let bandMid = 5;
    let bandHigh = 3;
    let centroid = 260;

    if (this.config.enableInmp441) {
      if (this.config.scenario === 'wet_cough' || this.config.scenario === 'barking_croup') {
        bandLow = 25 + audioDynamic * 0.65;
        bandMid = 18 + audioDynamic * 0.35;
        bandHigh = 8 + audioDynamic * 0.12;
        centroid = isCoughActive ? 390 : 240;
      } else if (this.config.scenario === 'whooping' || this.config.scenario === 'stridor') {
        bandLow = 10 + audioDynamic * 0.15;
        bandMid = 22 + audioDynamic * 0.35;
        bandHigh = 35 + audioDynamic * 0.7;
        centroid = isCoughActive || acousticVibration > 15 ? 1680 : 420;
      } else if (this.config.scenario === 'dry_cough' || this.config.scenario === 'wheeze') {
        bandLow = 12 + audioDynamic * 0.25;
        bandMid = 28 + audioDynamic * 0.6;
        bandHigh = 24 + audioDynamic * 0.45;
        centroid = isCoughActive || acousticVibration > 10 ? 940 : 320;
      } else {
        bandLow = 10 + audioDynamic * 0.35;
        bandMid = 9 + audioDynamic * 0.3;
        bandHigh = 6 + audioDynamic * 0.2;
        centroid = 280 + Math.min(800, audioDynamic * 4);
      }
    } else {
      bandLow = 0;
      bandMid = 0;
      bandHigh = 0;
      centroid = 0;
    }

    const audioZcr = this.config.enableInmp441
      ? parseFloat(Math.min(0.48, 0.04 + centroid / 4500).toFixed(3))
      : 0;

    // Piezo ADC: NULL when enablePiezoAfe === false (default safety isolation)
    const piezoNoise = (Math.random() - 0.5) * (this.config.noiseLevel * 1.5 + 8);
    let piezo: number | null = null;
    let piezoFiltered: number | null = null;
    if (this.config.enablePiezoAfe) {
      const rawPiezo = Math.round(2048 + coughImpulse * 12 + acousticVibration + piezoNoise + (isCoughActive ? 160 : 0));
      piezo = Math.max(0, Math.min(4095, rawPiezo));
      piezoFiltered = coughImpulse + acousticVibration + piezoNoise;
    }

    // MAX30102 Experimental PPG (HR & SpO2)
    let heartRateBpm: number | null = null;
    let spo2Pct: number | null = null;
    if (this.config.enableMax30102 && this.config.scenario !== 'loose_belt_noisy') {
      const baseHr =
        this.config.scenario === 'fast_shallow' || this.config.scenario === 'stridor'
          ? 106
          : this.config.scenario === 'whooping' || this.config.scenario === 'chronic_bouts'
          ? 98
          : 76;
      const baseSpo2 =
        this.config.scenario === 'fast_shallow' || this.config.scenario === 'stridor'
          ? 92
          : this.config.scenario === 'crackles_rales' || this.config.scenario === 'cheyne_stokes'
          ? 93
          : 98;
      heartRateBpm = Math.round(baseHr + Math.sin(t * 0.3) * 3);
      spo2Pct = Math.min(100, Math.max(82, Math.round(baseSpo2 + Math.cos(t * 0.2) * 1)));
    }

    // DS18B20 Skin / Contact Temp ONLY
    const contactTempC = this.config.enableDs18b20
      ? parseFloat((this.config.contactTempC + Math.sin(t * 0.05) * 0.1).toFixed(2))
      : null;

    const sensorStatus: SensorStatusMap = {
      mpu6050: 'ok',
      inmp441: this.config.enableInmp441 ? 'ok' : 'disabled',
      max30102: this.config.enableMax30102 && heartRateBpm !== null ? 'ok' : this.config.enableMax30102 ? 'unavailable' : 'disabled',
      ds18b20: this.config.enableDs18b20 ? 'ok' : 'disabled',
      piezo: this.config.enablePiezoAfe ? 'ok' : 'disabled',
      oled: 'ok',
      rgbLed: 'ok',
    };

    let flags = 0x01 | 0x20 | 0x40; // MPU + OLED + RGB
    if (sensorStatus.inmp441 === 'ok') flags |= 0x02;
    if (sensorStatus.max30102 === 'ok') flags |= 0x04;
    if (sensorStatus.ds18b20 === 'ok') flags |= 0x08;
    if (sensorStatus.piezo === 'ok') flags |= 0x10;
    const flagsHex = flags.toString(16).toUpperCase().padStart(2, '0');

    const chestDisplacement = parseFloat(
      (respSine * baseRespAmplitude * beltGain * severityFactor * 14 + (isCoughActive ? -5.0 : 0)).toFixed(2)
    );

    return {
      protocolVersion: 'AP2',
      timestamp: nowMs,
      sequence: this.timeStep,
      deviceTimestampMs: Math.round(t * 1000),
      flagsHex,
      sensorStatus,
      ax: parseFloat(ax.toFixed(4)),
      ay: parseFloat(ay.toFixed(4)),
      az: parseFloat(az.toFixed(4)),
      gx: parseFloat(gx.toFixed(2)),
      gy: parseFloat(gy.toFixed(2)),
      gz: parseFloat(gz.toFixed(2)),
      audioRms,
      audioPeak,
      audioCentroidHz: Math.round(centroid),
      audioZcr,
      audioBands: {
        low: parseFloat(bandLow.toFixed(1)),
        mid: parseFloat(bandMid.toFixed(1)),
        high: parseFloat(bandHigh.toFixed(1)),
      },
      piezo,
      piezoFiltered,
      heartRateBpm,
      spo2Pct,
      contactTempC,
      chestDisplacement,
      breathingWave: respSine * beltGain,
      powerSource: 'USB',
      batteryPct: null,
      coughCountDevice: this.simulatedCoughCount,
      respBpmDevice: Math.round(targetBpm),
      sqiDevice: this.config.scenario === 'loose_belt_noisy' ? 'POOR' : 'GOOD',
      isSimulated: true,
    };
  }
}
