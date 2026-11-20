import React from 'react';
import { PhoneCall, AlertOctagon, Hospital, MapPin } from 'lucide-react';
import { APP_CONFIG, SupportedLanguage } from '../config/appConfig';
import { TRANSLATIONS } from '../i18n/translations';
import { LocationPermissionStatus, NearbyHospital } from '../types';

interface Props {
  language: SupportedLanguage;
  reason?: string;
  hospitals?: NearbyHospital[];
  locationStatus?: LocationPermissionStatus;
  onRequestLocation?: () => void;
}

export const EmergencyBanner: React.FC<Props> = ({
  language,
  reason,
  hospitals = [],
  locationStatus = 'idle',
  onRequestLocation,
}) => {
  const t = TRANSLATIONS[language];
  const nearestCallableHospital = hospitals.find((h) => !!h.telHref);

  return (
    <div className="rounded-2xl border-2 border-red-500 bg-red-950/90 p-4 text-white shadow-xl shadow-red-950/60 space-y-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-red-600 p-2 text-white shrink-0">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-bold tracking-tight text-red-100">{t.emergencyBanner}</h4>
            <p className="text-xs text-red-200 mt-0.5">
              {reason || 'Critical signs reported (severe breathlessness, blue lips, or coughing blood). Do not delay.'}
            </p>
          </div>
        </div>

        <a
          href={`tel:${APP_CONFIG.emergencyNumber}`}
          className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-red-50 px-5 py-2.5 text-sm font-black text-red-700 shadow-md transition active:scale-95 shrink-0"
        >
          <PhoneCall className="w-4 h-4" />
          <span>{t.callAmbulance}</span>
        </a>
      </div>

      {/* Nearby Hospital Quick-Call Strip */}
      {nearestCallableHospital ? (
        <div className="rounded-xl bg-black/30 border border-red-400/40 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Hospital className="w-4 h-4 text-emerald-300 shrink-0" />
            <div className="truncate">
              <span className="font-bold text-white">{nearestCallableHospital.name}</span>
              <span className="text-red-200 ml-2 font-mono">({nearestCallableHospital.distanceKm} km)</span>
              {nearestCallableHospital.phone && (
                <span className="text-emerald-200 ml-2 font-mono hidden sm:inline">
                  {nearestCallableHospital.phone}
                </span>
              )}
            </div>
          </div>
          <a
            href={nearestCallableHospital.telHref}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 px-3.5 py-2 text-xs font-black text-slate-950 transition shrink-0"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Call Nearest Hospital</span>
          </a>
        </div>
      ) : locationStatus !== 'granted' && onRequestLocation ? (
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-red-500/30 text-xs text-red-200">
          <span>Enable location to also see direct phone numbers of nearest hospitals.</span>
          <button
            type="button"
            onClick={onRequestLocation}
            className="flex items-center gap-1 rounded-lg bg-red-800/80 hover:bg-red-700 px-3 py-1.5 text-[11px] font-bold text-white transition cursor-pointer shrink-0"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Find Nearby Hospitals</span>
          </button>
        </div>
      ) : null}
    </div>
  );
};
