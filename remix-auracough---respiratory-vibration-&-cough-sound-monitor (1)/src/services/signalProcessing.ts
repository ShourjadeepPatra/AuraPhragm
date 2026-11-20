import {
  CoughEvent,
  SensorPacket,
  SensorStatusMap,
  SignalFeatures,
  SignalQualityStatus,
} from '../types';

export class BiquadFilter {
  private b0: number = 1;
  private b1: number = 0;
  private b2: number = 0;
  private a1: number = 0;
  private a2: number = 0;
  private x1: number = 0;
  private x2: number = 0;
  private y1: number = 0;
  private y2: number = 0;

  constructor(type: 'bandpass' | 'highpass' | 'lowpass', fc: number, fs: number, Q: number = 1.0) {
    const w0 = (2 * Math.PI * fc) / fs;
    const alpha = Math.sin(w0) / (2 * Q);
    const cosw0 = Math.cos(w0);

    let a0 = 1;

    if (type === 'bandpass') {
      this.b0 = alpha;
      this.b1 = 0;
      this.b2 = -alpha;
      a0 = 1 + alpha;
      this.a1 = -2 * cosw0;
      this.a2 = 1 - alpha;
    } else if (type === 'highpass') {
      this.b0 = (1 + cosw0) / 2;
      this.b1 = -(1 + cosw0);
      this.b2 = (1 + cosw0) / 2;
      a0 = 1 + alpha;
      this.a1 = -2 * cosw0;
      this.a2 = 1 - alpha;
    } else {
      this.b0 = (1 - cosw0) / 2;
      this.b1 = 1 - cosw0;
      this.b2 = (1 - cosw0) / 2;
      a0 = 1 + alpha;
      this.a1 = -2 * cosw0;
      this.a2 = 1 - alpha;
    }

    this.b0 /= a0;
    this.b1 /= a0;
    this.b2 /= a0;
    this.a1 /= a0;
    this.a2 /= a0;
  }

  process(sample: number): number {
    const y = this.b0 * sample + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = sample;
    this.y2 = this.y1;
    this.y1 = y;
    return Number.isNaN(y) ? 0 : y;
  }

  reset() {
    this.x1 = 0;
    this.x2 = 0;
    this.y1 = 0;
    this.y2 = 0;
  }
}

export function computeFFT(signal: number[]): { freqs: number[]; powers: number[] } {
  const n = 128;
  const input = signal.slice(-n);
  while (input.length < n) input.unshift(0);

  const windowed = input.map((val, i) => val * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1))));
  const real = new Float32Array(windowed);
  const imag = new Float32Array(n);

  let j = 0;
  for (let i = 0; i < n - 1; i++) {
    if (i < j) {
      const tr = real[i];
      const ti = imag[i];
      real[i] = real[j];
      imag[i] = imag[j];
      real[j] = tr;
      imag[j] = ti;
    }
    let k = n >> 1;
    while (k <= j) {
      j -= k;
      k >>= 1;
    }
    j += k;
  }

  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const angle = (-2 * Math.PI) / len;
    const wStepR = Math.cos(angle);
    const wStepI = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let wR = 1;
      let wI = 0;
      for (let k = 0; k < half; k++) {
        const uR = real[i + k];
        const uI = imag[i + k];
        const vR = real[i + k + half] * wR - imag[i + k + half] * wI;
        const vI = real[i + k + half] * wI + imag[i + k + half] * wR;
        real[i + k] = uR + vR;
        imag[i + k] = uI + vI;
        real[i + k + half] = uR - vR;
        imag[i + k + half] = uI - vI;

        const nextWR = wR * wStepR - wI * wStepI;
        const nextWI = wR * wStepI + wI * wStepR;
        wR = nextWR;
        wI = nextWI;
      }
    }
  }

  const numBins = n / 2;
  const freqs: number[] = [];
  const powers: number[] = [];
  const fs = 50;

  for (let i = 0; i < numBins; i++) {
    const freq = (i * fs) / n;
    const mag = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
    freqs.push(freq);
    powers.push(mag);
  }

  return { freqs, powers };
}

const DEFAULT_SENSOR_STATUS: SensorStatusMap = {
  mpu6050: 'unavailable',
  inmp441: 'unavailable',
  max30102: 'unavailable',
  ds18b20: 'unavailable',
  piezo: 'disabled',
  oled: 'unavailable',
  rgbLed: 'unavailable',
};

export class SignalProcessor {
  private respFilter: BiquadFilter;
  private coughFilter: BiquadFilter;
  private fs: number;
  private breathBuffer: number[] = [];
  private audioBuffer: number[] = [];
  private piezoBuffer: number[] = [];
  private coughEvents: CoughEvent[] = [];

  // Hysteresis + Adaptive Noise Floor + 350ms Refractory Cough Segmentation
  private noiseFloor: number = 14;
  private inCough: boolean = false;
  private currentCoughStart: number = 0;
  private currentCoughPeak: number = 0;
  private lastCoughEnd: number = 0;
  private lastCoughTime: number = 0;
  private boutCounter: number = 0;

  // Multi-sensor accumulators
  private rawPacketCount: number = 0;
  private latestSensorStatus: SensorStatusMap = { ...DEFAULT_SENSOR_STATUS };
  private latestCentroidHz: number = 0;
  private latestZcr: number = 0;
  private latestBands = { low: 0, mid: 0, high: 0 };
  private audioPeakEnergy: number = 0;
  private tempSamples: number[] = [];
  private hrSamples: number[] = [];
  private spo2Samples: number[] = [];
  private gyroMotionEnergySum: number = 0;

  constructor(fs: number = 50) {
    this.fs = fs;
    this.respFilter = new BiquadFilter('lowpass', 0.8, fs, 0.707);
    this.coughFilter = new BiquadFilter('bandpass', 15, fs, 1.2);
  }

  reset() {
    this.respFilter.reset();
    this.coughFilter.reset();
    this.breathBuffer = [];
    this.audioBuffer = [];
    this.piezoBuffer = [];
    this.coughEvents = [];
    this.noiseFloor = 14;
    this.inCough = false;
    this.currentCoughStart = 0;
    this.currentCoughPeak = 0;
    this.lastCoughEnd = 0;
    this.lastCoughTime = 0;
    this.boutCounter = 0;
    this.rawPacketCount = 0;
    this.latestSensorStatus = { ...DEFAULT_SENSOR_STATUS };
    this.latestCentroidHz = 0;
    this.latestZcr = 0;
    this.latestBands = { low: 0, mid: 0, high: 0 };
    this.audioPeakEnergy = 0;
    this.tempSamples = [];
    this.hrSamples = [];
    this.spo2Samples = [];
    this.gyroMotionEnergySum = 0;
  }

  processPacket(packet: SensorPacket): { breathingWave: number; piezoFiltered: number | null } {
    this.rawPacketCount++;
    this.latestSensorStatus = { ...packet.sensorStatus };

    // 1. Orientation-compensated chest-wall motion component (MPU6050 F-04 fix)
    // Uses 3-axis vector magnitude delta so strap tilt / vertical chest seating has zero DC bias
    const magDelta = Math.sqrt(packet.ax * packet.ax + packet.ay * packet.ay + packet.az * packet.az) - 1.0;
    const filteredResp = this.respFilter.process(magDelta);
    this.breathBuffer.push(filteredResp);
    if (this.breathBuffer.length > 300) this.breathBuffer.shift();

    const gyroMag = Math.sqrt(packet.gx * packet.gx + packet.gy * packet.gy + packet.gz * packet.gz);
    this.gyroMotionEnergySum += gyroMag;

    // 2. Conditional Piezo Filtering (null when safety-isolated)
    let filteredPiezo: number | null = null;
    if (packet.piezo !== null && packet.sensorStatus.piezo === 'ok') {
      filteredPiezo = this.coughFilter.process(packet.piezo - 2048);
      this.piezoBuffer.push(filteredPiezo);
      if (this.piezoBuffer.length > 300) this.piezoBuffer.shift();
    }

    // 3. INMP441 I2S Digital Audio Envelope & Spectral Summaries
    if (packet.sensorStatus.inmp441 === 'ok') {
      this.audioBuffer.push(packet.audioRms);
      if (this.audioBuffer.length > 300) this.audioBuffer.shift();
      this.latestCentroidHz = packet.audioCentroidHz;
      this.latestZcr = packet.audioZcr;
      this.latestBands = { ...packet.audioBands };
      if (packet.audioPeak > this.audioPeakEnergy) {
        this.audioPeakEnergy = packet.audioPeak;
      }
    }

    // 4. Auxiliary Sensors (DS18B20 Contact Temp + MAX30102 Experimental PPG)
    if (packet.contactTempC !== null && packet.sensorStatus.ds18b20 === 'ok') {
      this.tempSamples.push(packet.contactTempC);
      if (this.tempSamples.length > 120) this.tempSamples.shift();
    }
    if (packet.heartRateBpm !== null && packet.sensorStatus.max30102 === 'ok') {
      this.hrSamples.push(packet.heartRateBpm);
      if (this.hrSamples.length > 120) this.hrSamples.shift();
    }
    if (packet.spo2Pct !== null && packet.sensorStatus.max30102 === 'ok') {
      this.spo2Samples.push(packet.spo2Pct);
      if (this.spo2Samples.length > 120) this.spo2Samples.shift();
    }

    // 5. Adaptive Noise-Floor + Hysteresis + 350ms Refractory Cough Detection (Fused)
    const audioMetric = packet.sensorStatus.inmp441 === 'ok' ? packet.audioRms : 0;
    const piezoMetric = filteredPiezo !== null ? Math.abs(filteredPiezo) : 0;
    const combinedMetric =
      audioMetric > 0 && piezoMetric > 0
        ? Math.max(audioMetric, piezoMetric)
        : audioMetric > 0
        ? audioMetric
        : piezoMetric;

    if (!this.inCough) {
      this.noiseFloor = 0.96 * this.noiseFloor + 0.04 * combinedMetric;
    }

    const attackThreshold = Math.max(28, this.noiseFloor * 2.7 + 20);
    const releaseThreshold = attackThreshold * 0.55;
    const imuJerkOk =
      packet.sensorStatus.mpu6050 !== 'ok' ||
      Math.abs(magDelta) > 0.045 ||
      gyroMag > 3.0 ||
      combinedMetric > attackThreshold * 1.45;

    if (!this.inCough) {
      if (
        packet.timestamp - this.lastCoughEnd > 350 &&
        combinedMetric > attackThreshold &&
        imuJerkOk
      ) {
        this.inCough = true;
        this.currentCoughStart = packet.timestamp;
        this.currentCoughPeak = combinedMetric;
      }
    } else {
      if (combinedMetric > this.currentCoughPeak) {
        this.currentCoughPeak = combinedMetric;
      }
      const dur = packet.timestamp - this.currentCoughStart;
      if (combinedMetric < releaseThreshold || dur > 1200) {
        if (dur >= 60 && dur <= 1200) {
          if (packet.timestamp - this.lastCoughTime >= 2000) {
            this.boutCounter++;
          }
          this.lastCoughTime = packet.timestamp;
          const source: CoughEvent['source'] =
            audioMetric > 0 && piezoMetric > 0
              ? 'fused'
              : audioMetric > 0
              ? 'inmp441_imu'
              : 'piezo_imu';
          this.coughEvents.push({
            timestamp: this.currentCoughStart,
            durationMs: dur,
            peakAmplitude: Math.round(this.currentCoughPeak),
            energy: Math.round(this.currentCoughPeak * dur),
            boutIndex: this.boutCounter,
            source,
          });
        }
        this.lastCoughEnd = packet.timestamp;
        this.inCough = false;
      }
    }

    return {
      breathingWave: filteredResp,
      piezoFiltered: filteredPiezo,
    };
  }

  calculateFeatures(totalDurationSeconds: number = 60): SignalFeatures {
    let zeroCrossings = 0;
    let breathAmpSum = 0;
    let inspirationSamples = 0;
    let expirationSamples = 0;

    for (let i = 1; i < this.breathBuffer.length; i++) {
      const prev = this.breathBuffer[i - 1];
      const curr = this.breathBuffer[i];
      if ((prev < 0 && curr >= 0) || (prev >= 0 && curr < 0)) {
        zeroCrossings++;
      }
      breathAmpSum += Math.abs(curr);
      if (curr > prev) inspirationSamples++;
      else expirationSamples++;
    }

    const bufferSeconds = this.breathBuffer.length / this.fs;
    let estimatedBpm = bufferSeconds > 1 ? Math.round((zeroCrossings / 2 / bufferSeconds) * 60) : 0;
    if (estimatedBpm > 0) {
      if (estimatedBpm < 6) estimatedBpm = 6;
      if (estimatedBpm > 55) estimatedBpm = 55;
    }

    const ieRatioVal = inspirationSamples > 0 ? (expirationSamples / inspirationSamples).toFixed(1) : '2.0';
    const inspirationExpirationRatio = `1:${ieRatioVal}`;

    const avgAmp = this.breathBuffer.length > 0 ? breathAmpSum / this.breathBuffer.length : 0;
    let breathDepth: 'Shallow' | 'Normal' | 'Deep' = 'Normal';
    if (avgAmp < 0.08) breathDepth = 'Shallow';
    else if (avgAmp > 0.36) breathDepth = 'Deep';

    const coughCount = this.coughEvents.length;
    const testHours = Math.max(totalDurationSeconds / 3600, 1 / 60);
    const coughRatePerHour = Math.round(coughCount / testHours);
    const avgCoughDurationMs =
      coughCount > 0
        ? Math.round(this.coughEvents.reduce((acc, c) => acc + c.durationMs, 0) / coughCount)
        : 0;

    // Spectral metrics: prefer true 16 kHz INMP441 bands when active; fallback to 50 Hz IMU/Piezo FFT
    let dominantFrequency = 0;
    let spectralCentroid = 0;
    let bandEnergies = { low: 0, mid: 0, high: 0 };
    let zeroCrossingRate = 0;

    if (this.latestSensorStatus.inmp441 === 'ok') {
      bandEnergies = {
        low: Math.round(this.latestBands.low),
        mid: Math.round(this.latestBands.mid),
        high: Math.round(this.latestBands.high),
      };
      spectralCentroid = parseFloat(this.latestCentroidHz.toFixed(1));
      zeroCrossingRate = parseFloat(this.latestZcr.toFixed(3));
      const { low, mid, high } = bandEnergies;
      if (high >= mid && high >= low && high > 5) dominantFrequency = 1400;
      else if (mid >= low && mid > 5) dominantFrequency = 520;
      else if (low > 5) dominantFrequency = 180;
      else dominantFrequency = 0;
    } else if (this.piezoBuffer.length > 16) {
      const { freqs, powers } = computeFFT(this.piezoBuffer);
      let totalPower = 0;
      let weightedFreqSum = 0;
      let maxPower = -1;
      let lowPower = 0;
      let midPower = 0;
      let highPower = 0;

      for (let i = 0; i < powers.length; i++) {
        const p = powers[i];
        const f = freqs[i];
        totalPower += p;
        weightedFreqSum += f * p;
        if (p > maxPower) {
          maxPower = p;
          dominantFrequency = f;
        }
        if (f <= 5) lowPower += p;
        else if (f <= 15) midPower += p;
        else highPower += p;
      }
      spectralCentroid = totalPower > 0 ? parseFloat((weightedFreqSum / totalPower).toFixed(1)) : 0;
      dominantFrequency = parseFloat(dominantFrequency.toFixed(1));
      bandEnergies = {
        low: Math.round(lowPower),
        mid: Math.round(midPower),
        high: Math.round(highPower),
      };
    }

    // Auxiliary averages (null = unavailable)
    const avgContactTempC =
      this.tempSamples.length > 0
        ? parseFloat((this.tempSamples.reduce((a, b) => a + b, 0) / this.tempSamples.length).toFixed(1))
        : null;
    const avgHeartRateBpm =
      this.hrSamples.length > 0
        ? Math.round(this.hrSamples.reduce((a, b) => a + b, 0) / this.hrSamples.length)
        : null;
    const avgSpo2Pct =
      this.spo2Samples.length > 0
        ? Math.round(this.spo2Samples.reduce((a, b) => a + b, 0) / this.spo2Samples.length)
        : null;

    // Honest Signal Quality Index (SQI)
    let sqiScore = 90;
    let status: SignalQualityStatus = 'good';
    let advice = 'Multi-sensor stream clean. Maintain steady seated posture.';

    const avgGyro = this.rawPacketCount > 0 ? this.gyroMotionEnergySum / this.rawPacketCount : 0;

    if (this.latestSensorStatus.mpu6050 !== 'ok') {
      sqiScore -= 45;
      advice = 'MPU6050 chest motion channel unavailable. Check shared I2C bus (GPIO21/22).';
    } else if (avgAmp < 0.035) {
      sqiScore -= 32;
      advice = 'Weak chest excursion detected. Tighten the 50 mm strap gently around the lower ribs.';
    } else if (avgGyro > 18 || avgAmp > 1.1) {
      sqiScore -= 28;
      advice = 'High body-motion artifact detected. Sit upright and avoid walking or talking.';
    }

    if (this.latestSensorStatus.inmp441 !== 'ok' && this.latestSensorStatus.piezo !== 'ok') {
      sqiScore -= 18;
      if (advice.includes('clean')) {
        advice = 'Acoustic/vibration channels offline. Verify INMP441 I2S wiring (GPIO14/33/32).';
      }
    }

    if (sqiScore < 45) {
      status = 'poor';
    } else if (sqiScore < 75) {
      status = 'fair';
    } else {
      status = 'good';
    }

    return {
      breathingRate: estimatedBpm,
      inspirationExpirationRatio,
      breathDepth,
      breathAmplitudeMm: parseFloat((avgAmp * 12).toFixed(1)),
      coughCount,
      coughRatePerHour,
      avgCoughDurationMs,
      coughEvents: [...this.coughEvents],
      dominantFrequency,
      spectralCentroid,
      bandEnergies,
      zeroCrossingRate,
      audioPeakEnergy: Math.round(this.audioPeakEnergy),
      avgContactTempC,
      avgHeartRateBpm,
      avgSpo2Pct,
      activeSensors: { ...this.latestSensorStatus },
      signalQuality: {
        score: Math.max(10, Math.min(100, sqiScore)),
        status,
        advice,
      },
      sampleCount: this.breathBuffer.length,
      rawPacketSampleCount: this.rawPacketCount,
      durationSeconds: totalDurationSeconds,
    };
  }
}
