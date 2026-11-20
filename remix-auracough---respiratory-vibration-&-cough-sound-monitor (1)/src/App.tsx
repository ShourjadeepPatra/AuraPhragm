import React, { useState, useEffect, useRef, useCallback } from 'react';
import { APP_CONFIG, SupportedLanguage } from './config/appConfig';
import { TRANSLATIONS } from './i18n/translations';
import {
  AnalysisResult,
  BleConnectionState,
  LocationPermissionStatus,
  NearbyHospital,
  PatientProfile,
  SensorPacket,
  SignalFeatures,
  SimulationConfig,
  UserCoordinates,
} from './types';
import {
  SensorSimulator,
  SCENARIO_METADATA,
  DEFAULT_SIMULATION_CONFIG,
} from './services/simulator';
import { SignalProcessor } from './services/signalProcessing';
import { bleService } from './services/bleService';
import { fetchNearbyHospitals, requestBrowserLocation } from './services/hospitalService';
import { getAllPatientProfiles, savePatientProfile, getAllTestResults } from './services/storage';

// Screens
import { HomeScreen } from './screens/HomeScreen';
import { LiveMonitorScreen } from './screens/LiveMonitorScreen';
import { TestFlowScreen } from './screens/TestFlowScreen';
import { ResultScreen } from './screens/ResultScreen';
import { SimulatorScreen } from './screens/SimulatorScreen';
import { CalibrationWizardScreen } from './screens/CalibrationWizardScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { ModelImprovementScreen } from './screens/ModelImprovementScreen';
import { AiAssistantScreen } from './screens/AiAssistantScreen';
import { DeviceScreen } from './screens/DeviceScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { AboutScreen } from './screens/AboutScreen';

// Components
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { DisclaimerModal } from './components/DisclaimerModal';
import { DeviceLocationSetupModal } from './components/DeviceLocationSetupModal';

import {
  HeartPulse,
  Activity,
  Play,
  FileText,
  Sliders,
  History,
  Sparkles,
  Cpu,
  Settings,
  HelpCircle,
  Globe,
  Radio,
  Menu,
  X,
  Stethoscope,
  Bot,
} from 'lucide-react';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<string>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Language
  const [language, setLanguage] = useState<SupportedLanguage>(() => {
    const saved = localStorage.getItem('auraphragm_lang') || localStorage.getItem('auracough_lang');
    return (saved as SupportedLanguage) || 'en';
  });

  // Patient Profile
  const [currentPatient, setCurrentPatient] = useState<PatientProfile>({
    id: 'p_default_01',
    name: 'Savitri Devi',
    age: 48,
    gender: 'Female',
    village: 'Rampur Block A',
    ashaWorkerId: 'ASHA-774',
    lastTestDate: new Date().toISOString(),
  });

  // Disclaimer Modal & Initial Bluetooth + Location Setup Modal
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [showDeviceLocationModal, setShowDeviceLocationModal] = useState(false);

  // Location & Nearby Hospitals State
  const [locationStatus, setLocationStatus] = useState<LocationPermissionStatus>('idle');
  const [userCoords, setUserCoords] = useState<UserCoordinates | null>(null);
  const [nearbyHospitals, setNearbyHospitals] = useState<NearbyHospital[]>([]);
  const [hospitalsLoading, setHospitalsLoading] = useState(false);
  const [hospitalsError, setHospitalsError] = useState<string | null>(null);
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);

  // Hardware vs Simulation State
  const [isSimulated, setIsSimulated] = useState<boolean>(true);
  const [simConfig, setSimConfig] = useState<SimulationConfig>(DEFAULT_SIMULATION_CONFIG);

  const [bleState, setBleState] = useState<BleConnectionState>('disconnected');
  const [bleStatusMsg, setBleStatusMsg] = useState<string>('');

  // Live Stream & Processor
  const [currentPacket, setCurrentPacket] = useState<SensorPacket | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [lastTestResult, setLastTestResult] = useState<AnalysisResult | null>(null);

  const simulatorRef = useRef<SensorSimulator>(new SensorSimulator(simConfig));
  const processorRef = useRef<SignalProcessor>(new SignalProcessor(50));

  const [features, setFeatures] = useState<SignalFeatures>(() =>
    processorRef.current.calculateFeatures()
  );

  // Listen for Google Maps Platform Demo Key quota exceeded events
  useEffect(() => {
    const handleQuotaExceeded = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
  }, []);

  const loadHospitalsForCoords = useCallback(
    async (coordsToUse: UserCoordinates) => {
      setHospitalsLoading(true);
      setHospitalsError(null);
      const res = await fetchNearbyHospitals(coordsToUse, language);
      setNearbyHospitals(res.hospitals);
      if (res.error) {
        setHospitalsError(res.error);
      }
      setHospitalsLoading(false);
    },
    [language]
  );

  const handleRequestLocation = useCallback(async () => {
    setLocationStatus('requesting');
    setHospitalsError(null);
    const geo = await requestBrowserLocation();
    if (geo.coords) {
      setUserCoords(geo.coords);
      setLocationStatus('granted');
      localStorage.setItem('auraphragm_location_consent', 'granted');
      await loadHospitalsForCoords(geo.coords);
    } else {
      setLocationStatus(geo.errorType === 'denied' ? 'denied' : 'unavailable');
      setHospitalsError(geo.message || 'Location access was not granted.');
    }
  }, [loadHospitalsForCoords]);

  const handleRefreshHospitals = useCallback(async () => {
    if (userCoords) {
      await loadHospitalsForCoords(userCoords);
    } else {
      await handleRequestLocation();
    }
  }, [userCoords, loadHospitalsForCoords, handleRequestLocation]);

  const handleRevokeLocation = useCallback(() => {
    localStorage.removeItem('auraphragm_location_consent');
    localStorage.removeItem('auracough_location_consent');
    setLocationStatus('idle');
    setUserCoords(null);
    setNearbyHospitals([]);
    setHospitalsError(null);
  }, []);

  // Re-fetch location automatically on startup only if user explicitly consented previously
  useEffect(() => {
    const priorConsent =
      localStorage.getItem('auraphragm_location_consent') ||
      localStorage.getItem('auracough_location_consent');
    const disclaimerAccepted =
      localStorage.getItem('auraphragm_disclaimer_accepted') ||
      localStorage.getItem('auracough_disclaimer_accepted');
    const setupCompleted =
      localStorage.getItem('auraphragm_setup_completed') ||
      localStorage.getItem('auracough_setup_completed');

    if (priorConsent === 'granted') {
      handleRequestLocation();
    } else if (disclaimerAccepted === 'true' && setupCompleted !== 'true') {
      setShowDeviceLocationModal(true);
    }
  }, []);

  // Change language and save
  const handleChangeLanguage = (lang: SupportedLanguage) => {
    setLanguage(lang);
    localStorage.setItem('auraphragm_lang', lang);
  };

  // Init default patient profiles
  useEffect(() => {
    const initPatients = async () => {
      const existing = await getAllPatientProfiles();
      if (existing.length === 0) {
        await savePatientProfile(currentPatient);
      } else {
        setCurrentPatient(existing[0]);
      }
      const existingTests = await getAllTestResults();
      if (existingTests.length > 0) {
        setLastTestResult(existingTests[0]);
      }
    };
    initPatients();
  }, []);

  // Update simulator when config changes
  useEffect(() => {
    simulatorRef.current.setConfig(simConfig);
  }, [simConfig]);

  const handleIncomingPacket = useCallback((packet: SensorPacket) => {
    const filtered = processorRef.current.processPacket(packet);
    packet.breathingWave = filtered.breathingWave;
    packet.piezoFiltered = filtered.piezoFiltered;
    setCurrentPacket(packet);
  }, []);

  // Bluetooth callbacks
  useEffect(() => {
    bleService.setCallbacks(
      (packet: SensorPacket) => {
        if (!isPaused) {
          handleIncomingPacket(packet);
        }
      },
      (state: BleConnectionState, msg?: string) => {
        setBleState(state);
        setBleStatusMsg(msg || '');
        if (state === 'connected') {
          setIsSimulated(false);
        } else if (state === 'disconnected') {
          setIsSimulated(true);
        }
      }
    );
  }, [isPaused, handleIncomingPacket]);

  // Main 50 Hz streaming loop (runs simulation if BLE not connected)
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPaused) return;

      if (isSimulated || bleState !== 'connected') {
        const pkt = simulatorRef.current.generateSample(Date.now());
        handleIncomingPacket(pkt);
      }
    }, 20); // 20ms = 50 Hz

    return () => clearInterval(interval);
  }, [isSimulated, bleState, isPaused, handleIncomingPacket]);

  // Feature update throttled timer (updates telemetry every 250ms)
  useEffect(() => {
    const featTimer = setInterval(() => {
      setFeatures(processorRef.current.calculateFeatures());
    }, 250);
    return () => clearInterval(featTimer);
  }, []);

  const handleStartTest = () => {
    processorRef.current.reset();
    setActiveTab('test');
    setMobileMenuOpen(false);
  };

  const handleFinishTest = (result: AnalysisResult) => {
    setLastTestResult(result);
    setActiveTab('result');
  };

  const t = TRANSLATIONS[language];

  // Navigation Items
  const navTabs = [
    { id: 'home', label: t.tabHome, icon: HeartPulse },
    { id: 'live', label: t.tabLive, icon: Activity },
    { id: 'test', label: t.tabTest, icon: Play },
    { id: 'result', label: t.tabResult, icon: FileText, disabled: !lastTestResult },
    { id: 'simulator', label: t.tabSimulator, icon: Sliders },
    { id: 'calibration', label: t.tabCalibration, icon: Radio },
    { id: 'history', label: t.tabHistory, icon: History },
    { id: 'model', label: t.tabModel, icon: Sparkles },
    { id: 'ai', label: t.tabAi, icon: Bot },
    { id: 'device', label: t.tabDevice, icon: Cpu },
    { id: 'settings', label: t.tabSettings, icon: Settings },
    { id: 'about', label: t.tabAbout, icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-slate-950">
      {/* Google Maps Platform Demo Key Quota Warning Banner */}
      {gmpQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Offline Toast */}
      <OfflineIndicator />

      {/* Mandatory First-Launch Disclaimer Modal */}
      <DisclaimerModal
        language={language}
        forceOpen={showDisclaimerModal}
        onClose={() => {
          setShowDisclaimerModal(false);
          const setupDone =
            localStorage.getItem('auraphragm_setup_completed') ||
            localStorage.getItem('auracough_setup_completed');
          if (setupDone !== 'true') {
            setShowDeviceLocationModal(true);
          }
        }}
      />

      {/* Sequential Bluetooth -> Location Setup Modal */}
      <DeviceLocationSetupModal
        isOpen={showDeviceLocationModal}
        language={language}
        bleState={bleState}
        bleStatusMsg={bleStatusMsg}
        locationStatus={locationStatus}
        onConnectBle={() => bleService.connect()}
        onRequestLocation={async () => {
          localStorage.setItem('auraphragm_setup_completed', 'true');
          await handleRequestLocation();
        }}
        onSkipLocation={() => {
          localStorage.setItem('auraphragm_setup_completed', 'true');
        }}
        onClose={() => {
          localStorage.setItem('auraphragm_setup_completed', 'true');
          setShowDeviceLocationModal(false);
        }}
      />

      {/* Top Main App Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#07090e]/90 backdrop-blur-md px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Brand Logo & Name */}
          <div
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2.5 cursor-pointer select-none group min-w-0"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-teal-500 to-sky-400 flex items-center justify-center text-slate-950 shadow-md shadow-teal-500/20 group-hover:scale-105 transition shrink-0">
              <Stethoscope className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-base font-extrabold tracking-tight text-white font-display">
                  {APP_CONFIG.name}
                </span>
                <span className="text-[10px] font-mono text-teal-400 uppercase tracking-wider whitespace-nowrap">
                  {APP_CONFIG.version}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block truncate max-w-sm">
                {t.tagline}
              </p>
            </div>
          </div>

          {/* Quick Header Indicators & Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Stream source status */}
            <button
              type="button"
              onClick={() => setActiveTab('device')}
              className={`hidden sm:flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-mono border transition cursor-pointer whitespace-nowrap shrink-0 ${
                isSimulated
                  ? 'border-amber-500/35 bg-amber-950/30 text-amber-300 hover:bg-amber-900/40'
                  : 'border-emerald-500/35 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/40'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-xs ${
                  isSimulated ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
              />
              <span>{isSimulated ? 'SIMULATOR AP2' : 'ESP32 BLE AP2'}</span>
            </button>

            {/* Language Switch Dropdown */}
            <div className="relative">
              <select
                value={language}
                onChange={(e) => handleChangeLanguage(e.target.value as SupportedLanguage)}
                className="appearance-none rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-slate-700 pr-7 focus:outline-hidden cursor-pointer"
              >
                <option value="en">EN</option>
                <option value="hi">हिन्दी</option>
                <option value="bn">বাংলা</option>
              </select>
              <Globe className="absolute right-2 top-2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* PWA Install Button */}
            <PWAInstallButton />

            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-300 hover:text-white"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Desktop Horizontal Navigation Ribbon */}
        <nav className="hidden lg:flex items-center gap-1 max-w-7xl mx-auto mt-2.5 pt-2 border-t border-slate-900 overflow-x-auto text-xs">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                disabled={tab.disabled}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-teal-500 text-slate-950 font-bold'
                    : tab.disabled
                    ? 'text-slate-600 opacity-40 cursor-not-allowed'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 animate-in fade-in text-xs">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  disabled={tab.disabled}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 p-2.5 rounded-lg font-semibold text-left transition cursor-pointer ${
                    isActive
                      ? 'bg-teal-500 text-slate-950 font-bold'
                      : tab.disabled
                      ? 'text-slate-600 opacity-40 cursor-not-allowed'
                      : 'bg-slate-900/60 text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Screen Content Body */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">
        {activeTab === 'home' && (
          <HomeScreen
            language={language}
            currentPatient={currentPatient}
            lastTest={lastTestResult}
            currentPacket={currentPacket}
            features={features}
            isBleConnected={bleState === 'connected'}
            locationStatus={locationStatus}
            coords={userCoords}
            hospitals={nearbyHospitals}
            hospitalsLoading={hospitalsLoading}
            hospitalsError={hospitalsError}
            onRequestLocation={handleRequestLocation}
            onRefreshHospitals={handleRefreshHospitals}
            onRevokeLocation={handleRevokeLocation}
            onOpenSetupModal={() => setShowDeviceLocationModal(true)}
            onStartTest={handleStartTest}
            onNavigate={(tTab) => setActiveTab(tTab)}
            onOpenDisclaimer={() => setShowDisclaimerModal(true)}
          />
        )}

        {activeTab === 'live' && (
          <LiveMonitorScreen
            language={language}
            packet={currentPacket}
            features={features}
            isPaused={isPaused}
            onTogglePause={() => setIsPaused(!isPaused)}
            onStartTest={handleStartTest}
            onNavigate={(tTab) => setActiveTab(tTab)}
          />
        )}

        {activeTab === 'test' && (
          <TestFlowScreen
            language={language}
            currentPatient={currentPatient}
            packet={currentPacket}
            features={features}
            isSimulated={isSimulated}
            groundTruthLabel={isSimulated ? SCENARIO_METADATA[simConfig.scenario].groundTruthDiagnosis : undefined}
            hospitals={nearbyHospitals}
            locationStatus={locationStatus}
            onRequestLocation={handleRequestLocation}
            onFinishTest={handleFinishTest}
            onCancel={() => setActiveTab('home')}
          />
        )}

        {activeTab === 'result' && lastTestResult && (
          <ResultScreen
            language={language}
            result={lastTestResult}
            patient={currentPatient}
            locationStatus={locationStatus}
            coords={userCoords}
            hospitals={nearbyHospitals}
            hospitalsLoading={hospitalsLoading}
            hospitalsError={hospitalsError}
            onRequestLocation={handleRequestLocation}
            onRefreshHospitals={handleRefreshHospitals}
            onRevokeLocation={handleRevokeLocation}
            onRetest={handleStartTest}
            onNavigate={(tTab) => setActiveTab(tTab)}
          />
        )}

        {activeTab === 'simulator' && (
          <SimulatorScreen
            language={language}
            config={simConfig}
            onChangeConfig={(cfg) => setSimConfig({ ...simConfig, ...cfg })}
            packet={currentPacket}
            features={features}
            onStartTestWithScenario={handleStartTest}
          />
        )}

        {activeTab === 'calibration' && (
          <CalibrationWizardScreen
            language={language}
            currentPatient={currentPatient}
            packet={currentPacket}
            onCalibrationSaved={() => setActiveTab('home')}
          />
        )}

        {activeTab === 'history' && (
          <HistoryScreen
            language={language}
            onSelectResult={(res) => {
              setLastTestResult(res);
              setActiveTab('result');
            }}
          />
        )}

        {activeTab === 'model' && <ModelImprovementScreen language={language} />}

        {activeTab === 'ai' && (
          <AiAssistantScreen
            language={language}
            currentPatient={currentPatient}
            packet={currentPacket}
            features={features}
            lastTestResult={lastTestResult}
            bleState={bleState}
            isSimulated={isSimulated}
            onNavigate={(tTab) => setActiveTab(tTab)}
          />
        )}

        {activeTab === 'device' && (
          <DeviceScreen
            language={language}
            packet={currentPacket}
            features={features}
            bleState={bleState}
            bleStatusMsg={bleStatusMsg}
            isSimulated={isSimulated}
            locationStatus={locationStatus}
            onRequestLocation={handleRequestLocation}
            onToggleSimulation={() => setIsSimulated(!isSimulated)}
            onNavigate={(tTab) => setActiveTab(tTab)}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsScreen
            language={language}
            onChangeLanguage={handleChangeLanguage}
            currentPatient={currentPatient}
            onSelectPatient={(p) => setCurrentPatient(p)}
            onOpenDisclaimer={() => setShowDisclaimerModal(true)}
          />
        )}

        {activeTab === 'about' && <AboutScreen language={language} />}
      </main>

      {/* Mobile Sticky Quick Navigation Bottom Bar */}
      <footer className="lg:hidden sticky bottom-0 z-30 border-t border-slate-800 bg-[#07090e]/95 backdrop-blur-md px-3 py-2 flex items-center justify-around text-[10px] font-bold text-slate-400">
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-0.5 ${activeTab === 'home' ? 'text-teal-400' : ''}`}
        >
          <HeartPulse className="w-5 h-5" />
          <span>Home</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('live')}
          className={`flex flex-col items-center gap-0.5 ${activeTab === 'live' ? 'text-teal-400' : ''}`}
        >
          <Activity className="w-5 h-5" />
          <span>Live</span>
        </button>

        <button
          type="button"
          onClick={handleStartTest}
          className="flex flex-col items-center gap-0.5 bg-teal-500 text-slate-950 px-3.5 py-1.5 rounded-xl shadow-md shadow-teal-500/20"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Test</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('simulator')}
          className={`flex flex-col items-center gap-0.5 ${activeTab === 'simulator' ? 'text-teal-400' : ''}`}
        >
          <Sliders className="w-5 h-5" />
          <span>Sim</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('device')}
          className={`flex flex-col items-center gap-0.5 ${activeTab === 'device' ? 'text-teal-400' : ''}`}
        >
          <Cpu className="w-5 h-5" />
          <span>Hardware</span>
        </button>
      </footer>
    </div>
  );
}
