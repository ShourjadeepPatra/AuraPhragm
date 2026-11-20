import React from 'react';
import {
  PhoneCall,
  MapPin,
  Hospital,
  ExternalLink,
  RefreshCw,
  ShieldOff,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { APP_CONFIG, SupportedLanguage } from '../config/appConfig';
import { TRANSLATIONS } from '../i18n/translations';
import { LocationPermissionStatus, NearbyHospital, UserCoordinates } from '../types';

interface Props {
  language: SupportedLanguage;
  locationStatus: LocationPermissionStatus;
  coords: UserCoordinates | null;
  hospitals: NearbyHospital[];
  hospitalsLoading: boolean;
  hospitalsError?: string | null;
  onRequestLocation: () => void;
  onRefreshHospitals: () => void;
  onRevokeLocation: () => void;
  compact?: boolean;
}

export const NearbyHospitalsPanel: React.FC<Props> = ({
  language,
  locationStatus,
  coords,
  hospitals,
  hospitalsLoading,
  hospitalsError,
  onRequestLocation,
  onRefreshHospitals,
  onRevokeLocation,
  compact = false,
}) => {
  const t = TRANSLATIONS[language];

  const labels =
    language === 'hi'
      ? {
          title: 'आपातकालीन सहायता और नजदीकी अस्पताल',
          allowBtn: 'नजदीकी अस्पताल देखने के लिए लोकेशन अनुमति दें',
          callHospital: 'कॉल करें',
          noPhone: 'फ़ोन नंबर उपलब्ध नहीं',
          openNow: 'खुला है',
          closed: 'बंद',
          mapLink: 'मैप्स में देखें',
          empty: 'इस क्षेत्र में कोई अस्पताल नहीं मिला। कृपया 108 पर कॉल करें।',
          revoke: 'लोकेशन हटाएं',
        }
      : language === 'bn'
      ? {
          title: 'জরুরি সাহায্য ও নিকটবর্তী হাসপাতাল',
          allowBtn: 'নিকটবর্তী হাসপাতাল দেখতে লোকেশন অনুমতি দিন',
          callHospital: 'কল করুন',
          noPhone: 'ফোন নম্বর নেই',
          openNow: 'খোলা আছে',
          closed: 'বন্ধ',
          mapLink: 'ম্যাপে দেখুন',
          empty: 'আশেপাশে কোনো হাসপাতাল পাওয়া যায়নি। ১০৮ এ কল করুন।',
          revoke: 'লোকেশন সরান',
        }
      : {
          title: 'Ambulance & Nearby Hospitals',
          allowBtn: 'Allow Location to Show Nearby Hospitals',
          callBtn: 'Call',
          callHospital: 'Call',
          noPhone: 'Phone number not listed',
          openNow: 'Open Now',
          closed: 'Closed',
          mapLink: 'Maps',
          empty: 'No hospitals found within 50 km. Please dial 108 Ambulance immediately if urgent.',
          revoke: 'Revoke Location',
        };

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl space-y-4">
      {/* Header + Primary 108 Ambulance Call CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl bg-rose-500/15 p-2 border border-rose-500/30 text-rose-400">
            <Hospital className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">{labels.title}</h3>
            <p className="text-[11px] text-slate-400">
              {locationStatus === 'granted' && coords
                ? `GPS ready (${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)}) • Powered by Google Maps`
                : 'Enable location to call nearby hospitals directly or call 108 Ambulance'}
            </p>
          </div>
        </div>

        <a
          href={`tel:${APP_CONFIG.emergencyNumber}`}
          className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-rose-950/50 transition active:scale-95 shrink-0"
        >
          <PhoneCall className="w-4 h-4" />
          <span>{t.callAmbulance}</span>
        </a>
      </div>

      {/* Case 1: Location not granted yet */}
      {locationStatus !== 'granted' && (
        <div className="rounded-2xl border border-teal-500/30 bg-slate-950 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs text-slate-300">
            <MapPin className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">
                {locationStatus === 'denied'
                  ? 'Location permission was denied'
                  : 'Find nearby hospitals with direct Call buttons'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {hospitalsError ||
                  'Allow browser location access to retrieve nearby hospitals, distance, and verified hospital phone numbers.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRequestLocation}
            disabled={locationStatus === 'requesting'}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 px-4 py-2 text-xs font-black transition cursor-pointer shrink-0 disabled:opacity-60"
          >
            {locationStatus === 'requesting' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <MapPin className="w-3.5 h-3.5" />
            )}
            <span>{locationStatus === 'requesting' ? 'Locating...' : labels.allowBtn}</span>
          </button>
        </div>
      )}

      {/* Case 2: Location granted -> Show Nearby Hospitals with Call Buttons */}
      {locationStatus === 'granted' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
            <span className="font-mono">
              Showing {compact ? Math.min(3, hospitals.length) : hospitals.length} nearest hospitals
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onRefreshHospitals}
                disabled={hospitalsLoading}
                className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-950 hover:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-300 transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${hospitalsLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                type="button"
                onClick={onRevokeLocation}
                className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 hover:bg-rose-950/40 px-2.5 py-1 text-[11px] font-semibold text-slate-400 hover:text-rose-300 transition cursor-pointer"
              >
                <ShieldOff className="w-3 h-3" />
                <span>{labels.revoke}</span>
              </button>
            </div>
          </div>

          {hospitalsLoading ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 flex items-center justify-center gap-2.5 text-xs text-slate-300">
              <Loader2 className="w-4 h-4 text-teal-400 animate-spin" />
              <span>Searching nearby hospitals around your location...</span>
            </div>
          ) : hospitalsError ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-3.5 flex items-start gap-2.5 text-xs text-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{hospitalsError}</span>
            </div>
          ) : hospitals.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-400">
              {labels.empty}
            </div>
          ) : (
            <div className="space-y-2.5">
              {(compact ? hospitals.slice(0, 3) : hospitals.slice(0, 6)).map((h) => (
                <div
                  key={h.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate max-w-xs sm:max-w-sm">
                        {h.name}
                      </h4>
                      <span className="text-[11px] font-mono tabular-nums text-teal-400">
                        {h.distanceKm} km
                      </span>
                      {typeof h.openNow === 'boolean' && (
                        <span className={`text-[11px] font-mono ${h.openNow ? 'text-emerald-400' : 'text-slate-400'}`}>
                          · {h.openNow ? labels.openNow : labels.closed}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{h.address}</p>
                    <p className="text-[11px] font-mono tabular-nums text-slate-300">
                      {h.phone ? h.phone : labels.noPhone}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {h.telHref ? (
                      <a
                        href={h.telHref}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-black text-white shadow-sm transition active:scale-95"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>{labels.callHospital}</span>
                      </a>
                    ) : (
                      <span className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[11px] font-semibold text-slate-500">
                        No Phone
                      </span>
                    )}

                    {h.googleMapsUri && (
                      <a
                        href={h.googleMapsUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 px-3 py-2 text-[11px] font-bold text-slate-200 transition"
                        title="Open in Google Maps"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                        <span>{labels.mapLink}</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Google Maps attribution and End User Terms notice */}
          <p className="text-[10px] text-slate-500 text-right leading-relaxed">
            Hospital directory powered by Google Maps Platform • Subject to{' '}
            <a
              href="https://maps.google.com/help/terms_maps/?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-slate-300"
            >
              Google Maps Terms of Service
            </a>{' '}
            &amp;{' '}
            <a
              href="https://policies.google.com/privacy?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-slate-300"
            >
              Google Privacy Policy
            </a>{' '}
            • Always dial 108 for life-threatening emergencies
          </p>
        </div>
      )}
    </div>
  );
};
