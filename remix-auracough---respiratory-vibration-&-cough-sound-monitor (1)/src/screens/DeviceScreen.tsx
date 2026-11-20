import React, { useState } from 'react';
import { SupportedLanguage, APP_CONFIG } from '../config/appConfig';
import {
  BleConnectionState,
  LocationPermissionStatus,
  SensorPacket,
  SignalFeatures,
} from '../types';
import { bleService, BeltBleCommand } from '../services/bleService';
import { OledPreview } from '../components/OledPreview';
import { BeltBlueprintSketch } from '../components/BeltBlueprintSketch';
import {
  BELT_MATERIALS_LIST,
  PHYSICAL_BUILD_STEPS,
  OPENSCAD_ENCLOSURE_CODE,
} from '../constants/beltHardwareGuide';
import {
  WIRING_PINOUT_GUIDE,
  SHARED_I2C_CONNECTIONS,
  BUILD_AND_TEST_ORDER,
  GPIO_SAFETY_REMINDERS,
  VERIFICATION_CHECKLIST,
  FIRMWARE_AUDIT_FIXES,
  ESP32_FIRMWARE_SKETCH,
} from '../constants/esp32Firmware';
import {
  Bluetooth,
  BluetoothConnected,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Monitor,
  Code,
  Wrench,
  Download,
  Copy,
  Check,
  Layers,
  HeartPulse,
  Info,
  Box,
  FileCode,
  ShieldAlert,
  MapPin,
  Cpu,
} from 'lucide-react';

interface Props {
  language: SupportedLanguage;
  packet: SensorPacket | null;
  features: SignalFeatures;
  bleState: BleConnectionState;
  bleStatusMsg: string;
  isSimulated: boolean;
  locationStatus?: LocationPermissionStatus;
  onRequestLocation?: () => Promise<void>;
  onToggleSimulation: () => void;
  onNavigate: (tab: string) => void;
}

type DeviceSubTab = 'belt_build' | 'connectivity' | 'schematics';

export const DeviceScreen: React.FC<Props> = ({
  packet,
  features,
  bleState,
  bleStatusMsg,
  isSimulated,
  locationStatus = 'idle',
  onRequestLocation,
  onToggleSimulation,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<DeviceSubTab>('belt_build');
  const [isScanning, setIsScanning] = useState(false);
  const [showPostBleLocationPrompt, setShowPostBleLocationPrompt] = useState(false);
  const [selectedBOMCategory, setSelectedBOMCategory] = useState<string>('all');
  const [copiedCad, setCopiedCad] = useState(false);
  const [copiedSketch, setCopiedSketch] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});
  const [bleCmdFeedback, setBleCmdFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [sendingCmd, setSendingCmd] = useState<string | null>(null);

  const handleSendBleCommand = async (cmd: BeltBleCommand) => {
    setSendingCmd(cmd);
    const res = await bleService.sendCommand(cmd);
    setBleCmdFeedback({ ok: res.ok, text: res.message });
    setSendingCmd(null);
  };

  const toggleChecklistItem = (idx: number) => {
    setCheckedSteps((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleConnectBle = async () => {
    setIsScanning(true);
    const connected = await bleService.connect();
    setIsScanning(false);
    if (connected && locationStatus !== 'granted') {
      setShowPostBleLocationPrompt(true);
    }
  };

  const handleDisconnectBle = async () => {
    await bleService.disconnect();
  };

  const handleCopyCad = () => {
    navigator.clipboard.writeText(OPENSCAD_ENCLOSURE_CODE);
    setCopiedCad(true);
    setTimeout(() => setCopiedCad(false), 2000);
  };

  const handleDownloadCad = () => {
    const blob = new Blob([OPENSCAD_ENCLOSURE_CODE], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'AuraPhragm_Belt_Enclosure.scad';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySketch = () => {
    navigator.clipboard.writeText(ESP32_FIRMWARE_SKETCH);
    setCopiedSketch(true);
    setTimeout(() => setCopiedSketch(false), 2000);
  };

  const handleDownloadSketch = () => {
    const blob = new Blob([ESP32_FIRMWARE_SKETCH], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'AuraPhragm_ESP32.ino';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredBOM = BELT_MATERIALS_LIST.filter((item) => {
    if (selectedBOMCategory === 'all') return true;
    return item.category === selectedBOMCategory;
  });

  const lastRawLine = bleService.getLastRawLine();
  const droppedCount = bleService.getDroppedPacketCount();
  const bleStats = bleService.getPacketStats();

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-mono font-bold text-teal-400 uppercase tracking-wider">
            ESP32 DevKit V1 (30-Pin) • Protocol AP2
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight mt-1 font-display">
            AuraPhragm Multi-Sensor Belt &amp; Pod
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Physical assembly manual, USB-only initial bring-up safety, 30-pin GPIO mapping, and ESP32 AP2 firmware.
          </p>
        </div>

        {/* Stream Source Toggle */}
        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-2 text-xs shrink-0">
          <span className="text-slate-400 font-semibold pl-2">Stream Source:</span>
          <button
            type="button"
            onClick={onToggleSimulation}
            className={`rounded-lg px-3 py-1.5 font-bold transition cursor-pointer whitespace-nowrap ${
              isSimulated ? 'bg-amber-600 text-white' : 'bg-teal-600 text-white'
            }`}
          >
            {isSimulated ? 'Simulation Mode' : 'Real Hardware Belt'}
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs overflow-x-auto">
        {[
          { id: 'belt_build', label: 'Belt Build, BOM & CAD', icon: Wrench },
          { id: 'connectivity', label: 'BLE AP2 Pairing & OLED', icon: Monitor },
          { id: 'schematics', label: '30-Pin GPIO, Checklists & .INO', icon: Code },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id as DeviceSubTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: BELT BUILD, BOM & CAD */}
      {activeSubTab === 'belt_build' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Architecture & Safety Bring-up Banner */}
          <div className="rounded-2xl border border-teal-500/35 bg-gradient-to-br from-teal-950/35 via-slate-900 to-slate-950 p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono uppercase tracking-widest text-teal-300 block">
                  USB Bring-Up Architecture • Staged Sensor Integration
                </span>
                <h3 className="text-xl md:text-2xl font-black text-white tracking-tight font-display">
                  AuraPhragm Multi-Sensor Architecture (v2 AP2)
                </h3>
                <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
                  Upgrades the belt to dual-rate acquisition: 50 Hz MPU6050 chest-wall motion + 16 kHz INMP441 I²S acoustics + DS18B20 skin/contact temp + experimental MAX30102 PPG + SSD1306 OLED + Common-Cathode RGB LED. Piezo GPIO34 and battery/LM2596 power stay isolated until bench-verified.
                </p>
              </div>
              <div className="rounded-xl bg-slate-950 border border-amber-500/35 p-3.5 text-xs font-mono space-y-1 shrink-0">
                <span className="text-amber-300 font-bold block">POWER BRING-UP</span>
                <span className="text-slate-300 block">Regulated USB Only</span>
                <span className="text-slate-500 block">LM2596 / Battery: Postponed</span>
              </div>
            </div>
          </div>

          <BeltBlueprintSketch />

          {/* Anatomical Placement & Multi-Sensor Coupling */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <HeartPulse className="w-5 h-5 text-teal-400" />
              <h3 className="text-base font-bold text-white">
                Anatomical Placement &amp; Guarded Sensor Scope
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300 leading-relaxed">
              <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 space-y-1.5">
                <strong className="text-teal-300 font-bold block text-sm">1. Lower Thoracic Placement</strong>
                <p>
                  Rigidly seat the MPU6050 over the lower costal margin / xiphoid level so respiratory tidal expansion maps cleanly onto IMU motion without cable-tug vibration.
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 space-y-1.5">
                <strong className="text-sky-300 font-bold block text-sm">2. INMP441 &amp; DS18B20 Exposure</strong>
                <p>
                  Keep the INMP441 acoustic port unobstructed toward the chest wall for 16 kHz cough bursts. Position DS18B20 for skin/contact reading only (never report as core temperature).
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4 border border-amber-500/30 space-y-1.5">
                <strong className="text-amber-300 font-bold block text-sm">3. Piezo &amp; MAX30102 Guardrails</strong>
                <p>
                  Keep Piezo disconnected from GPIO34 (<code className="font-mono text-amber-300">ENABLE_PIEZO_ADC 0</code>) until a 0–3.3V clamp/bias AFE passes oscilloscope checks. Treat MAX30102 SpO₂/HR as experimental.
                </p>
              </div>
            </div>
          </div>

          {/* Hardware Inventory Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-bold text-white">
                  AuraPhragm Component Inventory ({filteredBOM.length} Items)
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'Controller & Display', label: 'Controller & Display' },
                  { id: 'Active Sensors', label: 'Active Sensors' },
                  { id: 'Guard-Flagged / Postponed', label: 'Guard-Flagged' },
                  { id: 'Belt Fabric & Couplers', label: 'Fabric & Case' },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedBOMCategory(c.id)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer text-[11px] whitespace-nowrap ${
                      selectedBOMCategory === c.id
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                    <th className="py-2.5 pr-3 font-bold">Component</th>
                    <th className="py-2.5 pr-3 font-bold">Electrical &amp; Pin Specs</th>
                    <th className="py-2.5 pr-3 font-bold">Bring-Up Status</th>
                    <th className="py-2.5 font-bold">System Role &amp; Constraints</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredBOM.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-950/50">
                      <td className="py-3 pr-3 font-bold text-white max-w-[180px]">
                        <span>{item.item}</span>
                        <span className="block text-[10px] text-teal-400 font-normal">{item.category}</span>
                      </td>
                      <td className="py-3 pr-3 text-slate-300 font-mono text-[11px] max-w-[210px]">
                        {item.specifications}
                      </td>
                      <td
                        className={`py-3 pr-3 font-mono text-[11px] font-semibold max-w-[170px] ${
                          item.category === 'Guard-Flagged / Postponed' ? 'text-amber-300' : 'text-emerald-300'
                        }`}
                      >
                        {item.statusNote}
                      </td>
                      <td className="py-3 text-slate-300 text-[11px] leading-relaxed max-w-[260px]">
                        {item.roleInBelt}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 6-Stage Physical Build Manual */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Wrench className="w-5 h-5 text-teal-400" />
              <h3 className="text-base font-bold text-white">
                Physical Assembly &amp; Isolation Stages (6 Stages)
              </h3>
            </div>

            <div className="space-y-4">
              {PHYSICAL_BUILD_STEPS.map((s) => (
                <div key={s.step} className="rounded-xl bg-slate-950 p-4 border border-slate-800/80 space-y-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="flex items-center justify-center w-6 h-6 rounded-md bg-teal-500/20 border border-teal-500/40 text-teal-300 font-bold font-mono text-xs tabular-nums">
                      {s.step}
                    </span>
                    <h4 className="text-sm font-bold text-white">{s.title}</h4>
                    <span className="text-[11px] text-slate-400 font-medium">({s.summary})</span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed pl-8">{s.details}</p>

                  <div className="ml-8 rounded-lg bg-teal-950/30 p-2.5 border border-teal-500/20 text-[11px] text-teal-200 flex items-start gap-2">
                    <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Builder Tip:</strong> {s.tip}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3D-Printable Enclosure OpenSCAD CAD */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-teal-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    Ergonomic Sensor Enclosure Proposal (OpenSCAD CAD)
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    82 × 50 × 24 mm housing with 50 mm strap slots, OLED window, USB port &amp; acoustic aperture
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyCad}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition cursor-pointer whitespace-nowrap"
                >
                  {copiedCad ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCad ? 'Copied' : 'Copy CAD'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadCad}
                  className="flex items-center gap-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 px-3 py-1.5 text-xs font-bold text-white transition cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .SCAD</span>
                </button>
              </div>
            </div>

            <pre className="rounded-xl bg-slate-950 p-4 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-56 leading-relaxed">
              {OPENSCAD_ENCLOSURE_CODE}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 2: BLE PAIRING & OLED PREVIEW */}
      {activeSubTab === 'connectivity' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* BLE Connection Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`rounded-xl p-2.5 border ${
                        bleState === 'connected'
                          ? 'border-emerald-500/30 bg-emerald-950/40 text-emerald-400'
                          : bleState === 'connecting'
                          ? 'border-amber-500/30 bg-amber-950/40 text-amber-400'
                          : 'border-slate-700 bg-slate-800 text-slate-400'
                      }`}
                    >
                      {bleState === 'connected' ? (
                        <BluetoothConnected className="w-6 h-6" />
                      ) : (
                        <Bluetooth className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">AuraPhragm Nordic BLE UART</h3>
                      <p className="text-xs text-slate-400 font-mono">Service: 6e400001-b5a3...</p>
                    </div>
                  </div>

                  <span
                    className={`font-mono text-[11px] font-bold uppercase tracking-wider ${
                      bleState === 'connected'
                        ? 'text-emerald-400'
                        : bleState === 'connecting'
                        ? 'text-amber-300'
                        : 'text-slate-400'
                    }`}
                  >
                    {bleState}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {bleStatusMsg ||
                    'Scan and pair directly with "AuraPhragm-Belt" via Web Bluetooth. Expects versioned AP2 multi-sensor packets at 50 Hz.'}
                </p>

                <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 space-y-2 text-xs font-mono tabular-nums">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Protocol / Flags:</span>
                    <span className="text-teal-300">
                      {packet?.protocolVersion || 'AP2'} • 0x{packet?.flagsHex || '00'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Dual-Rate Loop:</span>
                    <span className="text-slate-200">50 Hz BLE + 16 kHz I2S</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Power Source:</span>
                    <span className="text-sky-300 font-bold">
                      {packet?.powerSource === 'BATTERY' && packet.batteryPct !== null
                        ? `BAT ${packet.batteryPct}%`
                        : 'USB Bring-Up (Battery Postponed)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">MTU / Reassembled Chunks:</span>
                    <span className="text-slate-200">
                      {bleStats.lastPacketBytes > 0 ? `${bleStats.lastPacketBytes} B` : 'MTU 185 req'} •{' '}
                      {bleStats.reassembledFragments} frags
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Packets OK / Dropped:</span>
                    <span className="text-slate-300">
                      {bleStats.totalPackets} / {droppedCount}
                    </span>
                  </div>
                </div>

                {/* BLE RX Command Console (F-07) */}
                <div className="rounded-xl bg-slate-950 p-3.5 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono font-bold text-teal-400 uppercase tracking-wider">
                      ESP32 RX Commands (UUID 6e400002)
                    </span>
                    <span className="font-mono text-slate-500">
                      {bleStats.hasRxSupport ? 'RX Ready' : 'Requires BLE'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {(
                      [
                        { cmd: 'RESET_COUGH', label: 'Reset Coughs' },
                        { cmd: 'RESET_RESP', label: 'Reset Resp BPM' },
                        { cmd: 'LED_TEST', label: 'Test RGB LED' },
                        { cmd: 'PING', label: 'Ping Belt' },
                      ] as { cmd: BeltBleCommand; label: string }[]
                    ).map((item) => (
                      <button
                        key={item.cmd}
                        type="button"
                        disabled={bleState !== 'connected' || sendingCmd !== null}
                        onClick={() => handleSendBleCommand(item.cmd)}
                        className="rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 hover:border-teal-500/40 px-2.5 py-1.5 font-mono font-semibold text-slate-200 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {sendingCmd === item.cmd ? 'Sending...' : item.label}
                      </button>
                    ))}
                  </div>
                  {bleCmdFeedback && (
                    <p
                      className={`text-[11px] font-mono ${
                        bleCmdFeedback.ok ? 'text-emerald-300' : 'text-amber-300'
                      }`}
                    >
                      {bleCmdFeedback.text}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-800">
                {bleState === 'connected' ? (
                  <button
                    type="button"
                    onClick={handleDisconnectBle}
                    className="w-full rounded-xl border border-rose-500/40 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 py-3 text-xs font-bold transition cursor-pointer"
                  >
                    Disconnect AuraPhragm Belt
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectBle}
                    disabled={isScanning}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 py-3 text-sm font-black shadow-lg shadow-teal-500/20 transition active:scale-98 cursor-pointer disabled:opacity-50"
                  >
                    <Bluetooth className="w-4 h-4" />
                    <span>{isScanning ? 'Scanning for AuraPhragm-Belt...' : 'Pair & Connect BLE Belt'}</span>
                  </button>
                )}

                {(showPostBleLocationPrompt || locationStatus === 'granted') && onRequestLocation && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/25 p-3.5 text-xs space-y-2">
                    <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {locationStatus === 'granted'
                        ? 'Nearby Hospitals Location Active'
                        : 'Bluetooth Ready! Enable Nearby Hospitals?'}
                    </span>
                    {locationStatus !== 'granted' && (
                      <button
                        type="button"
                        onClick={async () => {
                          await onRequestLocation();
                          setShowPostBleLocationPrompt(false);
                        }}
                        className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2 text-xs transition cursor-pointer"
                      >
                        Allow Location for Hospital Call List
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* SSD1306 128x64 OLED Live Preview */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-4 flex flex-col items-center justify-between">
              <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-teal-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    SSD1306 OLED Mirror (128×64)
                  </h3>
                </div>
                <span className="text-[11px] text-teal-400 font-mono">4 Hz Refresh</span>
              </div>

              <p className="text-xs text-slate-400 text-center max-w-sm">
                Mirrors the physical 0.96" OLED readout: Resp BPM (or NA), coughs, DS18B20 contact temp, experimental PPG summary, and SQI.
              </p>

              <div className="py-2">
                <OledPreview
                  packet={packet}
                  breathingRate={features.breathingRate}
                  coughCount={features.coughCount}
                  sqiStatus={features.signalQuality.status}
                  isConnected={bleState === 'connected'}
                />
              </div>

              <div className="w-full rounded-xl bg-slate-950 p-3 border border-slate-800 text-[11px] text-slate-400 text-center">
                Displays <code className="text-sky-300 font-mono">NA</code> whenever a sensor is disabled by compile flag or unresponsive at runtime.
              </div>
            </div>
          </div>

          {/* Raw AP2 Telemetry Inspector */}
          {packet && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Live AP2 Telemetry Channels (#{packet.sequence})</span>
                </h4>
                <span className="text-[11px] font-mono text-slate-400">
                  Flags: 0x{packet.flagsHex}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs font-mono tabular-nums">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">|A|-1g (Tilt-Free)</span>
                  <span className="text-teal-400 font-bold">
                    {(Math.sqrt(packet.ax * packet.ax + packet.ay * packet.ay + packet.az * packet.az) - 1.0).toFixed(3)} g
                  </span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">INMP441 RMS</span>
                  <span className="text-white font-bold">
                    {packet.sensorStatus.inmp441 === 'ok' ? packet.audioRms.toFixed(1) : 'NA'}
                  </span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Centroid Hz</span>
                  <span className="text-amber-300">
                    {packet.sensorStatus.inmp441 === 'ok' ? `${Math.round(packet.audioCentroidHz)} Hz` : 'NA'}
                  </span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">DS18B20 Temp</span>
                  <span className="text-sky-300 font-bold">
                    {packet.contactTempC !== null ? `${packet.contactTempC.toFixed(1)} °C` : 'NA'}
                  </span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">MAX30102 PPG*</span>
                  <span className="text-amber-300 font-bold">
                    {packet.heartRateBpm !== null
                      ? `${packet.heartRateBpm}/${packet.spo2Pct ?? '--'}%`
                      : 'NA'}
                  </span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Piezo GPIO34</span>
                  <span className={packet.piezo !== null ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                    {packet.piezo !== null ? packet.piezo : 'DISABLED'}
                  </span>
                </div>
              </div>

              {lastRawLine && (
                <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 text-[11px] font-mono text-slate-400 overflow-x-auto">
                  <span className="text-slate-500 block text-[10px] mb-1">Last Received Raw BLE AP2 Line:</span>
                  <code className="text-teal-300">{lastRawLine}</code>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: WIRING, SAFETY CHECKLISTS & FIRMWARE SKETCH */}
      {activeSubTab === 'schematics' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Master 30-Pin GPIO Pinout Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-bold text-white">ESP32 DevKit V1 (30-Pin) Pin Assignment</h3>
              </div>
              <span className="text-[11px] font-mono text-teal-400">3.3V Logic Only</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2 pr-3 font-semibold">Module</th>
                    <th className="py-2 pr-3 font-semibold">Module Pin</th>
                    <th className="py-2 pr-3 font-semibold">ESP32 GPIO</th>
                    <th className="py-2 pr-3 font-semibold">Bus</th>
                    <th className="py-2 font-semibold">Safety &amp; Wiring Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {WIRING_PINOUT_GUIDE.map((w, idx) => (
                    <tr key={idx} className="hover:bg-slate-950/40">
                      <td className="py-2.5 pr-3 font-bold text-slate-200">{w.component}</td>
                      <td className="py-2.5 pr-3 font-mono text-amber-300">{w.pin}</td>
                      <td className="py-2.5 pr-3 font-mono text-teal-300 font-bold whitespace-nowrap">{w.esp32Pin}</td>
                      <td className="py-2.5 pr-3 font-mono text-slate-400">{w.bus}</td>
                      <td className="py-2.5 text-slate-400">
                        {w.safetyFlag && (
                          <span className="block font-mono font-bold text-amber-300 text-[10px] mb-0.5">
                            {w.safetyFlag}
                          </span>
                        )}
                        <span>{w.notes}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Shared I2C Bus Connections */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3">
              Shared I2C Bus Devices (GPIO21 SDA / GPIO22 SCL)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-sans">
                    <th className="py-2 pr-3 font-semibold">Module</th>
                    <th className="py-2 pr-3 font-semibold">VCC</th>
                    <th className="py-2 pr-3 font-semibold">GND</th>
                    <th className="py-2 pr-3 font-semibold">SDA / SCL</th>
                    <th className="py-2 font-semibold">7-Bit Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {SHARED_I2C_CONNECTIONS.map((row, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 pr-3 font-sans font-bold text-white">{row.module}</td>
                      <td className="py-2.5 pr-3 text-slate-300">{row.vcc}</td>
                      <td className="py-2.5 pr-3 text-slate-400">{row.gnd}</td>
                      <td className="py-2.5 pr-3 text-teal-300">{row.sdaScl}</td>
                      <td className="py-2.5 text-amber-300">{row.addr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* GPIO Safety Reminders & Interactive 10-Step Bring-Up Checklist */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-rose-500/35 bg-rose-950/20 p-6 space-y-3">
              <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
                <ShieldAlert className="w-5 h-5" />
                <span>GPIO &amp; Power Safety Reminders</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
                {GPIO_SAFETY_REMINDERS.map((rule, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-sm font-bold text-white">Pre-Power Verification Checklist</span>
                <span className="text-[11px] font-mono text-teal-400 tabular-nums">
                  {Object.values(checkedSteps).filter(Boolean).length}/{VERIFICATION_CHECKLIST.length}
                </span>
              </div>
              <div className="space-y-2">
                {VERIFICATION_CHECKLIST.map((item, idx) => (
                  <label
                    key={idx}
                    className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer hover:text-white"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(checkedSteps[idx])}
                      onChange={() => toggleChecklistItem(idx)}
                      className="mt-0.5 accent-teal-500"
                    />
                    <span className={checkedSteps[idx] ? 'line-through text-slate-500' : ''}>{item}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* 10-Step Staged Bring-Up Order */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
            <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3">
              Recommended 10-Step Hardware Bring-Up Order
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {BUILD_AND_TEST_ORDER.map((s) => (
                <div key={s.step} className="rounded-xl bg-slate-950 border border-slate-800 p-3.5 space-y-1">
                  <div className="font-bold text-teal-300 font-mono">
                    STEP {s.step}: <span className="text-white font-sans">{s.title}</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">{s.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Firmware Audit Fixes (F-01 through F-08) */}
          <div className="rounded-2xl border border-teal-500/30 bg-slate-900 p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  Resolved AP2 Firmware Audit Fixes (F-01 to F-08)
                </h3>
                <p className="text-[11px] text-slate-400">
                  All 8 high/medium/low findings resolved in v2.1 sketch and mirrored in Web BLE &amp; SignalProcessor.
                </p>
              </div>
              <span className="font-mono text-[11px] text-emerald-300 font-bold whitespace-nowrap">
                Core v2.0.17 &amp; v3.x Ready
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {FIRMWARE_AUDIT_FIXES.map((fix) => (
                <div key={fix.id} className="rounded-xl bg-slate-950 border border-slate-800 p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 font-mono text-[11px]">
                    <span className="font-bold text-teal-300">
                      {fix.id} • {fix.area}
                    </span>
                    <span
                      className={`font-bold ${
                        fix.severity === 'HIGH'
                          ? 'text-rose-400'
                          : fix.severity === 'MEDIUM'
                          ? 'text-amber-300'
                          : 'text-sky-300'
                      }`}
                    >
                      {fix.severity}
                    </span>
                  </div>
                  <p className="text-slate-400">{fix.summary}</p>
                  <p className="text-emerald-300/90 leading-relaxed">{fix.resolution}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ESP32 Arduino Sketch Code */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-teal-400" />
                <div>
                  <h3 className="text-base font-bold text-white">AuraPhragm_ESP32.ino (v2.1 AP2)</h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    #define RGB_COMMON_ANODE 0 • #define ENABLE_PIEZO_ADC 0 • Core v2/v3 I2S Auto
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySketch}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition cursor-pointer whitespace-nowrap"
                >
                  {copiedSketch ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSketch ? 'Copied' : 'Copy Code'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSketch}
                  className="flex items-center gap-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 px-3 py-1.5 text-xs font-bold text-white transition cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download AuraPhragm_ESP32.ino</span>
                </button>
              </div>
            </div>

            <pre className="rounded-xl bg-slate-950 p-4 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-80 leading-relaxed">
              {ESP32_FIRMWARE_SKETCH}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
