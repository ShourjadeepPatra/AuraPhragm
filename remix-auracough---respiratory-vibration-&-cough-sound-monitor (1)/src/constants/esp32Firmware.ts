/**
 * AuraPhragm ESP32 DevKit V1 (30-Pin) Firmware & Hardware Reference
 * Protocol AP2 — Revised Firmware addressing Audit Issues F-01 through F-08:
 *   F-01: 256-sample DMA chunk -> 512-sample sliding ring buffer + 20ms I2S timeout
 *   F-02: Dual ESP32 Arduino Core v2.x (driver/i2s.h) & v3.x (ESP_I2S.h) support
 *   F-03: True per-beat MAX30102 cycle excursion & explicit no-contact reset
 *   F-04: Orientation-independent 3-axis magDelta IMU cough gating
 *   F-05: Deterministic DS18B20 tempConversionPending cleared on every read
 *   F-06: BLE MTU(185) request + peer-MTU-aware chunked packet notification
 *   F-07: BLE RX write callbacks (RESET_COUGH, RESET_RESP, LED_TEST, PING)
 *   F-08: Transient MPU6050 I2C glitch threshold (>=5 errors) & 2.5s auto-recovery
 */

export const ESP32_FIRMWARE_SKETCH = `/*
  ==============================================================================
  AuraPhragm ESP32 DevKit V1 (30-Pin) Multi-Sensor Firmware (Protocol AP2 v2.1)
  ==============================================================================
  IMPORTANT SCOPE & SAFETY NOTICE:
  - Student/research prototype only. NOT a clinically validated medical device.
  - Power via USB ONLY for initial bring-up (battery/LM2596/USB socket postponed).
  - ESP32 GPIOs are 3.3V logic only and are NOT 5V tolerant.
  - Piezo ADC (GPIO34) defaults to DISABLED (ENABLE_PIEZO_ADC 0) until a
    verified 0-3.3V clamp/bias/filter analogue front-end is bench-tested.
  - MAX30102 HR/SpO2 outputs are EXPERIMENTAL; DS18B20 measures SKIN/CONTACT
    temperature only (not core body temperature).

  Required Arduino Libraries (ESP32 Arduino Core v2.0.17 OR v3.x Supported):
  - Wire (built-in)
  - ESP_I2S (built-in Core v3.x) OR driver/i2s.h (built-in Core v2.x)
  - Adafruit GFX Library + Adafruit SSD1306
  - OneWire + DallasTemperature
  - SparkFun MAX3010x Pulse and Proximity Sensor Library (MAX30105.h)
  - ESP32 BLE Arduino (BLEDevice, BLEServer, BLEUtils, BLE2902)
  ==============================================================================
*/

// ----------------------- MODULAR SAFETY COMPILE FLAGS -----------------------
#define ENABLE_OLED       1   // SSD1306 128x64 I2C (0x3C)
#define ENABLE_MPU6050    1   // MPU6050 6-axis IMU I2C (0x68)
#define ENABLE_INMP441    1   // INMP441 16 kHz I2S Digital Mic (SCK=14, WS=33, SD=32)
#define ENABLE_DS18B20    1   // DS18B20 1-Wire Contact Temp (GPIO4 + 4.7k pull-up to 3V3)
#define ENABLE_MAX30102   1   // MAX30102 Optical PPG I2C (0x57) - Experimental
#define ENABLE_RGB_LED    1   // RGB Status LED (R=25, G=26, B=27 via 220-330 ohm resistors)
#define ENABLE_PIEZO_ADC  0   // SAFETY DEFAULT OFF! Set 1 ONLY after 0-3.3V AFE verified

// RGB LED Polarity: 0 = Common Cathode (GPIO HIGH = ON), 1 = Common Anode (GPIO LOW = ON)
#define RGB_COMMON_ANODE  0

// ----------------------- ESP32 DEVKIT V1 (30-PIN) MAP -----------------------
#define I2C_SDA_PIN       21
#define I2C_SCL_PIN       22
#define DS18B20_PIN       4
#define I2S_SCK_PIN       14  // BCLK (Do NOT confuse with OLED SCL on GPIO22)
#define I2S_WS_PIN        33  // LRCLK / WS
#define I2S_SD_PIN        32  // Data in from INMP441 (L/R tied to GND -> Left)
#define PIEZO_PIN         34  // ADC1_CH6 (Input-only! Isolated unless ENABLE_PIEZO_ADC 1)
#define RGB_R_PIN         25
#define RGB_G_PIN         26
#define RGB_B_PIN         27

// Sensor Addresses & Constants
#define MPU6050_ADDR      0x68
#define MAX30102_ADDR     0x57
#define OLED_ADDR         0x3C
#define SCREEN_WIDTH      128
#define SCREEN_HEIGHT     64

// Status Bitmask Flags for AP2 Packet
#define FLAG_MPU6050_OK   0x01
#define FLAG_INMP441_OK   0x02
#define FLAG_MAX30102_OK  0x04
#define FLAG_DS18B20_OK   0x08
#define FLAG_PIEZO_OK     0x10
#define FLAG_OLED_OK      0x20
#define FLAG_RGB_OK       0x40

#if __has_include("esp_arduino_version.h")
#include "esp_arduino_version.h"
#endif

#if defined(ESP_ARDUINO_VERSION_MAJOR) && (ESP_ARDUINO_VERSION_MAJOR >= 3)
  #define USE_ESP_CORE_V3 1
#else
  #define USE_ESP_CORE_V3 0
#endif

#include <Wire.h>
#include <math.h>
#include <string.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#if ENABLE_OLED
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
#endif

#if ENABLE_DS18B20
#include <OneWire.h>
#include <DallasTemperature.h>
OneWire oneWire(DS18B20_PIN);
DallasTemperature tempSensors(&oneWire);
#endif

#if ENABLE_MAX30102
#include "MAX30105.h"
MAX30105 particleSensor;
#endif

#if ENABLE_INMP441
  #define I2S_SAMPLE_RATE        16000
  #define I2S_DMA_CHUNK_SAMPLES  256   // 16 ms @ 16 kHz -> fits cleanly inside 20 ms loop (F-01)
  #define I2S_ANALYSIS_SAMPLES   512   // 32 ms coherent Goertzel/RMS sliding ring window (F-01)
  int32_t i2sRawBuffer[I2S_DMA_CHUNK_SAMPLES];
  float   audioRing[I2S_ANALYSIS_SAMPLES];
  float   audioWork[I2S_ANALYSIS_SAMPLES];
  int     audioRingFilled = 0;

  #if USE_ESP_CORE_V3
    #include <ESP_I2S.h>
    I2SClass i2sMic;
  #else
    #include "driver/i2s.h"
    #define I2S_PORT I2S_NUM_0
  #endif
#endif

// Nordic UART Service UUIDs (Matches AuraPhragm Companion Web App)
#define SERVICE_UUID           "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define CHARACTERISTIC_UUID_RX "6e400002-b5a3-f393-e0a9-e50e24dcca9e"
#define CHARACTERISTIC_UUID_TX "6e400003-b5a3-f393-e0a9-e50e24dcca9e"

BLEServer *pServer = NULL;
BLECharacteristic *pTxCharacteristic = NULL;
BLECharacteristic *pRxCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;

// Runtime Hardware Availability Flags
bool mpuAvailable     = false;
bool inmpAvailable    = false;
bool maxAvailable     = false;
bool dsAvailable      = false;
bool oledAvailable    = false;
bool piezoEnabled     = (ENABLE_PIEZO_ADC == 1);
bool rgbEnabled       = (ENABLE_RGB_LED == 1);

// MPU6050 Glitch Tolerance & Auto-Recovery State (F-08)
uint8_t mpuConsecutiveErrors = 0;
unsigned long lastMpuRecoveryMs = 0;
const uint8_t MPU_ERROR_THRESHOLD = 5;
const unsigned long MPU_RECOVERY_INTERVAL_MS = 2500;

// Timing Intervals
const unsigned long SAMPLE_INTERVAL_MS  = 20;   // 50 Hz control/BLE loop
const unsigned long DISPLAY_INTERVAL_MS = 250;  // 4 Hz OLED refresh
const unsigned long TEMP_INTERVAL_MS    = 1000; // 1 Hz async DS18B20 conversion
const unsigned long TEMP_READY_MS       = 750;  // 12-bit DS18B20 max conversion time
unsigned long lastSampleTime  = 0;
unsigned long lastDisplayTime = 0;
unsigned long lastTempReqTime = 0;
bool tempConversionPending    = false;
uint32_t packetSeq = 0;

// Latest Sensor Values & Validity
float ax = 0, ay = 0, az = 1.0f, gx = 0, gy = 0, gz = 0;
float audioRms = 0, audioPeak = 0, audioCentroidHz = 0, audioZcr = 0;
float bandLow = 0, bandMid = 0, bandHigh = 0;
int   piezoVal = 0;
bool  piezoValid = false;
float contactTempC = 0.0f;
bool  contactTempValid = false;
float expHrBpm = 0.0f;
float expSpo2Pct = 0.0f;
bool  ppgValid = false;

// Respiration Rate Estimation State (MPU6050 Orientation-Compensated)
float respFastEma = 0.0f;
float respSlowEma = 0.0f;
bool  respPeakSeeking = true;
float respCycleMax = -999.0f;
float respCycleMin = 999.0f;
unsigned long lastRespPeakMs = 0;
int   measuredRespBpm = -1; // -1 => NA until valid cycles observed
char  sqiLabel[8] = "FAIR";

// Hysteresis + Adaptive Noise Floor + Refractory Cough State Machine
float audioNoiseFloor = 18.0f;
bool  inCoughBurst = false;
unsigned long coughBurstStartMs = 0;
unsigned long lastCoughEndMs = 0;
unsigned long rgbAlertUntilMs = 0;
int   coughCount = 0;
char  lastBleCmd[24] = "";

// MAX30102 Per-Beat Cycle Excursion Tracker (F-03)
float irDcEma = 0.0f;
float redDcEma = 0.0f;
float irAcPrev = 0.0f;
float irCycleMax = 0.0f;
float irCycleMin = 0.0f;
float redCycleMax = 0.0f;
float redCycleMin = 0.0f;
bool  beatRising = false;
unsigned long lastBeatMs = 0;

// ----------------------------- RGB LED DRIVER -------------------------------
void setRgbLed(bool r, bool g, bool b) {
#if ENABLE_RGB_LED
  uint8_t onState  = RGB_COMMON_ANODE ? LOW : HIGH;
  uint8_t offState = RGB_COMMON_ANODE ? HIGH : LOW;
  digitalWrite(RGB_R_PIN, r ? onState : offState);
  digitalWrite(RGB_G_PIN, g ? onState : offState);
  digitalWrite(RGB_B_PIN, b ? onState : offState);
#endif
}

void updateStatusLed(unsigned long now) {
  if (!rgbEnabled) return;
  if (now < rgbAlertUntilMs) {
    // Cough / LED_TEST indication: amber/yellow
    setRgbLed(true, true, false);
    return;
  }
  if (!mpuAvailable && !inmpAvailable) {
    // Critical sensor fault blink: red
    bool blink = ((now / 350) % 2) == 0;
    setRgbLed(blink, false, false);
    return;
  }
  if (deviceConnected) {
    // BLE active stream: cyan/blue
    setRgbLed(false, true, true);
  } else {
    // Ready / awaiting BLE: green
    setRgbLed(false, true, false);
  }
}

// ----------------------------- I2C UTILITIES --------------------------------
bool i2cDevicePresent(uint8_t addr) {
  Wire.beginTransmission(addr);
  return (Wire.endTransmission() == 0);
}

bool setupMPU6050() {
#if !ENABLE_MPU6050
  return false;
#else
  if (!i2cDevicePresent(MPU6050_ADDR)) return false;
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(0x6B); // PWR_MGMT_1
  Wire.write(0x00); // Wake device
  if (Wire.endTransmission(true) != 0) return false;
  delay(20);
  mpuConsecutiveErrors = 0;
  return true;
#endif
}

bool readMPU6050() {
  if (!mpuAvailable) return false;
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(0x3B);
  if (Wire.endTransmission(false) != 0) {
    mpuConsecutiveErrors++;
    if (mpuConsecutiveErrors >= MPU_ERROR_THRESHOLD) {
      mpuAvailable = false;
    }
    return false;
  }
  uint8_t received = Wire.requestFrom((uint8_t)MPU6050_ADDR, (uint8_t)14, (uint8_t)true);
  if (received != 14) {
    while (Wire.available()) Wire.read();
    mpuConsecutiveErrors++;
    if (mpuConsecutiveErrors >= MPU_ERROR_THRESHOLD) {
      mpuAvailable = false;
    }
    return false;
  }

  mpuConsecutiveErrors = 0;

  int16_t rawAcX = (int16_t)((Wire.read() << 8) | Wire.read());
  int16_t rawAcY = (int16_t)((Wire.read() << 8) | Wire.read());
  int16_t rawAcZ = (int16_t)((Wire.read() << 8) | Wire.read());
  int16_t rawTmp = (int16_t)((Wire.read() << 8) | Wire.read());
  int16_t rawGyX = (int16_t)((Wire.read() << 8) | Wire.read());
  int16_t rawGyY = (int16_t)((Wire.read() << 8) | Wire.read());
  int16_t rawGyZ = (int16_t)((Wire.read() << 8) | Wire.read());
  (void)rawTmp;

  ax = (float)rawAcX / 16384.0f;
  ay = (float)rawAcY / 16384.0f;
  az = (float)rawAcZ / 16384.0f;
  gx = (float)rawGyX / 131.0f;
  gy = (float)rawGyY / 131.0f;
  gz = (float)rawGyZ / 131.0f;
  return true;
}

// --------------------------- INMP441 I2S AUDIO ------------------------------
bool setupINMP441() {
#if !ENABLE_INMP441
  return false;
#elif USE_ESP_CORE_V3
  i2sMic.setPins(I2S_SCK_PIN, I2S_WS_PIN, -1, I2S_SD_PIN);
  return i2sMic.begin(
    I2S_MODE_STD,
    I2S_SAMPLE_RATE,
    I2S_DATA_BIT_WIDTH_32BIT,
    I2S_SLOT_MODE_MONO,
    I2S_STD_SLOT_LEFT
  );
#else
  i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = I2S_SAMPLE_RATE,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 4,
    .dma_buf_len = I2S_DMA_CHUNK_SAMPLES,
    .use_apll = false,
    .tx_desc_auto_clear = false,
    .fixed_mclk = 0
  };
  i2s_pin_config_t pin_config = {
    .bck_io_num = I2S_SCK_PIN,
    .ws_io_num = I2S_WS_PIN,
    .data_out_num = I2S_PIN_NO_CHANGE,
    .data_in_num = I2S_SD_PIN
  };
  if (i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL) != ESP_OK) return false;
  if (i2s_set_pin(I2S_PORT, &pin_config) != ESP_OK) return false;
  i2s_zero_dma_buffer(I2S_PORT);
  return true;
#endif
}

float goertzelMagnitude(const float *samples, int count, float targetHz, float sampleRate) {
  float k = (count * targetHz) / sampleRate;
  float omega = (2.0f * PI * k) / count;
  float coeff = 2.0f * cosf(omega);
  float q0 = 0, q1 = 0, q2 = 0;
  for (int i = 0; i < count; i++) {
    q0 = coeff * q1 - q2 + samples[i];
    q2 = q1;
    q1 = q0;
  }
  float magSq = q1 * q1 + q2 * q2 - q1 * q2 * coeff;
  return (magSq > 0.0f) ? sqrtf(magSq) / (float)count : 0.0f;
}

void sampleINMP441Frame() {
#if ENABLE_INMP441
  if (!inmpAvailable) return;
  int chunkCount = 0;

  #if USE_ESP_CORE_V3
    int availBytes = i2sMic.available();
    if (availBytes < (int)(sizeof(int32_t) * 64)) return;
    size_t toRead = (size_t)availBytes;
    if (toRead > sizeof(i2sRawBuffer)) toRead = sizeof(i2sRawBuffer);
    toRead = (toRead / sizeof(int32_t)) * sizeof(int32_t);
    size_t bytesRead = i2sMic.readBytes((char *)i2sRawBuffer, toRead);
    chunkCount = (int)(bytesRead / sizeof(int32_t));
  #else
    size_t bytesRead = 0;
    esp_err_t err = i2s_read(I2S_PORT, i2sRawBuffer, sizeof(i2sRawBuffer), &bytesRead, pdMS_TO_TICKS(20));
    if (err != ESP_OK) return;
    chunkCount = (int)(bytesRead / sizeof(int32_t));
  #endif

  if (chunkCount < 64) return;
  if (chunkCount > I2S_DMA_CHUNK_SAMPLES) chunkCount = I2S_DMA_CHUNK_SAMPLES;

  // Slide 512-sample analysis ring buffer & append latest 16 ms DMA chunk (F-01)
  if (audioRingFilled + chunkCount > I2S_ANALYSIS_SAMPLES) {
    int keep = I2S_ANALYSIS_SAMPLES - chunkCount;
    if (keep > 0) {
      memmove(audioRing, audioRing + (audioRingFilled - keep), keep * sizeof(float));
    }
    audioRingFilled = keep;
  }
  for (int i = 0; i < chunkCount; i++) {
    audioRing[audioRingFilled + i] = (float)(i2sRawBuffer[i] >> 14);
  }
  audioRingFilled += chunkCount;

  if (audioRingFilled < I2S_DMA_CHUNK_SAMPLES) return;

  // DC removal and RMS/peak/ZCR across coherent window
  double mean = 0.0;
  for (int i = 0; i < audioRingFilled; i++) {
    mean += audioRing[i];
  }
  mean /= (double)audioRingFilled;

  double sumSq = 0.0;
  float peak = 0.0f;
  int zcrCount = 0;
  for (int i = 0; i < audioRingFilled; i++) {
    float v = audioRing[i] - (float)mean;
    audioWork[i] = v;
    sumSq += (double)v * (double)v;
    float av = fabsf(v);
    if (av > peak) peak = av;
    if (i > 0 && ((audioWork[i - 1] < 0 && v >= 0) || (audioWork[i - 1] >= 0 && v < 0))) {
      zcrCount++;
    }
  }

  audioRms  = sqrtf((float)(sumSq / (double)audioRingFilled));
  audioPeak = peak;
  audioZcr  = (float)zcrCount / (float)audioRingFilled;

  // 3 acoustic frequency bands via coherent Goertzel probes (100-300 Hz, 300-1000 Hz, 1000-4000 Hz)
  float m150  = goertzelMagnitude(audioWork, audioRingFilled, 150.0f, I2S_SAMPLE_RATE);
  float m250  = goertzelMagnitude(audioWork, audioRingFilled, 250.0f, I2S_SAMPLE_RATE);
  float m450  = goertzelMagnitude(audioWork, audioRingFilled, 450.0f, I2S_SAMPLE_RATE);
  float m750  = goertzelMagnitude(audioWork, audioRingFilled, 750.0f, I2S_SAMPLE_RATE);
  float m1400 = goertzelMagnitude(audioWork, audioRingFilled, 1400.0f, I2S_SAMPLE_RATE);
  float m2600 = goertzelMagnitude(audioWork, audioRingFilled, 2600.0f, I2S_SAMPLE_RATE);

  bandLow  = (m150 + m250) * 0.5f;
  bandMid  = (m450 + m750) * 0.5f;
  bandHigh = (m1400 + m2600) * 0.5f;

  float totalBand = bandLow + bandMid + bandHigh;
  if (totalBand > 0.05f) {
    audioCentroidHz = (bandLow * 200.0f + bandMid * 600.0f + bandHigh * 2000.0f) / totalBand;
  } else {
    audioCentroidHz = 0.0f;
  }
#endif
}

// ---------------------------- MAX30102 PPG ----------------------------------
void resetMAX30102State(float irSeed, float redSeed) {
  ppgValid     = false;
  expHrBpm     = 0.0f;
  expSpo2Pct   = 0.0f;
  irDcEma      = irSeed;
  redDcEma     = redSeed;
  irAcPrev     = 0.0f;
  irCycleMax   = 0.0f;
  irCycleMin   = 0.0f;
  redCycleMax  = 0.0f;
  redCycleMin  = 0.0f;
  beatRising   = false;
  lastBeatMs   = 0;
}

bool setupMAX30102() {
#if !ENABLE_MAX30102
  return false;
#else
  if (!i2cDevicePresent(MAX30102_ADDR)) return false;
  if (!particleSensor.begin(Wire, I2C_SPEED_STANDARD)) return false;
  particleSensor.setup(0x1F, 4, 2, 100, 411, 4096); // moderate LED current
  return true;
#endif
}

void updateMAX30102(unsigned long now) {
#if ENABLE_MAX30102
  if (!maxAvailable) {
    resetMAX30102State(0.0f, 0.0f);
    return;
  }
  uint32_t ir  = particleSensor.getIR();
  uint32_t red = particleSensor.getRed();

  // Require reliable finger/skin optical contact; clear all stale values cleanly (F-03)
  if (ir < 50000) {
    resetMAX30102State((float)ir, (float)red);
    return;
  }

  if (irDcEma < 1000.0f) { irDcEma = (float)ir; redDcEma = (float)red; }
  irDcEma  = 0.92f * irDcEma  + 0.08f * (float)ir;
  redDcEma = 0.92f * redDcEma + 0.08f * (float)red;

  float irAc  = (float)ir - irDcEma;
  float redAc = (float)red - redDcEma;

  if (irAc > irCycleMax)   irCycleMax  = irAc;
  if (irAc < irCycleMin)   irCycleMin  = irAc;
  if (redAc > redCycleMax) redCycleMax = redAc;
  if (redAc < redCycleMin) redCycleMin = redAc;

  // Per-beat peak-to-trough excursion detector (F-03)
  if (irAc > irAcPrev && irAc > 35.0f) {
    beatRising = true;
  } else if (beatRising && irAc < irAcPrev) {
    beatRising = false;
    unsigned long dt = now - lastBeatMs;
    if (lastBeatMs > 0 && dt >= 333 && dt <= 1500) { // 40 - 180 bpm
      float instBpm = 60000.0f / (float)dt;
      expHrBpm = (expHrBpm < 30.0f) ? instBpm : (0.75f * expHrBpm + 0.25f * instBpm);

      float irExcursion  = irCycleMax - irCycleMin;
      float redExcursion = redCycleMax - redCycleMin;
      if (irDcEma > 1000.0f && redDcEma > 1000.0f && irExcursion > 10.0f && redExcursion > 2.0f) {
        float ratio = (redExcursion / redDcEma) / (irExcursion / irDcEma);
        float estSpo2 = 110.0f - 25.0f * ratio;
        if (estSpo2 >= 75.0f && estSpo2 <= 100.0f) {
          expSpo2Pct = (expSpo2Pct < 50.0f) ? estSpo2 : (0.8f * expSpo2Pct + 0.2f * estSpo2);
          ppgValid = true;
        }
      }
    }
    lastBeatMs  = now;
    irCycleMax  = irAc;
    irCycleMin  = irAc;
    redCycleMax = redAc;
    redCycleMin = redAc;
  }
  irAcPrev = irAc;
#endif
}

// --------------------------- DS18B20 1-WIRE ---------------------------------
void setupDS18B20() {
#if ENABLE_DS18B20
  tempSensors.begin();
  tempSensors.setWaitForConversion(false); // Non-blocking async 1-Wire reads
  dsAvailable = (tempSensors.getDeviceCount() > 0);
  if (dsAvailable) {
    tempSensors.requestTemperatures();
    tempConversionPending = true;
    lastTempReqTime = millis();
  }
#endif
}

void updateDS18B20(unsigned long now) {
#if ENABLE_DS18B20
  if (!dsAvailable) {
    contactTempValid = false;
    tempConversionPending = false;
    return;
  }
  if (tempConversionPending && (now - lastTempReqTime >= TEMP_READY_MS)) {
    float t = tempSensors.getTempCByIndex(0);
    tempConversionPending = false; // Explicitly clear pending state on read (F-05)
    if (t > 15.0f && t < 55.0f && fabsf(t - 85.0f) > 0.05f) {
      contactTempC = t;
      contactTempValid = true;
    } else {
      contactTempValid = false;
    }
  }
  if (!tempConversionPending && (now - lastTempReqTime >= TEMP_INTERVAL_MS)) {
    tempSensors.requestTemperatures();
    tempConversionPending = true;
    lastTempReqTime = now;
  }
#endif
}

// ----------------- RESPIRATION, SQI & COUGH STATE MACHINE -------------------
void processBiometrics(unsigned long now) {
  float magDelta = 0.0f;

  // 1. Orientation-compensated chest expansion signal & SQI
  if (mpuAvailable) {
    magDelta = sqrtf(ax * ax + ay * ay + az * az) - 1.0f;
    float gyroMag = sqrtf(gx * gx + gy * gy + gz * gz);

    respFastEma = 0.16f * magDelta + 0.84f * respFastEma;
    respSlowEma = 0.02f * magDelta + 0.98f * respSlowEma;
    float respSig = respFastEma - respSlowEma;

    if (respSig > respCycleMax) respCycleMax = respSig;
    if (respSig < respCycleMin) respCycleMin = respSig;

    // Hysteresis peak-trough breath interval check (1.2s - 10s => 6 - 50 bpm)
    if (respPeakSeeking && respSig < (respCycleMax - 0.020f) && (respCycleMax - respCycleMin) > 0.025f) {
      unsigned long interval = now - lastRespPeakMs;
      if (lastRespPeakMs > 0 && interval >= 1200 && interval <= 10000 && gyroMag < 28.0f) {
        int bpm = (int)roundf(60000.0f / (float)interval);
        measuredRespBpm = (measuredRespBpm < 0) ? bpm : (int)roundf(0.6f * measuredRespBpm + 0.4f * bpm);
      }
      lastRespPeakMs = now;
      respPeakSeeking = false;
      respCycleMin = respSig;
    } else if (!respPeakSeeking && respSig > (respCycleMin + 0.020f)) {
      respPeakSeeking = true;
      respCycleMax = respSig;
    }

    if (gyroMag > 30.0f || fabsf(magDelta) > 0.45f) {
      snprintf(sqiLabel, sizeof(sqiLabel), "POOR");
    } else if ((respCycleMax - respCycleMin) < 0.015f) {
      snprintf(sqiLabel, sizeof(sqiLabel), "FAIR");
    } else {
      snprintf(sqiLabel, sizeof(sqiLabel), "GOOD");
    }
  } else {
    snprintf(sqiLabel, sizeof(sqiLabel), "NOIMU");
  }

  // 2. Hysteresis + Adaptive Noise Floor + Orientation-Independent IMU Gate (F-04)
  float signalMetric = inmpAvailable ? audioRms : (piezoValid ? fabsf((float)piezoVal - 2048.0f) : 0.0f);
  if (!inCoughBurst) {
    audioNoiseFloor = 0.96f * audioNoiseFloor + 0.04f * signalMetric;
  }

  float attackThresh  = audioNoiseFloor * 2.8f + 35.0f;
  float releaseThresh = attackThresh * 0.55f;
  bool  imuContextOk  = (!mpuAvailable) || (fabsf(magDelta) > 0.06f) || (fabsf(gx) + fabsf(gy) > 4.0f) || (signalMetric > attackThresh * 1.4f);

  if (!inCoughBurst) {
    if ((now - lastCoughEndMs) > 350 && signalMetric > attackThresh && imuContextOk) {
      inCoughBurst = true;
      coughBurstStartMs = now;
    }
  } else {
    unsigned long dur = now - coughBurstStartMs;
    if (signalMetric < releaseThresh || dur > 1200) {
      if (dur >= 60 && dur <= 1200) {
        coughCount++;
        rgbAlertUntilMs = now + 700;
      }
      lastCoughEndMs = now;
      inCoughBurst = false;
    }
  }
}

// --------------------------- SSD1306 OLED RENDER ----------------------------
void updateOled() {
#if ENABLE_OLED
  if (!oledAvailable) return;
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  display.setCursor(0, 0);
  display.print("AuraPhragm");
  display.setCursor(68, 0);
  display.print(deviceConnected ? "[BLE]" : "[WAIT]");
  display.setCursor(108, 0);
  display.print("USB");
  display.drawLine(0, 9, 128, 9, SSD1306_WHITE);

  display.setCursor(0, 12);
  display.print("RESP");
  display.setCursor(68, 12);
  display.print("COUGHS");

  display.setTextSize(2);
  display.setCursor(0, 22);
  if (measuredRespBpm > 0) display.print(measuredRespBpm);
  else display.print("NA");

  display.setCursor(68, 22);
  display.print(coughCount);

  display.drawLine(0, 41, 128, 41, SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 45);
  display.print("T:");
  if (contactTempValid) display.print(contactTempC, 1);
  else display.print("NA");
  display.print("C ");
  display.print("SQI:");
  display.print(sqiLabel);

  display.setCursor(0, 55);
  display.print("PPG*:");
  if (ppgValid) {
    display.print((int)roundf(expHrBpm));
    display.print("/");
    display.print((int)roundf(expSpo2Pct));
    display.print("%");
  } else {
    display.print("NA");
  }
  display.display();
#endif
}

// -------------------------- BLE CALLBACKS (F-06 / F-07) ---------------------
class AuraServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* srv) { deviceConnected = true; }
  void onDisconnect(BLEServer* srv) { deviceConnected = false; }
};

class AuraRxCallbacks: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    #if USE_ESP_CORE_V3
      String cmd = pCharacteristic->getValue();
    #else
      std::string raw = pCharacteristic->getValue();
      String cmd = String(raw.c_str());
    #endif
    cmd.trim();
    cmd.toUpperCase();
    if (cmd.length() == 0) return;

    snprintf(lastBleCmd, sizeof(lastBleCmd), "%s", cmd.c_str());
    Serial.print("BLE RX CMD: ");
    Serial.println(cmd);

    if (cmd == "RESET_COUGH") {
      coughCount = 0;
      inCoughBurst = false;
      lastCoughEndMs = 0;
    } else if (cmd == "RESET_RESP") {
      measuredRespBpm = -1;
      respCycleMax = -999.0f;
      respCycleMin = 999.0f;
      lastRespPeakMs = 0;
      respFastEma = 0.0f;
      respSlowEma = 0.0f;
    } else if (cmd == "LED_TEST") {
      rgbAlertUntilMs = millis() + 900;
    } else if (cmd == "PING") {
      Serial.println("PONG: AuraPhragm AP2 alive.");
    }
  }
};

void notifyPacketSafe(const char *packet, size_t len) {
  if (!deviceConnected || pTxCharacteristic == NULL || pServer == NULL || len == 0) return;

  uint16_t peerMtu = pServer->getPeerMTU(pServer->getConnId());
  size_t maxPayload = (peerMtu > 23 && peerMtu <= 517) ? (size_t)(peerMtu - 3) : 20;

  if (len <= maxPayload) {
    pTxCharacteristic->setValue((uint8_t*)packet, len);
    pTxCharacteristic->notify();
    return;
  }

  // Fallback MTU chunking so companion app rxBuffer reassembles full AP2 line (F-06)
  size_t offset = 0;
  while (offset < len) {
    size_t chunkLen = len - offset;
    if (chunkLen > maxPayload) chunkLen = maxPayload;
    pTxCharacteristic->setValue((uint8_t*)(packet + offset), chunkLen);
    pTxCharacteristic->notify();
    offset += chunkLen;
    if (offset < len) delay(4);
  }
}

void setup() {
  Serial.begin(115200);

#if ENABLE_RGB_LED
  pinMode(RGB_R_PIN, OUTPUT);
  pinMode(RGB_G_PIN, OUTPUT);
  pinMode(RGB_B_PIN, OUTPUT);
  setRgbLed(false, true, true); // Startup cyan
#endif

#if ENABLE_PIEZO_ADC
  pinMode(PIEZO_PIN, INPUT);
  piezoValid = true;
#endif

  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  Wire.setClock(100000);

#if ENABLE_OLED
  if (i2cDevicePresent(OLED_ADDR) && display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    oledAvailable = true;
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(10, 20);
    display.println("AuraPhragm v2.1 AP2");
    display.setCursor(10, 34);
    display.println("USB Bring-Up Mode");
    display.display();
  }
#endif

  mpuAvailable  = setupMPU6050();
  maxAvailable  = setupMAX30102();
  inmpAvailable = setupINMP441();
  setupDS18B20();

  BLEDevice::init("AuraPhragm-Belt");
  BLEDevice::setMTU(185); // Request 185-byte ATT MTU for single-frame AP2 packets (F-06)
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new AuraServerCallbacks());
  BLEService *pService = pServer->createService(SERVICE_UUID);

  pTxCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID_TX,
    BLECharacteristic::PROPERTY_NOTIFY
  );
  pTxCharacteristic->addDescriptor(new BLE2902());

  pRxCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID_RX,
    BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR
  );
  pRxCharacteristic->setCallbacks(new AuraRxCallbacks());

  pService->start();
  pServer->getAdvertising()->start();

  Serial.println("AuraPhragm AP2 v2.1 Ready.");
}

void loop() {
  unsigned long now = millis();

  // Attempt periodic MPU6050 I2C recovery after transient bus loss (F-08)
  if (ENABLE_MPU6050 && !mpuAvailable && (now - lastMpuRecoveryMs >= MPU_RECOVERY_INTERVAL_MS)) {
    lastMpuRecoveryMs = now;
    if (setupMPU6050()) {
      mpuAvailable = true;
      Serial.println("MPU6050 I2C recovered.");
    }
  }

  updateDS18B20(now);
  updateStatusLed(now);

  if (now - lastSampleTime >= SAMPLE_INTERVAL_MS) {
    lastSampleTime = now;
    packetSeq++;

    readMPU6050();
    sampleINMP441Frame();
    updateMAX30102(now);

#if ENABLE_PIEZO_ADC
    piezoVal = analogRead(PIEZO_PIN);
    piezoValid = true;
#else
    piezoValid = false;
#endif

    processBiometrics(now);

    uint8_t flags = 0;
    if (mpuAvailable)  flags |= FLAG_MPU6050_OK;
    if (inmpAvailable) flags |= FLAG_INMP441_OK;
    if (ppgValid)      flags |= FLAG_MAX30102_OK;
    if (contactTempValid) flags |= FLAG_DS18B20_OK;
    if (piezoEnabled && piezoValid) flags |= FLAG_PIEZO_OK;
    if (oledAvailable) flags |= FLAG_OLED_OK;
    if (rgbEnabled)    flags |= FLAG_RGB_OK;

    char pzStr[8], hrStr[8], spStr[8], tmpStr[8], respStr[8];
    if (piezoEnabled && piezoValid) snprintf(pzStr, sizeof(pzStr), "%d", piezoVal);
    else snprintf(pzStr, sizeof(pzStr), "NA");

    if (ppgValid) {
      snprintf(hrStr, sizeof(hrStr), "%.0f", expHrBpm);
      snprintf(spStr, sizeof(spStr), "%.0f", expSpo2Pct);
    } else {
      snprintf(hrStr, sizeof(hrStr), "NA");
      snprintf(spStr, sizeof(spStr), "NA");
    }

    if (contactTempValid) snprintf(tmpStr, sizeof(tmpStr), "%.2f", contactTempC);
    else snprintf(tmpStr, sizeof(tmpStr), "NA");

    if (measuredRespBpm > 0) snprintf(respStr, sizeof(respStr), "%d", measuredRespBpm);
    else snprintf(respStr, sizeof(respStr), "NA");

    // Versioned AuraPhragm AP2 packet (<160 bytes)
    char packet[160];
    int pktLen = snprintf(packet, sizeof(packet),
      "AP2,%lu,%lu,%02X,%.3f,%.3f,%.3f,%.1f,%.1f,%.1f,%.1f,%.1f,%.0f,%.3f,%.1f,%.1f,%.1f,%s,%s,%s,%s,%d,%s,%s,USB\\n",
      (unsigned long)packetSeq, now, flags,
      ax, ay, az, gx, gy, gz,
      inmpAvailable ? audioRms : 0.0f,
      inmpAvailable ? audioPeak : 0.0f,
      inmpAvailable ? audioCentroidHz : 0.0f,
      inmpAvailable ? audioZcr : 0.0f,
      inmpAvailable ? bandLow : 0.0f,
      inmpAvailable ? bandMid : 0.0f,
      inmpAvailable ? bandHigh : 0.0f,
      pzStr, hrStr, spStr, tmpStr, coughCount, respStr, sqiLabel
    );

    if (pktLen > 0) {
      size_t safeLen = ((size_t)pktLen < sizeof(packet)) ? (size_t)pktLen : sizeof(packet) - 1;
      notifyPacketSafe(packet, safeLen);
    }
  }

  if (now - lastDisplayTime >= DISPLAY_INTERVAL_MS) {
    lastDisplayTime = now;
    updateOled();
  }

  if (!deviceConnected && oldDeviceConnected) {
    delay(500);
    pServer->startAdvertising();
    oldDeviceConnected = deviceConnected;
  }
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
  }
}
`;

export interface FirmwareAuditFixItem {
  id: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  area: string;
  summary: string;
  resolution: string;
}

export const FIRMWARE_AUDIT_FIXES: FirmwareAuditFixItem[] = [
  {
    id: 'F-01',
    severity: 'HIGH',
    area: 'sampleINMP441Frame()',
    summary: '512-sample I2S read with 5-tick timeout starved the 20 ms control loop.',
    resolution: 'Uses 256-sample DMA chunks (16 ms @ 16 kHz), pdMS_TO_TICKS(20) timeout, and a sliding 512-sample ring buffer for coherent Goertzel bins.',
  },
  {
    id: 'F-02',
    severity: 'HIGH',
    area: 'ESP32 Arduino Core v2/v3',
    summary: 'Legacy driver/i2s.h failed compilation under ESP32 Arduino Core v3.x (ESP-IDF v5).',
    resolution: 'Conditional ESP_ARDUINO_VERSION_MAJOR >= 3 switches cleanly between <ESP_I2S.h> (v3) and driver/i2s.h (v2), plus String/std::string BLE RX handling.',
  },
  {
    id: 'F-03',
    severity: 'MEDIUM',
    area: 'updateMAX30102()',
    summary: 'Peak decay (*= 0.5f) skewed SpO2 ratio and left stale HR/SpO2 after finger removal.',
    resolution: 'Tracks true per-beat peak-to-trough excursions and resets expHrBpm, expSpo2Pct, and cycle extrema to zero when IR < 50,000.',
  },
  {
    id: 'F-04',
    severity: 'MEDIUM',
    area: 'processBiometrics()',
    summary: 'Cough IMU gate checked fabsf(az - 1.0f), breaking whenever belt sat vertically on chest.',
    resolution: 'Uses orientation-independent 3-axis magnitude delta fabsf(magDelta) > 0.06f in both ESP32 firmware and companion signalProcessing.ts.',
  },
  {
    id: 'F-05',
    severity: 'LOW',
    area: 'updateDS18B20()',
    summary: 'tempConversionPending stayed true after reading DS18B20 temperature.',
    resolution: 'Clears tempConversionPending after getTempCByIndex(0) at >=750 ms before scheduling next 1 Hz async request.',
  },
  {
    id: 'F-06',
    severity: 'MEDIUM',
    area: 'BLE TX & MTU',
    summary: '~150-byte AP2 lines risked truncation on 20-byte default ATT payloads.',
    resolution: 'Calls BLEDevice::setMTU(185) and slices AP2 notifications cleanly to peer MTU payload size with \\n reassembly in bleService.ts.',
  },
  {
    id: 'F-07',
    severity: 'LOW',
    area: 'CHARACTERISTIC_UUID_RX',
    summary: 'BLE RX characteristic lacked a write callback handler.',
    resolution: 'Attached AuraRxCallbacks handling RESET_COUGH, RESET_RESP, LED_TEST, and PING directly from the companion app.',
  },
  {
    id: 'F-08',
    severity: 'LOW',
    area: 'readMPU6050()',
    summary: 'Single transient I2C NACK permanently disabled MPU6050 until reboot.',
    resolution: 'Requires 5 consecutive bus errors before offline flag and attempts automatic I2C re-initialization every 2.5 seconds.',
  },
];

export interface PinAssignmentRow {
  component: string;
  pin: string;
  esp32Pin: string;
  bus: 'I2C' | '1-Wire' | 'I2S' | 'ADC1' | 'GPIO' | 'Power';
  notes: string;
  safetyFlag?: string;
}

export const WIRING_PINOUT_GUIDE: PinAssignmentRow[] = [
  {
    component: 'Shared I2C SDA (MPU6050, MAX30102, OLED)',
    pin: 'SDA',
    esp32Pin: 'GPIO21',
    bus: 'I2C',
    notes: 'Shared I2C data line across 0x68 (MPU6050), 0x57 (MAX30102), and 0x3C (SSD1306).',
  },
  {
    component: 'Shared I2C SCL (MPU6050, MAX30102, OLED)',
    pin: 'SCL / SCK',
    esp32Pin: 'GPIO22',
    bus: 'I2C',
    notes: 'Shared I2C clock line. Run an I2C scanner after wiring; avoid stacking extra pull-ups blindly.',
  },
  {
    component: 'DS18B20 Waterproof Probe',
    pin: 'DATA (Yellow/White typical)',
    esp32Pin: 'GPIO4',
    bus: '1-Wire',
    notes: '1-Wire contact skin temp only. REQUIRES 4.7 kOhm pull-up to 3V3 (200 kOhm inventory resistors do NOT work). Verify wire colours!',
  },
  {
    component: 'INMP441 I2S Digital Mic',
    pin: 'SCK / BCLK',
    esp32Pin: 'GPIO14',
    bus: 'I2S',
    notes: 'I2S bit clock. NOT the OLED SCL/SCK pin.',
  },
  {
    component: 'INMP441 I2S Digital Mic',
    pin: 'WS / LRCLK',
    esp32Pin: 'GPIO33',
    bus: 'I2S',
    notes: 'I2S word-select clock at 16 kHz.',
  },
  {
    component: 'INMP441 I2S Digital Mic',
    pin: 'SD',
    esp32Pin: 'GPIO32',
    bus: 'I2S',
    notes: 'Serial digital audio output into ESP32.',
  },
  {
    component: 'INMP441 I2S Digital Mic',
    pin: 'L/R',
    esp32Pin: 'GND',
    bus: 'I2S',
    notes: 'Selects left audio channel on standard INMP441 breakout.',
  },
  {
    component: 'Piezo Disc (Conditioned AFE Output)',
    pin: 'AFE OUT',
    esp32Pin: 'GPIO34 (ADC1_CH6)',
    bus: 'ADC1',
    safetyFlag: 'ISOLATED (ENABLE_PIEZO_ADC = 0)',
    notes: 'Input-only, NOT 5V tolerant. Keep disconnected until a 0-3.3V bias/clamp/filter AFE is bench-verified. 1 MOhm or 1N4007 alone is insufficient.',
  },
  {
    component: 'RGB Status LED — Red',
    pin: 'Red Channel',
    esp32Pin: 'GPIO25',
    bus: 'GPIO',
    notes: 'Individual 220-330 Ohm series resistor required (Common Cathode: GPIO HIGH = ON).',
  },
  {
    component: 'RGB Status LED — Green',
    pin: 'Green Channel',
    esp32Pin: 'GPIO26',
    bus: 'GPIO',
    notes: 'Individual 220-330 Ohm series resistor required.',
  },
  {
    component: 'RGB Status LED — Blue',
    pin: 'Blue Channel',
    esp32Pin: 'GPIO27',
    bus: 'GPIO',
    notes: 'Individual 220-330 Ohm series resistor required.',
  },
  {
    component: 'Module Power & Ground',
    pin: 'VCC / GND',
    esp32Pin: '3V3 / GND (USB Bring-Up)',
    bus: 'Power',
    notes: 'Confirm breakout accepts 3.3V before connecting to 3V3. Keep LiPo battery, LM2596 buck converter, and USB socket disconnected.',
  },
];

export const SHARED_I2C_CONNECTIONS = [
  { module: 'MPU6050 (IMU)', vcc: '3V3 (confirm board regulator)', gnd: 'GND', sdaScl: 'GPIO21 / GPIO22', addr: '0x68 (AD0=HIGH -> 0x69)' },
  { module: 'MAX30102 (PPG Exp.)', vcc: '3V3 only if breakout supports', gnd: 'GND', sdaScl: 'GPIO21 / GPIO22', addr: '0x57 (verify pull-ups/level)' },
  { module: 'SSD1306 0.96" OLED', vcc: '3V3 (4-pin I2C version)', gnd: 'GND', sdaScl: 'GPIO21 / GPIO22', addr: '0x3C (SCL often labelled SCK)' },
];

export const BUILD_AND_TEST_ORDER = [
  { step: 1, title: 'Mark Perfboard Power & Signal Pads', detail: 'With power disconnected, label 3V3, GND, SDA (21), SCL (22), and each GPIO pad; verify zero shorts between 3V3 and GND.' },
  { step: 2, title: 'USB-Only ESP32 Bring-Up', detail: 'Power the 30-pin ESP32 DevKit V1 alone via USB cable and confirm clean boot and stable 3.3V regulator output.' },
  { step: 3, title: 'SSD1306 OLED Test (0x3C)', detail: 'Wire only the 4-pin OLED (3V3, GND, GPIO21, GPIO22) and verify "AuraPhragm v2.1 AP2" renders cleanly.' },
  { step: 4, title: 'Add MPU6050 (0x68) & I2C Scan', detail: 'Attach MPU6050 to the shared I2C bus, confirm addresses 0x3C and 0x68, and log raw stationary offsets.' },
  { step: 5, title: 'Verify & Test MAX30102 (0x57)', detail: 'Check MAX30102 breakout voltage/pull-ups first; wire to shared I2C and verify IR contact threshold (>50,000).' },
  { step: 6, title: 'Add DS18B20 + 4.7 kOhm Pull-Up', detail: 'Verify seller wire colours (do NOT assume blindly) and install a 4.7 kOhm pull-up from GPIO4 to 3V3 (not 200 kOhm).' },
  { step: 7, title: 'Wire INMP441 I2S Microphone', detail: 'Connect SCK=14, WS=33, SD=32, L/R=GND, VDD=3V3 and verify Core v2/v3 256-sample DMA audio RMS/bands.' },
  { step: 8, title: 'Test Common-Cathode RGB LED', detail: 'Confirm Common Cathode polarity (COM -> GND) and drive GPIO25/26/27 through three individual 220-330 Ohm resistors.' },
  { step: 9, title: 'Keep Piezo Isolated Until AFE Bench-Test', detail: 'Leave Piezo disconnected from GPIO34 (#define ENABLE_PIEZO_ADC 0) until a 0-3.3V clamp/bias/filter AFE is oscilloscope-verified.' },
  { step: 10, title: 'Integrate BLE Last & Verify AP2 Stream', detail: 'Enable BLE advertising ("AuraPhragm-Belt"), verify MTU/chunked AP2 packets, and test RX commands (RESET_COUGH, LED_TEST, PING).' },
];

export const GPIO_SAFETY_REMINDERS = [
  'ESP32 GPIOs operate strictly at 3.3 V logic and are NOT 5 V tolerant.',
  'GPIO34 is ADC1 input-only; it cannot output a signal or drive an LED.',
  'Never connect GPIO6–GPIO11 (connected internally to onboard SPI flash).',
  'Avoid boot-strapping pins (GPIO0, GPIO2, GPIO12, GPIO15) for external loads unless boot states are accounted for.',
  'Keep LM2596 buck converter, battery, and female USB socket disconnected during initial USB bring-up (LM2596 cannot step up a lower battery voltage to 5 V).',
  'Check for 3V3-to-GND continuity shorts with a multimeter before applying USB power.',
];

export const VERIFICATION_CHECKLIST = [
  'ESP32 DevKit V1 orientation and labels verified against the physical 30-pin board.',
  'Arduino IDE ESP32 core version checked (v2.0.17 or v3.x) and compiles cleanly with zero I2S/BLE warnings.',
  'All breakout VCC requirements confirmed (3.3 V vs 5 V/VIN regulators) before wiring.',
  'I2C scanner finds 0x3C (OLED), 0x68 (MPU6050), and 0x57 (MAX30102) without conflicts.',
  'Zero 5 V connections applied to any ESP32 GPIO or 3.3 V-only sensor line.',
  'DS18B20 4.7 kOhm pull-up resistor between GPIO4 (DATA) and 3V3 verified.',
  'INMP441 I2S pins (14/33/32) and L/R=GND verified; 16 kHz RMS & Goertzel bands react cleanly at 50 Hz loop rate.',
  'RGB LED Common Cathode polarity confirmed with 3 individual 220-330 Ohm resistors (testable via BLE LED_TEST command).',
  'Piezo disc remains disconnected from GPIO34 until protected 0-3.3 V analogue front-end is validated.',
  'Battery, USB female socket, and LM2596 remain isolated until full power subsystem is engineered.',
];
