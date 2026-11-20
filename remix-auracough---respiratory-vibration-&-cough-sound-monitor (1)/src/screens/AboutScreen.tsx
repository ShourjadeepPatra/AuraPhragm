import React, { useState } from 'react';
import { APP_CONFIG, SupportedLanguage } from '../config/appConfig';
import {
  ESP32_FIRMWARE_SKETCH,
  WIRING_PINOUT_GUIDE,
  GPIO_SAFETY_REMINDERS,
} from '../constants/esp32Firmware';
import { BELT_MATERIALS_LIST } from '../constants/beltHardwareGuide';
import {
  AlertTriangle,
  Download,
  Copy,
  Check,
  PhoneCall,
  Cpu,
  FileCode,
  Layers,
  ShieldAlert,
} from 'lucide-react';

interface Props {
  language: SupportedLanguage;
}

export const AboutScreen: React.FC<Props> = () => {
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopySketch = () => {
    navigator.clipboard.writeText(ESP32_FIRMWARE_SKETCH);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <span className="text-xs font-mono font-bold text-teal-400 uppercase tracking-wider">
          Safety, Scope &amp; Hardware Architecture
        </span>
        <h2 className="text-2xl font-black text-white tracking-tight mt-1 font-display">
          About AuraPhragm
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Student &amp; research multi-sensor diaphragm respiratory screening prototype built for ESP32 DevKit V1 (30-pin) + Protocol AP2.
        </p>
      </div>

      {/* Mandatory Safety & Ethics Declaration */}
      <div className="rounded-2xl border-2 border-rose-500/60 bg-rose-950/30 p-6 md:p-8 space-y-4 shadow-xl">
        <div className="flex items-center gap-3 text-rose-400 font-bold text-lg">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <span>MANDATORY CLINICAL &amp; SAFETY ETHICS DECLARATION</span>
        </div>

        <div className="rounded-xl bg-slate-950/90 p-4 border border-rose-900/60 text-sm text-slate-200 leading-relaxed font-medium">
          &quot;{APP_CONFIG.disclaimer}&quot;
        </div>

        <div className="space-y-2 text-xs md:text-sm text-slate-300 leading-relaxed">
          <p>
            • <strong>Non-Diagnostic Scope:</strong> AuraPhragm never declares that a patient has a clinical disease. All outputs describe probabilistic patterns and chest/acoustic observations.
          </p>
          <p>
            • <strong>Sensor Realism &amp; Guardrails:</strong> MAX30102 SpO₂/HR outputs are labelled <em>experimental</em> and uncalibrated; DS18B20 measures <em>skin/contact temperature only</em> (not core temperature); Piezo GPIO34 stays disabled (<code className="font-mono text-amber-300">ENABLE_PIEZO_ADC 0</code>) until a 0–3.3V clamp AFE is bench-verified.
          </p>
          <p>
            • <strong>Emergency Protocol:</strong> In cases of acute severe shortness of breath, cyanosis (blue lips/fingernails), or coughing up blood, immediately dial <strong>108 (India Emergency Ambulance Service)</strong>.
          </p>
          <p>
            • <strong>Optional Nearby Hospital Lookup:</strong> With your explicit, revocable location consent, AuraPhragm queries Google Maps Platform Places API (New) solely for nearby hospital contact details (never sending patient health records), subject to{' '}
            <a
              href="https://maps.google.com/help/terms_maps/?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-teal-300 hover:text-teal-200"
            >
              Google Maps End User Terms
            </a>{' '}
            and the{' '}
            <a
              href="https://policies.google.com/privacy?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-teal-300 hover:text-teal-200"
            >
              Google Privacy Policy
            </a>
            .
          </p>
        </div>

        <div className="pt-2">
          <a
            href={`tel:${APP_CONFIG.emergencyNumber}`}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-5 py-2.5 text-xs font-bold text-white shadow-md transition"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Emergency Dial: 108 Ambulance</span>
          </a>
        </div>
      </div>

      {/* Hardware Inventory */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-teal-400" />
            <h3 className="text-base font-bold text-white">AuraPhragm Component Inventory &amp; Status</h3>
          </div>
          <span className="text-xs font-mono text-teal-400">USB Bring-Up</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-4 font-semibold">Component</th>
                <th className="py-2 pr-4 font-semibold">Specs</th>
                <th className="py-2 pr-4 font-semibold">Status</th>
                <th className="py-2 font-semibold">System Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {BELT_MATERIALS_LIST.map((b, i) => (
                <tr key={i} className="hover:bg-slate-950/40">
                  <td className="py-2.5 pr-4 font-bold text-white">{b.item}</td>
                  <td className="py-2.5 pr-4 font-mono text-slate-300 text-[11px]">{b.specifications}</td>
                  <td
                    className={`py-2.5 pr-4 font-mono text-[11px] font-semibold ${
                      b.category === 'Guard-Flagged / Postponed' ? 'text-amber-300' : 'text-teal-300'
                    }`}
                  >
                    {b.statusNote}
                  </td>
                  <td className="py-2.5 text-slate-400">{b.roleInBelt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* GPIO Safety Reminders */}
      <div className="rounded-2xl border border-amber-500/35 bg-amber-950/20 p-6 space-y-3">
        <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
          <ShieldAlert className="w-5 h-5" />
          <span>Critical ESP32 DevKit V1 (30-Pin) Safety Constraints</span>
        </div>
        <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
          {GPIO_SAFETY_REMINDERS.map((r, i) => (
            <li key={i}>• {r}</li>
          ))}
        </ul>
      </div>

      {/* Wiring Pinout Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-teal-400" />
            <h3 className="text-base font-bold text-white">Master 30-Pin GPIO Pinout</h3>
          </div>
          <span className="text-[11px] font-mono text-teal-400">ESP32 DevKit V1</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-3 font-semibold">Module</th>
                <th className="py-2 pr-3 font-semibold">Module Pin</th>
                <th className="py-2 pr-3 font-semibold">ESP32 Pin</th>
                <th className="py-2 font-semibold">Wiring Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {WIRING_PINOUT_GUIDE.map((w, idx) => (
                <tr key={idx} className="hover:bg-slate-950/40">
                  <td className="py-2 pr-3 font-bold text-slate-200">{w.component}</td>
                  <td className="py-2 pr-3 font-mono text-amber-300">{w.pin}</td>
                  <td className="py-2 pr-3 font-mono text-teal-300 font-bold">{w.esp32Pin}</td>
                  <td className="py-2 text-slate-400">{w.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ESP32 Arduino Sketch Code Viewer & Downloader */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-teal-400" />
            <h3 className="text-base font-bold text-white">AuraPhragm_ESP32.ino Firmware</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySketch}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition cursor-pointer whitespace-nowrap"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
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

        <p className="text-xs text-slate-400">
          Open in Arduino IDE, select <strong>&quot;DOIT ESP32 DEVKIT V1&quot;</strong>, install Adafruit SSD1306 + GFX, OneWire + DallasTemperature, and SparkFun MAX3010x libraries, confirm sensor safety flags, and upload via USB.
        </p>

        <pre className="rounded-xl bg-slate-950 p-4 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-72 leading-relaxed">
          {ESP32_FIRMWARE_SKETCH}
        </pre>
      </div>
    </div>
  );
};
