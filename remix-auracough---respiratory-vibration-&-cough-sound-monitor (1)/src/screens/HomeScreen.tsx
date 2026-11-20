import React from 'react';
import { SupportedLanguage } from '../config/appConfig';
import { TRANSLATIONS } from '../i18n/translations';
import {
  AnalysisResult,
  LocationPermissionStatus,
  NearbyHospital,
  PatientProfile,
  SensorPacket,
  SignalFeatures,
  UserCoordinates,
} from '../types';
import {
  Activity,
  Play,
  Radio,
  HeartPulse,
  Clock,
  ChevronRight,
  User,
  Cpu,
  MessageCircle,
  Download,
  Bluetooth,
  MapPin,
  Thermometer,
  Mic,
  ShieldAlert,
} from 'lucide-react';
import { NearbyHospitalsPanel } from '../components/NearbyHospitalsPanel';
import {
  generateReportPngBlob,
  getWhatsAppShareUrl,
  triggerBlobDownload,
} from '../services/reportGenerator';

interface Props {
  language: SupportedLanguage;
  currentPatient: PatientProfile;
  lastTest: AnalysisResult | null;
  currentPacket: SensorPacket | null;
  features: SignalFeatures;
  isBleConnected: boolean;
  locationStatus: LocationPermissionStatus;
  coords: UserCoordinates | null;
  hospitals: NearbyHospital[];
  hospitalsLoading: boolean;
  hospitalsError?: string | null;
  onRequestLocation: () => void;
  onRefreshHospitals: () => void;
  onRevokeLocation: () => void;
  onOpenSetupModal: () => void;
  onStartTest: () => void;
  onNavigate: (tab: string) => void;
  onOpenDisclaimer: () => void;
}

export const HomeScreen: React.FC<Props> = ({
  language,
  currentPatient,
  lastTest,
  currentPacket,
  features,
  isBleConnected,
  locationStatus,
  coords,
  hospitals,
  hospitalsLoading,
  hospitalsError,
  onRequestLocation,
  onRefreshHospitals,
  onRevokeLocation,
  onOpenSetupModal,
  onStartTest,
  onNavigate,
  onOpenDisclaimer,
}) => {
  const t = TRANSLATIONS[language];
  const sensorStatus = currentPacket?.sensorStatus || features.activeSensors;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Banner / Patient Card */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950/35 p-5 md:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-teal-500/10 p-3 text-teal-400 border border-teal-500/20">
            <User className="w-7 h-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-baseline gap-2.5">
              <h2 className="text-xl font-bold text-white tracking-tight font-display">
                {currentPatient.name}
              </h2>
              <span className="text-xs font-mono text-slate-400 tabular-nums">
                {currentPatient.age}y • {currentPatient.gender}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Village: <strong className="text-slate-200">{currentPatient.village}</strong> • ASHA ID:{' '}
              <strong className="text-slate-200 font-mono">{currentPatient.ashaWorkerId || 'ASHA-01'}</strong>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('settings')}
          className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer self-end md:self-auto whitespace-nowrap shrink-0"
        >
          <span>Switch Patient</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Quick Start 60-Second Test Hero Card */}
      <div className="relative overflow-hidden rounded-2xl border border-teal-500/30 bg-gradient-to-br from-teal-950/45 via-slate-900 to-slate-950 p-6 md:p-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-teal-400 block">
              Standard ASHA Screening Protocol • AP2 Multi-Sensor
            </span>
            <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight font-display">
              {t.startTest}
            </h3>
            <p className="text-sm text-slate-300 max-w-md leading-relaxed">
              Guided 60-second screening fusing MPU6050 chest-wall motion, INMP441 16 kHz cough acoustics, DS18B20 contact temperature, and experimental MAX30102 PPG.
            </p>
          </div>

          <button
            type="button"
            onClick={onStartTest}
            className="w-full sm:w-auto flex items-center justify-center gap-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black px-8 py-4 text-base shadow-xl shadow-teal-500/20 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shrink-0 whitespace-nowrap"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>{t.startTest}</span>
          </button>
        </div>
      </div>

      {/* Device & Location Permissions Quick Setup Strip */}
      <div className="rounded-xl border border-teal-500/25 bg-slate-900/90 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 text-slate-300">
          <span className="flex items-center gap-1.5">
            <Bluetooth className={`w-4 h-4 ${isBleConnected ? 'text-emerald-400' : 'text-amber-400'}`} />
            <strong>Belt:</strong> {isBleConnected ? 'Connected (AP2)' : 'Simulation Mode'}
          </span>
          <span className="text-slate-700">•</span>
          <span className="flex items-center gap-1.5">
            <MapPin className={`w-4 h-4 ${locationStatus === 'granted' ? 'text-emerald-400' : 'text-slate-400'}`} />
            <strong>Location:</strong>{' '}
            {locationStatus === 'granted'
              ? `${hospitals.length} hospitals loaded`
              : 'Optional (for nearby hospitals)'}
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenSetupModal}
          className="rounded-lg bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/40 text-teal-300 px-3.5 py-1.5 text-xs font-bold transition cursor-pointer shrink-0 self-start sm:self-auto whitespace-nowrap"
        >
          Configure Belt &amp; Location
        </button>
      </div>

      {/* Device & Live Sensor Quick Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Device Status */}
        <div
          onClick={() => onNavigate('device')}
          className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 shadow-md hover:border-slate-700 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Hardware Belt
            </span>
            <span
              className={`w-2 h-2 rounded-xs ${
                isBleConnected ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
          </div>
          <p className="mt-2 text-base font-bold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-teal-400 shrink-0" />
            <span>{isBleConnected ? 'AuraPhragm BLE' : 'Simulation Mode'}</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">
            {isBleConnected ? 'AP2 UART • USB Bring-Up' : 'Synthetic AP2 Dual-Rate'}
          </p>
        </div>

        {/* Live Breathing Rate */}
        <div
          onClick={() => onNavigate('live')}
          className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 shadow-md hover:border-slate-700 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              {t.breathingRate}
            </span>
            <HeartPulse className="w-4 h-4 text-teal-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-white font-mono tabular-nums">
            {features.breathingRate} <span className="text-xs font-normal text-slate-400">bpm</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1 font-mono tabular-nums">
            Depth: <strong className="text-slate-200">{features.breathDepth}</strong> • I:E{' '}
            <strong className="text-slate-200">{features.inspirationExpirationRatio}</strong>
          </p>
        </div>

        {/* Signal Quality */}
        <div
          onClick={() => onNavigate('live')}
          className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 shadow-md hover:border-slate-700 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              {t.signalQuality}
            </span>
            <Radio className="w-4 h-4 text-teal-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-white font-mono tabular-nums">
            {features.signalQuality.score}%{' '}
            <span
              className={`text-xs font-bold uppercase ${
                features.signalQuality.status === 'good'
                  ? 'text-emerald-400'
                  : features.signalQuality.status === 'fair'
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {features.signalQuality.status}
            </span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1 truncate">{features.signalQuality.advice}</p>
        </div>
      </div>

      {/* Multi-Sensor Node Readiness Strip */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono uppercase tracking-wider text-slate-400">
            AuraPhragm Multi-Sensor Readiness
          </span>
          <button
            type="button"
            onClick={() => onNavigate('live')}
            className="text-teal-400 hover:text-teal-300 font-semibold cursor-pointer"
          >
            Inspect Live Channels →
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] font-mono">
          <div className="rounded-lg bg-slate-950 border border-slate-800 p-2.5">
            <span className="text-slate-500 block">MPU6050 IMU</span>
            <span className={sensorStatus.mpu6050 === 'ok' ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
              {sensorStatus.mpu6050 === 'ok' ? 'ACTIVE (50 Hz)' : sensorStatus.mpu6050.toUpperCase()}
            </span>
          </div>

          <div className="rounded-lg bg-slate-950 border border-slate-800 p-2.5">
            <span className="text-slate-500 flex items-center gap-1">
              <Mic className="w-3 h-3 text-teal-400" />
              INMP441 I2S
            </span>
            <span className={sensorStatus.inmp441 === 'ok' ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
              {sensorStatus.inmp441 === 'ok' ? 'ACTIVE (16 kHz)' : 'UNAVAILABLE'}
            </span>
          </div>

          <div className="rounded-lg bg-slate-950 border border-slate-800 p-2.5">
            <span className="text-slate-500 flex items-center gap-1">
              <Thermometer className="w-3 h-3 text-sky-400" />
              DS18B20 Skin
            </span>
            <span className="text-sky-300 font-bold tabular-nums">
              {features.avgContactTempC !== null ? `${features.avgContactTempC.toFixed(1)} °C` : 'UNAVAILABLE'}
            </span>
          </div>

          <div className="rounded-lg bg-slate-950 border border-slate-800 p-2.5">
            <span className="text-slate-500 block">MAX30102 Exp.</span>
            <span className="text-amber-300 font-bold tabular-nums">
              {features.avgHeartRateBpm !== null
                ? `${features.avgHeartRateBpm} bpm / ${features.avgSpo2Pct ?? '--'}%*`
                : 'UNAVAILABLE'}
            </span>
          </div>

          <div className="rounded-lg bg-slate-950 border border-slate-800 p-2.5">
            <span className="text-slate-500 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-amber-400" />
              Piezo GPIO34
            </span>
            <span className={sensorStatus.piezo === 'ok' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
              {sensorStatus.piezo === 'ok' ? 'AFE ACTIVE' : 'ISOLATED (OFF)'}
            </span>
          </div>
        </div>
      </div>

      {/* Ambulance 108 & Nearby Hospitals Call Panel */}
      <NearbyHospitalsPanel
        language={language}
        locationStatus={locationStatus}
        coords={coords}
        hospitals={hospitals}
        hospitalsLoading={hospitalsLoading}
        hospitalsError={hospitalsError}
        onRequestLocation={onRequestLocation}
        onRefreshHospitals={onRefreshHospitals}
        onRevokeLocation={onRevokeLocation}
        compact
      />

      {/* Last Test Outcome Card */}
      {lastTest ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-400" />
              <h4 className="text-sm font-bold text-white">Latest Screening Result</h4>
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                {new Date(lastTest.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('result')}
              className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1 cursor-pointer"
            >
              <span>View Full Report</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div
            className={`rounded-xl p-4 text-center font-black text-lg md:text-xl tracking-tight shadow-lg ${
              lastTest.overallTriage === 'MEDICAL_HELP_NEEDED'
                ? 'bg-red-600 text-white shadow-red-950/60'
                : lastTest.overallTriage === 'MONITOR_RETEST'
                ? 'bg-amber-500 text-slate-950 shadow-amber-950/60'
                : 'bg-emerald-600 text-white shadow-emerald-950/60'
            }`}
          >
            {lastTest.overallTriage === 'MEDICAL_HELP_NEEDED'
              ? t.helpNeeded
              : lastTest.overallTriage === 'MONITOR_RETEST'
              ? t.monitorRetest
              : t.helpNotNeeded}
          </div>

          <p className="text-xs md:text-sm text-slate-300 leading-relaxed">{lastTest.plainExplanation}</p>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400">Classified:</span>
              <span className="rounded-md bg-slate-800 px-2 py-0.5 font-semibold text-teal-300">
                {lastTest.coughType}
              </span>
              <span className="text-slate-400">• Confidence:</span>
              <span className="font-mono text-slate-200 tabular-nums">{lastTest.confidence}%</span>
              <span className="text-slate-400">• Engine:</span>
              <span className="font-mono text-slate-300">{lastTest.engineUsed}</span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={getWhatsAppShareUrl(lastTest, currentPatient, language)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 px-3 py-1.5 text-[11px] font-black transition"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
              <button
                type="button"
                onClick={async () => {
                  const blob = await generateReportPngBlob(lastTest, currentPatient, language);
                  const dateSlug = new Date(lastTest.timestamp).toISOString().split('T')[0];
                  triggerBlobDownload(blob, `AuraPhragm_Report_${dateSlug}.png`);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-200 px-3 py-1.5 text-[11px] font-bold transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-teal-400" />
                <span>Download</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center text-slate-400">
          <Activity className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-300">No test completed yet for this session</p>
          <p className="text-xs text-slate-500 mt-1">
            Tap "Start 60s Test" above to record chest vibrations &amp; 16 kHz acoustics
          </p>
        </div>
      )}

      {/* Safety & Protocol Footer */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 text-center space-y-2">
        <p className="text-xs text-slate-400 leading-relaxed">{t.disclaimerText}</p>
        <button
          type="button"
          onClick={onOpenDisclaimer}
          className="text-xs font-semibold text-teal-400 hover:text-teal-300 underline cursor-pointer"
        >
          Review Clinical Protocol &amp; Safety Ethics
        </button>
      </div>
    </div>
  );
};
