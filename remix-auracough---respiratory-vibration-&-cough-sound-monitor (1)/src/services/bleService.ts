import { APP_CONFIG } from '../config/appConfig';
import {
  BleConnectionState,
  SensorChannelStatus,
  SensorPacket,
  SensorStatusMap,
} from '../types';

export type BeltBleCommand = 'RESET_COUGH' | 'RESET_RESP' | 'LED_TEST' | 'PING';

function parseNullableFloat(token: string | undefined): number | null {
  if (!token) return null;
  const clean = token.trim().toUpperCase();
  if (clean === 'NA' || clean === 'NULL' || clean === '') return null;
  const val = parseFloat(token);
  return Number.isFinite(val) ? val : null;
}

function parseNullableInt(token: string | undefined): number | null {
  if (!token) return null;
  const clean = token.trim().toUpperCase();
  if (clean === 'NA' || clean === 'NULL' || clean === '') return null;
  const val = parseInt(token, 10);
  return Number.isFinite(val) ? val : null;
}

export function decodeAp2Flags(flagsHex: string): SensorStatusMap {
  const mask = parseInt(flagsHex, 16) || 0;
  const flag = (bit: number, disabledFallback: SensorChannelStatus = 'unavailable'): SensorChannelStatus =>
    (mask & bit) !== 0 ? 'ok' : disabledFallback;

  return {
    mpu6050: flag(0x01, 'unavailable'),
    inmp441: flag(0x02, 'unavailable'),
    max30102: flag(0x04, 'unavailable'),
    ds18b20: flag(0x08, 'unavailable'),
    piezo: flag(0x10, 'disabled'),
    oled: flag(0x20, 'unavailable'),
    rgbLed: flag(0x40, 'unavailable'),
  };
}

export function parseAp2Line(rawLine: string): SensorPacket | null {
  const trimmed = rawLine.trim();
  if (!trimmed.startsWith('AP2,')) return null;

  const parts = trimmed.split(',');
  // AP2,<seq>,<ms>,<flagsHex>,<ax>,<ay>,<az>,<gx>,<gy>,<gz>,<audioRms>,<audioPeak>,<audioCentroidHz>,<audioZcr>,<bandLow>,<bandMid>,<bandHigh>,<piezo>,<hrBpm>,<spo2Pct>,<tempC>,<coughCount>,<respBpm>,<sqi>,<pwr>
  if (parts.length < 25) return null;

  const sequence = parseInt(parts[1], 10) || 0;
  const deviceTimestampMs = parseInt(parts[2], 10) || 0;
  const flagsHex = parts[3].trim().toUpperCase();
  const sensorStatus = decodeAp2Flags(flagsHex);

  const ax = parseFloat(parts[4]) || 0;
  const ay = parseFloat(parts[5]) || 0;
  const az = parseFloat(parts[6]) || 1.0;
  const gx = parseFloat(parts[7]) || 0;
  const gy = parseFloat(parts[8]) || 0;
  const gz = parseFloat(parts[9]) || 0;

  const audioRms = parseFloat(parts[10]) || 0;
  const audioPeak = parseFloat(parts[11]) || 0;
  const audioCentroidHz = parseFloat(parts[12]) || 0;
  const audioZcr = parseFloat(parts[13]) || 0;
  const bandLow = parseFloat(parts[14]) || 0;
  const bandMid = parseFloat(parts[15]) || 0;
  const bandHigh = parseFloat(parts[16]) || 0;

  const piezo = parseNullableInt(parts[17]);
  const heartRateBpm = parseNullableFloat(parts[18]);
  const spo2Pct = parseNullableFloat(parts[19]);
  const contactTempC = parseNullableFloat(parts[20]);
  const coughCountDevice = parseNullableInt(parts[21]);
  const respBpmDevice = parseNullableInt(parts[22]);
  const sqiToken = parts[23]?.trim();
  const sqiDevice = sqiToken && sqiToken !== 'NA' ? sqiToken : null;

  const pwrToken = (parts[24] || 'USB').trim().toUpperCase();
  let powerSource: 'USB' | 'BATTERY' = 'USB';
  let batteryPct: number | null = null;
  if (pwrToken.startsWith('BAT:')) {
    powerSource = 'BATTERY';
    batteryPct = parseNullableInt(pwrToken.slice(4));
  }

  // Orientation-independent chest-wall vector magnitude delta (F-04)
  const magDelta = Math.sqrt(ax * ax + ay * ay + az * az) - 1.0;

  return {
    protocolVersion: 'AP2',
    timestamp: Date.now(),
    sequence,
    deviceTimestampMs,
    flagsHex,
    sensorStatus,
    ax,
    ay,
    az,
    gx,
    gy,
    gz,
    audioRms,
    audioPeak,
    audioCentroidHz,
    audioZcr,
    audioBands: {
      low: bandLow,
      mid: bandMid,
      high: bandHigh,
    },
    piezo,
    piezoFiltered: piezo !== null ? piezo - 2048 : null,
    heartRateBpm,
    spo2Pct,
    contactTempC,
    chestDisplacement: parseFloat((magDelta * 15).toFixed(2)),
    breathingWave: magDelta,
    powerSource,
    batteryPct,
    coughCountDevice,
    respBpmDevice,
    sqiDevice,
    isSimulated: false,
  };
}

export class BleService {
  private device: any = null;
  private server: any = null;
  private txChar: any = null;
  private rxChar: any = null;
  private connectionState: BleConnectionState = 'disconnected';
  private onPacketCallback: ((packet: SensorPacket) => void) | null = null;
  private onStateChangeCallback: ((state: BleConnectionState, message?: string) => void) | null = null;
  private rxBuffer: string = '';
  private lastRawLine: string = '';
  private droppedPackets: number = 0;
  private totalPackets: number = 0;
  private reassembledFragments: number = 0;
  private lastChunkBytes: number = 0;
  private lastCommandSent: string = '';

  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  getState(): BleConnectionState {
    return this.connectionState;
  }

  hasRxSupport(): boolean {
    return Boolean(this.rxChar && this.connectionState === 'connected');
  }

  getLastRawLine(): string {
    return this.lastRawLine;
  }

  getDroppedPacketCount(): number {
    return this.droppedPackets;
  }

  getPacketStats() {
    return {
      totalPackets: this.totalPackets,
      droppedPackets: this.droppedPackets,
      reassembledFragments: this.reassembledFragments,
      lastChunkBytes: this.lastChunkBytes,
      lastPacketBytes: this.lastRawLine.length,
      hasRxSupport: this.hasRxSupport(),
      lastCommandSent: this.lastCommandSent,
    };
  }

  setCallbacks(
    onPacket: (packet: SensorPacket) => void,
    onStateChange: (state: BleConnectionState, msg?: string) => void
  ) {
    this.onPacketCallback = onPacket;
    this.onStateChangeCallback = onStateChange;
  }

  private updateState(state: BleConnectionState, msg?: string) {
    this.connectionState = state;
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(state, msg);
    }
  }

  async connect(): Promise<boolean> {
    if (!this.isSupported()) {
      this.updateState(
        'error',
        'Web Bluetooth is not supported in this browser. Use Chrome on Android/Desktop or continue in Multi-Sensor Simulation Mode.'
      );
      return false;
    }

    try {
      this.updateState('connecting', 'Scanning for AuraPhragm ESP32 belt (AP2)...');

      this.device = await navigator.bluetooth!.requestDevice({
        filters: [
          { namePrefix: APP_CONFIG.ble.deviceNamePrefix },
          { namePrefix: 'ESP32' },
        ],
        optionalServices: [APP_CONFIG.ble.serviceUuid, 'generic_access'],
      });

      this.device.addEventListener('gattserverdisconnected', () => {
        this.updateState('disconnected', 'AuraPhragm ESP32 Belt disconnected.');
        this.txChar = null;
        this.rxChar = null;
        this.server = null;
      });

      if (!this.device.gatt) {
        throw new Error('GATT server not found on device');
      }

      this.server = await this.device.gatt.connect();
      const service = await this.server.getPrimaryService(APP_CONFIG.ble.serviceUuid);
      this.txChar = await service.getCharacteristic(APP_CONFIG.ble.txCharUuid);

      // Discover optional RX command write characteristic (F-07)
      try {
        this.rxChar = await service.getCharacteristic(APP_CONFIG.ble.rxCharUuid);
      } catch {
        this.rxChar = null;
      }

      this.rxBuffer = '';
      await this.txChar.startNotifications();
      this.txChar.addEventListener('characteristicvaluechanged', (e: any) => {
        const val = e.target.value as DataView;
        this.lastChunkBytes = val.byteLength;
        const decoder = new TextDecoder('utf-8');
        const chunk = decoder.decode(val);
        this.handleRawData(chunk);
      });

      this.updateState('connected', `Connected to ${this.device.name || 'AuraPhragm-Belt'} (AP2)`);
      return true;
    } catch (err: any) {
      console.warn('BLE Connection failed:', err);
      this.updateState('error', err.message || 'Bluetooth connection failed or cancelled');
      return false;
    }
  }

  async sendCommand(command: BeltBleCommand | string): Promise<{ ok: boolean; message: string }> {
    if (!this.rxChar || this.connectionState !== 'connected') {
      return {
        ok: false,
        message: 'BLE RX command channel not connected. Pair AuraPhragm-Belt first.',
      };
    }

    try {
      const payload = new TextEncoder().encode(`${command.trim().toUpperCase()}\n`);
      if (typeof this.rxChar.writeValueWithoutResponse === 'function') {
        await this.rxChar.writeValueWithoutResponse(payload);
      } else {
        await this.rxChar.writeValue(payload);
      }
      this.lastCommandSent = command.trim().toUpperCase();
      return { ok: true, message: `Sent ${this.lastCommandSent} to ESP32 RX characteristic.` };
    } catch (err: any) {
      return { ok: false, message: err?.message || 'Failed to write BLE RX command.' };
    }
  }

  private handleRawData(chunk: string) {
    if (!chunk.includes('\n')) {
      this.reassembledFragments++;
    }
    this.rxBuffer += chunk;

    // Protect against runaway buffer on malformed continuous streams (F-06)
    if (this.rxBuffer.length > 2048) {
      this.rxBuffer = this.rxBuffer.slice(-512);
    }

    const lines = this.rxBuffer.split('\n');
    this.rxBuffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const parsed = parseAp2Line(trimmed);
      if (parsed) {
        this.totalPackets++;
        this.lastRawLine = trimmed;
        if (this.onPacketCallback) {
          this.onPacketCallback(parsed);
        }
      } else {
        this.droppedPackets++;
      }
    }
  }

  async disconnect() {
    if (this.device && this.device.gatt && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
    this.updateState('disconnected');
    this.device = null;
    this.server = null;
    this.txChar = null;
    this.rxChar = null;
    this.rxBuffer = '';
  }
}

export const bleService = new BleService();
