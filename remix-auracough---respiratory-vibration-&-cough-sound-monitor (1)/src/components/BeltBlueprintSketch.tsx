import React, { useState } from 'react';
import { Layers, Compass, Info, CheckCircle2, Sliders, Activity, AlertTriangle } from 'lucide-react';

import explodedBlueprintImg from '../assets/images/belt_technical_blueprint_1793521579581.jpg';
import torsoPlacementImg from '../assets/images/belt_torso_placement_sketch_1793521595660.jpg';

interface BeltPartDetail {
  id: number;
  name: string;
  category: string;
  material: string;
  specs: string;
  tolerance: string;
  role: string;
  fabricationTip: string;
}

const BELT_PARTS: BeltPartDetail[] = [
  {
    id: 1,
    name: '50 mm Breathable Elastic Strap',
    category: 'Belt Fabric & Fasteners',
    material: 'Breathable polyester / elastane webbing',
    specs: '50 mm width x 1100 mm length, hook-and-loop ends',
    tolerance: 'Design proposal — adjust to thoracic comfort',
    role: 'Secures the AuraPhragm sensor pod gently around the lower ribs/diaphragm without restricting tidal breathing.',
    fabricationTip: 'Ensure belt is comfortable, does not compress respiration, and can be wiped clean between sessions.',
  },
  {
    id: 2,
    name: 'INMP441 I2S Digital Microphone',
    category: 'Acoustic Capture',
    material: 'MEMS I2S digital audio breakout (3.3V)',
    specs: 'SCK=GPIO14, WS=GPIO33, SD=GPIO32, L/R=GND, 16 kHz DMA',
    tolerance: 'Unobstructed acoustic aperture required',
    role: 'Captures true 16 kHz digital audio for cough RMS, spectral centroid, and 100-4000 Hz frequency bands.',
    fabricationTip: 'Keep INMP441 SCK (GPIO14) strictly separate from the OLED I2C SCL/SCK pin (GPIO22).',
  },
  {
    id: 3,
    name: 'Piezoelectric Disc (Guarded AFE Required)',
    category: 'Isolated Until Verified',
    material: 'Brass/ceramic piezoelectric transducer',
    specs: 'Planned destination GPIO34 (ADC1_CH6), currently ENABLE_PIEZO_ADC = 0',
    tolerance: '0–3.3 V clamp/bias/filter AFE required',
    role: 'Reserved for chest mechanical vibration once a safe analogue conditioning front-end is bench-tested.',
    fabricationTip: 'Do NOT connect raw piezo leads to GPIO34 or solder to the ceramic centre disc.',
  },
  {
    id: 4,
    name: 'DS18B20 Waterproof Temperature Probe',
    category: 'Contact Surface Thermal',
    material: 'Stainless-steel encapsulated 1-Wire probe',
    specs: 'DATA=GPIO4 + mandatory 4.7 kOhm pull-up to 3V3',
    tolerance: 'Skin/contact temperature only (not core temp)',
    role: 'Replaces MLX90614 to log contact skin surface temperature near the diaphragm belt.',
    fabricationTip: 'Verify seller wire colours before powering; 200 kOhm inventory resistors cannot substitute for 4.7 kOhm.',
  },
  {
    id: 5,
    name: 'MPU6050 6-Axis Motion IMU',
    category: 'Shared I2C Bus (0x68)',
    material: 'InvenSense MPU6050 breakout (confirm 3.3V)',
    specs: 'SDA=GPIO21, SCL=GPIO22, +/-2g @ 50 Hz',
    tolerance: 'Rigid internal mount required',
    role: 'Measures chest-wall expansion cycles as a respiration proxy and detects gross body-motion artifacts.',
    fabricationTip: 'Mount rigidly to the enclosure base so belt motion couples cleanly without rattle.',
  },
  {
    id: 6,
    name: 'PETG Curved Thoracic Enclosure (Proposal)',
    category: 'Enclosure Design Proposal',
    material: 'Wipeable PETG 3D-printed housing',
    specs: '82 x 50 x 24 mm enclosure proposal with 50 mm strap slots',
    tolerance: 'Design proposal — verify breakout clearances',
    role: 'Holds the ESP32 DevKit V1, shared I2C breakouts, OLED bezel, RGB diffuser, and probe cable notch.',
    fabricationTip: 'Print in PETG so the chassis withstands disinfectant wiping and warm ambient environments.',
  },
  {
    id: 7,
    name: 'SSD1306 0.96" I2C OLED Display',
    category: 'Shared I2C Bus (0x3C)',
    material: '128x64 monochrome I2C OLED (4-pin)',
    specs: 'SDA=GPIO21, SCL=GPIO22, confirm 3.3V support',
    tolerance: 'Refreshed at 4 Hz (250 ms)',
    role: 'Displays live Resp BPM (or NA), cough count, contact temp, experimental PPG summary, SQI, and USB/BLE status.',
    fabricationTip: 'Some breakouts label I2C SCL as SCK — confirm it connects to GPIO22, not INMP441 GPIO14.',
  },
  {
    id: 8,
    name: 'ESP32 DevKit V1 (30-Pin) · USB Bring-Up',
    category: 'Controller & Power',
    material: 'ESP32-WROOM-32 30-pin development board',
    specs: 'Powered via USB port for initial bring-up; 3.3V logic only',
    tolerance: 'Battery / LM2596 / female USB socket postponed',
    role: 'Runs dual-rate acquisition, I2C validation, OLED/RGB drivers, and AuraPhragm v2 (AP2) BLE notifications.',
    fabricationTip: 'Never feed 5V into any ESP32 GPIO pin and keep GPIO6-11 unconnected.',
  },
  {
    id: 9,
    name: 'MAX30102 Optical PPG Module (Experimental)',
    category: 'Shared I2C Bus (0x57)',
    material: 'Optical Red/IR PPG sensor breakout',
    specs: 'SDA=GPIO21, SCL=GPIO22; check breakout 3.3V vs VIN',
    tolerance: 'Experimental HR/SpO2 — requires IR > 50,000',
    role: 'Explores peripheral pulse/SpO2 optical sensing; requires calibration against reference oximeters.',
    fabricationTip: 'Confirm module pull-up voltage and supply tolerance before wiring onto the shared 3.3V I2C bus.',
  },
  {
    id: 10,
    name: 'Common-Cathode RGB Status LED',
    category: 'Local Status Indicator',
    material: '5 mm RGB LED + 3x 330 Ohm series resistors',
    specs: 'R=GPIO25, G=GPIO26, B=GPIO27, COM=GND (RGB_COMMON_ANODE 0)',
    tolerance: '1 individual resistor per channel',
    role: 'Signals Startup (cyan), Ready (green), BLE Active (teal/blue), Cough Alert (amber), and Fault (red blink).',
    fabricationTip: 'Never share a single cathode resistor across all three colour channels.',
  },
];

type BlueprintViewMode = 'exploded' | 'torso' | 'interactive_cad';

export const BeltBlueprintSketch: React.FC = () => {
  const [viewMode, setViewMode] = useState<BlueprintViewMode>('exploded');
  const [selectedPartId, setSelectedPartId] = useState<number>(5);
  const [showGridOverlay, setShowGridOverlay] = useState<boolean>(true);
  const [colorMode, setColorMode] = useState<'blueprint' | 'monochrome'>('blueprint');

  const selectedPart = BELT_PARTS.find((p) => p.id === selectedPartId) || BELT_PARTS[4];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 md:p-6 space-y-5">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-sky-300">
            <Compass className="w-3.5 h-3.5 text-sky-400" />
            <span>DWG: AP-BELT-2026-V2</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">MECHANICAL DESIGN PROPOSAL (NON-CERTIFIED)</span>
          </div>
          <h3 className="text-xl font-display font-bold text-white tracking-tight">
            Wearable Placement &amp; Enclosure Architecture
          </h3>
          <p className="text-xs text-slate-400 max-w-2xl">
            Reference mechanical proposals for lower-rib/diaphragm strap placement, multi-sensor stack layout, and safe USB-powered bring-up.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <button
            onClick={() => setViewMode('exploded')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              viewMode === 'exploded' ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Exploded View</span>
          </button>

          <button
            onClick={() => setViewMode('torso')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              viewMode === 'torso' ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Torso Placement</span>
          </button>

          <button
            onClick={() => setViewMode('interactive_cad')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              viewMode === 'interactive_cad' ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Sensor Stack CAD</span>
          </button>
        </div>
      </div>

      <div className="relative rounded-xl border border-slate-800 bg-[#071120] overflow-hidden">
        <div
          className={`absolute inset-0 pointer-events-none transition-opacity ${
            showGridOverlay ? 'opacity-25' : 'opacity-0'
          }`}
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(56, 189, 248, 0.25) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(56, 189, 248, 0.25) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950/90 border-b border-slate-800 text-xs font-mono">
          <span className="text-sky-300 font-semibold">
            {viewMode === 'exploded'
              ? 'FIG 1: EXPLODED ASSEMBLY PROPOSAL'
              : viewMode === 'torso'
              ? 'FIG 2: DIAPHRAGM PLACEMENT PROPOSAL'
              : 'FIG 3: AURAPHRAGM MULTI-SENSOR BUS ARCHITECTURE'}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGridOverlay(!showGridOverlay)}
              className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 text-[11px] font-semibold cursor-pointer"
            >
              Grid {showGridOverlay ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={() => setColorMode(colorMode === 'blueprint' ? 'monochrome' : 'blueprint')}
              className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-900 text-sky-300 text-[11px] font-semibold cursor-pointer"
            >
              {colorMode === 'blueprint' ? 'Blueprint' : 'Sepia'}
            </button>
          </div>
        </div>

        {viewMode === 'exploded' && (
          <div className="relative p-3 md:p-6 flex flex-col items-center">
            <div className="relative w-full max-w-4xl rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
              <img
                src={explodedBlueprintImg}
                alt="AuraPhragm Exploded Mechanical Proposal Drawing"
                referrerPolicy="no-referrer"
                className={`w-full h-auto object-contain transition-all duration-300 ${
                  colorMode === 'monochrome' ? 'filter sepia contrast-125' : ''
                }`}
              />
            </div>

            <div className="mt-4 w-full max-w-4xl">
              <span className="text-[11px] font-mono uppercase tracking-wider text-sky-300 font-bold block mb-2">
                Select Hardware Subsystem to Inspect Specs &amp; Safety Rules:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
                {BELT_PARTS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPartId(p.id)}
                    className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                      selectedPartId === p.id
                        ? 'border-sky-400 bg-sky-900/50 text-white font-bold'
                        : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-sky-400 mr-1">[{p.id}]</span>
                    <span className="text-[11px] line-clamp-1">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'torso' && (
          <div className="relative p-3 md:p-6 flex flex-col items-center">
            <div className="relative w-full max-w-4xl rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
              <img
                src={torsoPlacementImg}
                alt="AuraPhragm Lower-Rib Diaphragm Placement Sketch"
                referrerPolicy="no-referrer"
                className={`w-full h-auto object-contain transition-all duration-300 ${
                  colorMode === 'monochrome' ? 'filter sepia contrast-125' : ''
                }`}
              />
            </div>

            <div className="mt-4 w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="rounded-xl bg-slate-950 p-3.5 border border-slate-800 space-y-1">
                <span className="text-[11px] font-mono font-bold text-teal-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Lower-Rib / Diaphragm Fit
                </span>
                <p className="text-slate-300 leading-relaxed">
                  Position the pod along the lower costal margin so MPU6050 captures chest expansion without restricting full inhalation.
                </p>
              </div>
              <div className="rounded-xl bg-slate-950 p-3.5 border border-slate-800 space-y-1">
                <span className="text-[11px] font-mono font-bold text-sky-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  DS18B20 Skin Contact Only
                </span>
                <p className="text-slate-300 leading-relaxed">
                  Route the waterproof probe cleanly against skin surface; treat readings as peripheral skin/contact temperature, not core body fever.
                </p>
              </div>
              <div className="rounded-xl bg-slate-950 p-3.5 border border-slate-800 space-y-1">
                <span className="text-[11px] font-mono font-bold text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  USB-Only Bring-Up Rule
                </span>
                <p className="text-slate-300 leading-relaxed">
                  During initial testing, power ESP32 solely over USB and keep battery, LM2596, and piezo GPIO34 disconnected.
                </p>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'interactive_cad' && (
          <div className="p-4 md:p-6 space-y-4">
            <div className="w-full max-w-3xl mx-auto bg-[#061224] rounded-xl border border-slate-800 p-4 overflow-x-auto">
              <svg viewBox="0 0 800 360" className="w-full h-auto font-mono select-none" style={{ minWidth: '580px' }}>
                <rect x="240" y="30" width="320" height="50" rx="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" onClick={() => setSelectedPartId(7)} className="cursor-pointer" />
                <text x="400" y="59" fill="#38bdf8" fontSize="12" fontWeight="bold" textAnchor="middle">[7] SSD1306 128x64 OLED (I2C 0x3C)</text>

                <rect x="170" y="105" width="460" height="58" rx="6" fill="#1e293b" stroke="#2dd4bf" strokeWidth="1.5" onClick={() => setSelectedPartId(8)} className="cursor-pointer" />
                <text x="400" y="138" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle">[8] ESP32 DevKit V1 (30-Pin · USB Power Bring-Up)</text>

                <rect x="70" y="190" width="210" height="48" rx="6" fill="#064e3b" stroke="#34d399" strokeWidth="1.5" onClick={() => setSelectedPartId(5)} className="cursor-pointer" />
                <text x="175" y="218" fill="#ecfdf5" fontSize="11" fontWeight="bold" textAnchor="middle">[5] MPU6050 (0x68)</text>

                <rect x="295" y="190" width="210" height="48" rx="6" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="1.5" onClick={() => setSelectedPartId(2)} className="cursor-pointer" />
                <text x="400" y="218" fill="#f0f9ff" fontSize="11" fontWeight="bold" textAnchor="middle">[2] INMP441 I2S (14/33/32)</text>

                <rect x="520" y="190" width="210" height="48" rx="6" fill="#4c1d95" stroke="#a78bfa" strokeWidth="1.5" onClick={() => setSelectedPartId(9)} className="cursor-pointer" />
                <text x="625" y="218" fill="#f5f3ff" fontSize="11" fontWeight="bold" textAnchor="middle">[9] MAX30102* (0x57)</text>

                <rect x="70" y="265" width="210" height="48" rx="6" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="1.5" onClick={() => setSelectedPartId(4)} className="cursor-pointer" />
                <text x="175" y="293" fill="#eff6ff" fontSize="11" fontWeight="bold" textAnchor="middle">[4] DS18B20 (GPIO4+4.7k)</text>

                <rect x="295" y="265" width="210" height="48" rx="6" fill="#78350f" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5,3" onClick={() => setSelectedPartId(3)} className="cursor-pointer" />
                <text x="400" y="293" fill="#fef3c7" fontSize="11" fontWeight="bold" textAnchor="middle">[3] Piezo GPIO34 (ISOLATED)</text>

                <rect x="520" y="265" width="210" height="48" rx="6" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" onClick={() => setSelectedPartId(10)} className="cursor-pointer" />
                <text x="625" y="293" fill="#f8fafc" fontSize="11" fontWeight="bold" textAnchor="middle">[10] RGB LED (25/26/27)</text>
              </svg>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-sky-500 text-slate-950 font-bold font-mono text-sm">
              {selectedPart.id}
            </span>
            <div>
              <h4 className="text-base font-display font-bold text-white">{selectedPart.name}</h4>
              <span className="text-xs text-sky-400 font-mono">{selectedPart.category}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl bg-slate-950 p-3.5 border border-slate-800 space-y-1">
            <span className="text-slate-400 font-mono text-[10px] block uppercase">Material / Module</span>
            <span className="text-slate-200 font-semibold">{selectedPart.material}</span>
          </div>
          <div className="rounded-xl bg-slate-950 p-3.5 border border-slate-800 space-y-1">
            <span className="text-slate-400 font-mono text-[10px] block uppercase">Wiring &amp; Specs</span>
            <span className="text-sky-300 font-mono">{selectedPart.specs}</span>
          </div>
          <div className="rounded-xl bg-slate-950 p-3.5 border border-slate-800 space-y-1">
            <span className="text-slate-400 font-mono text-[10px] block uppercase">Operational Boundary</span>
            <span className="text-amber-300 font-mono">{selectedPart.tolerance}</span>
          </div>
        </div>

        <div className="rounded-xl bg-slate-950 p-3.5 border border-slate-800 space-y-1 text-xs">
          <span className="text-slate-400 font-mono text-[10px] block uppercase">System Role</span>
          <p className="text-slate-200 leading-relaxed">{selectedPart.role}</p>
        </div>

        <div className="rounded-xl bg-slate-950 p-3.5 border border-slate-800 text-sky-200 flex items-start gap-2.5 text-xs">
          <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-white">Bench Note:</strong> {selectedPart.fabricationTip}
          </p>
        </div>
      </div>
    </div>
  );
};
