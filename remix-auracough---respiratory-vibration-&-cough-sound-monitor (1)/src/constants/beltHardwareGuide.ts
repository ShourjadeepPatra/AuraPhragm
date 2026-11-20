/**
 * AuraPhragm Multi-Sensor Belt Construction & Inventory Reference
 * Matches the AuraPhragm Project Context & Component Pinout specifications.
 * Excludes DHT11, ADXL345, MLX90614, TP4056, MT3608, and mmWave radar.
 */

export interface BeltMaterialItem {
  category: 'Belt Fabric & Couplers' | 'Active Sensors' | 'Guard-Flagged / Postponed' | 'Controller & Display';
  item: string;
  specifications: string;
  statusNote: string;
  roleInBelt: string;
}

export const BELT_MATERIALS_LIST: BeltMaterialItem[] = [
  // Controller & Display
  {
    category: 'Controller & Display',
    item: 'ESP32 DevKit V1 (30-pin)',
    specifications: 'Dual-core 240 MHz, BLE 4.2, I2C + I2S + 1-Wire + ADC1',
    statusNote: 'USB-powered for initial bring-up',
    roleInBelt: 'Dual-rate acquisition (50 Hz control/IMU + 16 kHz I2S audio), OLED rendering, RGB status LED, and AP2 BLE telemetry.',
  },
  {
    category: 'Controller & Display',
    item: 'SSD1306 0.96" 128x64 OLED (4-pin I2C)',
    specifications: 'Address 0x3C, Shared I2C (GPIO21 SDA, GPIO22 SCL)',
    statusNote: 'Confirm 4-pin I2C & 3.3V support',
    roleInBelt: 'Displays live Resp BPM (or NA), cough events, contact temp, experimental PPG summary, SQI, and BLE/USB status.',
  },
  {
    category: 'Controller & Display',
    item: 'Common-Cathode RGB LED + 3x 330 Ohm Resistors',
    specifications: 'R=GPIO25, G=GPIO26, B=GPIO27 (individual resistor per channel)',
    statusNote: 'RGB_COMMON_ANODE 0 (GPIO HIGH = ON)',
    roleInBelt: 'Local visual state feedback: Startup cyan, Ready green, BLE teal/blue, Cough amber, Sensor fault red blink.',
  },

  // Active Sensors
  {
    category: 'Active Sensors',
    item: 'MPU6050 6-Axis Accelerometer & Gyroscope',
    specifications: 'Address 0x68 (AD0=0x69), Shared I2C (GPIO21/22), +/-2g',
    statusNote: 'Active chest-wall motion & resp proxy',
    roleInBelt: 'Tracks chest/belt expansion cycles (respiration proxy) and detects gross body-motion artifacts.',
  },
  {
    category: 'Active Sensors',
    item: 'INMP441 Digital I2S Microphone',
    specifications: 'SCK=GPIO14, WS=GPIO33, SD=GPIO32, L/R=GND, VDD=3V3, 16 kHz',
    statusNote: 'Active digital audio capture (not I2C)',
    roleInBelt: 'Captures true 16 kHz acoustic frames for RMS, ZCR, spectral centroid, and 3-band cough/breath energy.',
  },
  {
    category: 'Active Sensors',
    item: 'DS18B20 Waterproof Temperature Probe + 4.7 kOhm Pull-up',
    specifications: '1-Wire DATA=GPIO4, 3V3, GND; 4.7 kOhm DATA-to-3V3 pull-up',
    statusNote: 'Skin/contact temperature ONLY (not core temp)',
    roleInBelt: 'Replaces MLX90614. Requires 4.7 kOhm pull-up (200 kOhm inventory resistors do NOT substitute). Verify seller wire colours.',
  },
  {
    category: 'Active Sensors',
    item: 'MAX30102 Optical PPG Sensor',
    specifications: 'Address 0x57, Shared I2C (GPIO21/22), check VIN/3V3 breakout',
    statusNote: 'Experimental HR/SpO2 only',
    roleInBelt: 'Measures peripheral optical PPG; requires >50,000 IR contact threshold and calibration before clinical claims.',
  },

  // Guard-Flagged / Postponed
  {
    category: 'Guard-Flagged / Postponed',
    item: 'Piezoelectric Disc (Protected AFE Required)',
    specifications: 'Planned destination: GPIO34 (ADC1_CH6), 0-3.3V clamped AFE',
    statusNote: 'DISCONNECTED / ENABLE_PIEZO_ADC = 0',
    roleInBelt: 'Kept electrically isolated until a verified bias/clamp/filter circuit guarantees 0-3.3V safety (1M or 1N4007 alone is insufficient).',
  },
  {
    category: 'Guard-Flagged / Postponed',
    item: 'LM2596 Buck Converter, USB Female Socket & Battery',
    specifications: 'Postponed power subsystem',
    statusNote: 'POSTPONED — Keep disconnected from perfboard',
    roleInBelt: 'LM2596 steps down voltage only and cannot boost lower battery voltage to 5V. Use regulated USB for initial bring-up.',
  },

  // Belt Fabric & Couplers
  {
    category: 'Belt Fabric & Couplers',
    item: '50 mm Breathable Elastic Strap & Hook-and-Loop',
    specifications: '100-120 cm length, 50 mm width, adjustable thoracic fit',
    statusNote: 'Design proposal — verify comfort & cleanability',
    roleInBelt: 'Holds the diaphragm sensor pod comfortably around the lower ribs without restricting breathing.',
  },
  {
    category: 'Belt Fabric & Couplers',
    item: 'Silicone Diaphragm Puck & 3D-Printed Enclosure',
    specifications: 'PETG curved thoracic housing with OLED window & RGB diffuser',
    statusNote: 'Design proposal from wearable notes',
    roleInBelt: 'Protects perfboard wiring while exposing the OLED screen, RGB status LED, DS18B20 probe channel, and INMP441 acoustic port.',
  },
];

export const PHYSICAL_BUILD_STEPS = [
  {
    step: 1,
    title: 'Strap Sizing & Hook-and-Loop Closure',
    summary: '50 mm breathable elastic strap around lower ribs/diaphragm',
    details:
      'Cut 110 cm of 50 mm breathable elastic strap and stitch hook-and-loop closures on opposite ends so the belt fits snugly around the lower thoracic ribcage without impeding inhalation.',
    tip: 'Treat strap dimensions as ergonomic starting proposals; verify the patient can take a full deep breath comfortably.',
  },
  {
    step: 2,
    title: 'Perfboard Bus Layout & Continuity Verification',
    summary: 'Separate 3V3, GND, Shared I2C (21/22), and I2S (14/33/32)',
    details:
      'Mark 3V3, GND, SDA (GPIO21), SCL (GPIO22), DS18B20 (GPIO4 + 4.7 kOhm pull-up), INMP441 I2S (14/33/32), and RGB (25/26/27 + three 330 Ohm resistors). Test continuity for 3V3-to-GND shorts before powering via USB.',
    tip: 'Do NOT use GPIO6-11 (onboard flash) and keep LM2596/battery/USB female socket disconnected.',
  },
  {
    step: 3,
    title: 'Staged I2C Sensor Integration (OLED -> MPU6050 -> MAX30102)',
    summary: 'Bring up one I2C breakout at a time and verify addresses',
    details:
      'Confirm each module accepts 3.3V. Test OLED (0x3C) first, add rigid-mounted MPU6050 (0x68), then verify MAX30102 (0x57) breakout regulator/pull-ups before sharing GPIO21/22.',
    tip: 'Breakout boards often include onboard pull-up resistors; do not blindly stack multiple parallel external pull-up sets.',
  },
  {
    step: 4,
    title: 'DS18B20 Skin Probe & INMP441 Acoustic Port',
    summary: 'Verify wire colours, 4.7 kOhm pull-up, and clear microphone aperture',
    details:
      'Check DS18B20 seller pinout before wiring (never trust lead colour blindly) and fit a 4.7 kOhm pull-up between GPIO4 and 3V3. Mount INMP441 with L/R tied to GND and an unobstructed acoustic port.',
    tip: 'Note that INMP441 SCK (GPIO14) is an I2S bit clock and must never be wired to OLED SCL (GPIO22).',
  },
  {
    step: 5,
    title: 'Piezo Safety Isolation & Bench AFE Rule',
    summary: 'Keep GPIO34 disconnected until 0-3.3V clamp/bias/filter AFE is verified',
    details:
      'Leave the piezo disc disconnected from GPIO34 during initial firmware validation (#define ENABLE_PIEZO_ADC 0). Never solder directly to the piezo ceramic centre, and verify any future bias/clamp front-end on an oscilloscope before attaching to ADC1.',
    tip: 'Raw piezo impacts produce high positive/negative spikes that can damage non-5V-tolerant ESP32 pins.',
  },
  {
    step: 6,
    title: 'Enclosure Assembly & BLE AP2 Verification',
    summary: 'Seat electronics in wipeable PETG housing & test AP2 telemetry',
    details:
      'Mount the rigid MPU6050 inside the enclosure base, seat the SSD1306 OLED in the lid bezel, route the DS18B20 skin probe cleanly, power via USB, and pair with "AuraPhragm-Belt" in the companion web app.',
    tip: 'Disabled or disconnected sensors automatically display "Unavailable" / "NA" in both OLED and web UI rather than fabricated numbers.',
  },
];

export const OPENSCAD_ENCLOSURE_CODE = `// ==============================================================
// AuraPhragm Multi-Sensor Enclosure (OpenSCAD Design Proposal)
// Base Housing with 50mm Belt Slots, OLED Window, Acoustic & Probe Ports
// ==============================================================

box_l = 82;        // Length in mm
box_w = 50;        // Width in mm
box_h = 24;        // Height in mm
wall  = 2.2;       // Shell wall thickness
belt_slot_w = 52;  // Width for 50mm elastic strap
belt_slot_h = 3.8; // Thickness for webbing slot

module enclosure_base() {
    difference() {
        union() {
            rounded_cube(box_l, box_w, box_h, 4);
            translate([-16, 0, 0]) rounded_cube(18, box_w, 6, 2);
            translate([box_l - 2, 0, 0]) rounded_cube(18, box_w, 6, 2);
        }

        // Inner electronics cavity
        translate([wall, wall, wall])
            rounded_cube(box_l - 2*wall, box_w - 2*wall, box_h, 2);

        // Belt strap slots
        translate([-12, (box_w - belt_slot_w)/2, 1.2])
            cube([belt_slot_h, belt_slot_w, 8]);
        translate([box_l + 8, (box_w - belt_slot_w)/2, 1.2])
            cube([belt_slot_h, belt_slot_w, 8]);

        // ESP32 USB bring-up port cutout
        translate([box_l - 4, box_w/2 - 6, 5])
            cube([6, 12, 6.5]);

        // DS18B20 probe cable exit notch
        translate([-2, box_w/2 - 3, 5])
            cube([6, 6, 6]);

        // INMP441 acoustic port on front-lower wall
        translate([18, -1, 12])
            rotate([-90, 0, 0]) cylinder(r = 2.5, h = wall + 2, $fn = 24);
    }
}

module enclosure_lid() {
    difference() {
        rounded_cube(box_l, box_w, 3.5, 4);

        // SSD1306 0.96" OLED bezel window (26mm x 15mm)
        translate([box_l/2 - 13, box_w/2 - 7.5, -1])
            cube([26, 15, 6]);

        // RGB status LED aperture
        translate([12, box_w/2, -1])
            cylinder(r = 2.8, h = 6, $fn = 24);

        // Corner M2.5 mounting holes
        translate([4, 4, -1]) cylinder(r=1.3, h=6, $fn=16);
        translate([box_l-4, 4, -1]) cylinder(r=1.3, h=6, $fn=16);
        translate([4, box_w-4, -1]) cylinder(r=1.3, h=6, $fn=16);
        translate([box_l-4, box_w-4, -1]) cylinder(r=1.3, h=6, $fn=16);
    }
}

module rounded_cube(x, y, z, r) {
    hull() {
        translate([r, r, 0]) cylinder(r=r, h=z, $fn=24);
        translate([x-r, r, 0]) cylinder(r=r, h=z, $fn=24);
        translate([r, y-r, 0]) cylinder(r=r, h=z, $fn=24);
        translate([x-r, y-r, 0]) cylinder(r=r, h=z, $fn=24);
    }
}

enclosure_base();
translate([0, box_w + 15, 0]) enclosure_lid();
`;
