/**
 * AuraPhragm App Configuration
 * Centralized constant configuration for multi-sensor respiratory prototype and localization.
 */

export const APP_CONFIG = {
  name: 'AuraPhragm',
  tagline: 'Multi-Sensor Diaphragm Motion, I2S Acoustic & Respiratory Prototype',
  version: 'v2.0.0-ap2',
  modelVersion: 'v2.0-gemini-4-hydrogen',
  emergencyNumber: '108', // India Emergency Medical Service (Ambulance)
  emergencyName: 'National Ambulance Service (108)',
  sampleRateHz: 50, // 50 Hz control/motion BLE stream (INMP441 samples internally at 16 kHz)
  audioSampleRateHz: 16000,
  testDurationSeconds: 60,
  disclaimer:
    'AuraPhragm is a student/research prototype and experimental screening aid. It is NOT a clinically validated medical device and must NOT be used to diagnose asthma, pneumonia, COPD, sleep apnoea, fever, or any condition, or to make treatment decisions. MAX30102 SpO2/HR outputs are experimental, DS18B20 measures skin/contact temperature only (not core body temperature), and Piezo ADC remains disabled until a verified analogue front-end is bench-tested. Always consult a qualified doctor.',

  // ESP32 Nordic UART BLE Service UUIDs (AuraPhragm v2 AP2 Protocol)
  ble: {
    serviceUuid: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
    rxCharUuid: '6e400002-b5a3-f393-e0a9-e50e24dcca9e', // Write to ESP32
    txCharUuid: '6e400003-b5a3-f393-e0a9-e50e24dcca9e', // Read/Notify from ESP32
    deviceNamePrefix: 'AuraPhragm',
  },
} as const;

export type SupportedLanguage = 'en' | 'hi' | 'bn';
