import React, { useState, useEffect } from 'react';
import {
  Bluetooth,
  BluetoothConnected,
  MapPin,
  PhoneCall,
  CheckCircle2,
  X,
  ArrowRight,
  Cpu,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { SupportedLanguage } from '../config/appConfig';
import { BleConnectionState, LocationPermissionStatus } from '../types';

interface Props {
  isOpen: boolean;
  language: SupportedLanguage;
  bleState: BleConnectionState;
  bleStatusMsg: string;
  locationStatus: LocationPermissionStatus;
  onConnectBle: () => Promise<boolean>;
  onRequestLocation: () => Promise<void>;
  onSkipLocation: () => void;
  onClose: () => void;
}

export const DeviceLocationSetupModal: React.FC<Props> = ({
  isOpen,
  language,
  bleState,
  bleStatusMsg,
  locationStatus,
  onConnectBle,
  onRequestLocation,
  onSkipLocation,
  onClose,
}) => {
  const [step, setStep] = useState<'bluetooth' | 'location'>('bluetooth');
  const [isConnectingBle, setIsConnectingBle] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep(bleState === 'connected' ? 'location' : 'bluetooth');
    }
  }, [isOpen, bleState]);

  if (!isOpen) return null;

  const handleBluetoothConnect = async () => {
    setIsConnectingBle(true);
    try {
      await onConnectBle();
    } finally {
      setIsConnectingBle(false);
      // Automatically advance to Location Access immediately after Bluetooth step
      setStep('location');
    }
  };

  const handleLocationAllow = async () => {
    await onRequestLocation();
    onClose();
  };

  const copy =
    language === 'hi'
      ? {
          title: 'बेल्ट और नजदीकी अस्पताल सेटअप',
          step1: 'चरण 1: ब्लूटूथ बेल्ट कनेक्ट करें',
          step2: 'चरण 2: नजदीकी अस्पतालों के लिए लोकेशन अनुमति',
          bleDesc: 'यदि आपके पास ESP32 चेस्ट बेल्ट है तो अभी जोड़ें, या सिमुलेशन मोड में जारी रखें।',
          connectBle: 'ESP32 बेल्ट जोड़ें (Bluetooth)',
          useSim: 'सिमुलेशन मोड के साथ आगे बढ़ें',
          locDesc:
            '108 एम्बुलेंस के साथ-साथ नजदीकी अस्पतालों के नाम और सीधे कॉल बटन दिखाने के लिए लोकेशन अनुमति दें। आप इसे कभी भी बंद कर सकते हैं।',
          allowLoc: 'लोकेशन की अनुमति दें',
          skipLoc: 'अभी नहीं (केवल 108 एम्बुलेंस दिखाएं)',
        }
      : language === 'bn'
      ? {
          title: 'বেল্ট এবং নিকটবর্তী হাসপাতাল সেটআপ',
          step1: 'ধাপ ১: ব্লুটুথ বেল্ট সংযুক্ত করুন',
          step2: 'ধাপ ২: নিকটবর্তী হাসপাতালের জন্য লোকেশন অনুমতি',
          bleDesc: 'আপনার কাছে ESP32 বেল্ট থাকলে সংযুক্ত করুন, অথবা সিমুলেশন মোডে চালিয়ে যান।',
          connectBle: 'ESP32 বেল্ট সংযুক্ত করুন (Bluetooth)',
          useSim: 'সিমুলেশন মোডে এগিয়ে যান',
          locDesc:
            '১০৮ অ্যাম্বুলেন্সের পাশাপাশি নিকটবর্তী হাসপাতাল ও সরাসরি কল বোতাম দেখাতে লোকেশন অনুমতি দিন। আপনি যেকোনো সময় এটি বাতিল করতে পারেন।',
          allowLoc: 'লোকেশন অনুমতি দিন',
          skipLoc: 'এখন নয় (শুধু ১০৮ অ্যাম্বুলেন্স দেখান)',
        }
      : {
          title: 'Belt & Nearby Hospital Setup',
          step1: 'Step 1 of 2: Bluetooth Belt Access',
          step2: 'Step 2 of 2: Location Access for Nearby Hospitals',
          bleDesc:
            'Pair your physical ESP32 chest-wall sensor belt via Bluetooth now, or proceed in prototype Simulation Mode.',
          connectBle: 'Connect ESP32 Belt (Bluetooth)',
          useSim: 'Continue with Simulation Mode',
          locDesc:
            'Allow location access so AuraPhragm can list nearby hospitals with direct Call buttons alongside the 108 Ambulance number. You can revoke location access anytime.',
          allowLoc: 'Allow Location for Nearby Hospitals',
          skipLoc: 'Not Now (Keep 108 Ambulance Only)',
        };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-slate-100 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-teal-500/15 p-2 text-teal-400 border border-teal-500/30">
              {step === 'bluetooth' ? (
                <Bluetooth className="w-5 h-5" />
              ) : (
                <MapPin className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-display font-bold text-white">{copy.title}</h3>
              <p className="text-[11px] font-mono text-teal-400">
                {step === 'bluetooth' ? copy.step1 : copy.step2}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close setup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div
            className={`h-1 rounded-sm transition-all ${
              step === 'bluetooth' ? 'bg-teal-400' : 'bg-emerald-500'
            }`}
          />
          <div
            className={`h-1 rounded-sm transition-all ${
              step === 'location'
                ? 'bg-teal-400'
                : locationStatus === 'granted'
                ? 'bg-emerald-500'
                : 'bg-slate-800'
            }`}
          />
        </div>

        {/* STEP 1: BLUETOOTH */}
        {step === 'bluetooth' && (
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{copy.bleDesc}</p>

            {bleState === 'connected' && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3 text-xs text-emerald-200 flex items-center gap-2">
                <BluetoothConnected className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{bleStatusMsg || 'AuraPhragm-Belt Connected (AP2)'}</span>
              </div>
            )}

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={handleBluetoothConnect}
                disabled={isConnectingBle}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black py-3.5 text-sm shadow-lg shadow-teal-500/20 transition cursor-pointer disabled:opacity-60"
              >
                {isConnectingBle ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Bluetooth className="w-4 h-4" />
                )}
                <span>{isConnectingBle ? 'Requesting Bluetooth...' : copy.connectBle}</span>
              </button>

              <button
                type="button"
                onClick={() => setStep('location')}
                className="w-full flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-200 font-semibold py-3 text-xs transition cursor-pointer"
              >
                <Cpu className="w-4 h-4 text-amber-400" />
                <span>{copy.useSim}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: LOCATION ACCESS */}
        {step === 'location' && (
          <div className="space-y-4">
            {bleState === 'connected' && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-[11px] text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Bluetooth step completed. Ready for optional hospital location access.</span>
              </div>
            )}

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{copy.locDesc}</p>

            <div className="rounded-2xl bg-slate-950 p-3.5 border border-slate-800 space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2 text-rose-300 font-semibold">
                <PhoneCall className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>Includes one-tap hospital calling + 108 National Ambulance</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span>Coordinates are only used to look up nearby hospitals on demand.</span>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={handleLocationAllow}
                disabled={locationStatus === 'requesting'}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3.5 text-sm shadow-lg shadow-emerald-500/20 transition cursor-pointer disabled:opacity-60"
              >
                {locationStatus === 'requesting' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <MapPin className="w-4 h-4" />
                )}
                <span>
                  {locationStatus === 'requesting' ? 'Detecting Location...' : copy.allowLoc}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSkipLocation();
                  onClose();
                }}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-300 font-semibold py-2.5 text-xs transition cursor-pointer"
              >
                {copy.skipLoc}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
