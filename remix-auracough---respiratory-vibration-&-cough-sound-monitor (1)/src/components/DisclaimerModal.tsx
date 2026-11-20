import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldCheck, Stethoscope } from 'lucide-react';
import { SupportedLanguage } from '../config/appConfig';
import { TRANSLATIONS } from '../i18n/translations';

interface Props {
  language: SupportedLanguage;
  forceOpen?: boolean;
  onClose?: () => void;
}

export const DisclaimerModal: React.FC<Props> = ({ language, forceOpen = false, onClose }) => {
  const [isOpen, setIsOpen] = useState(false);
  const t = TRANSLATIONS[language];

  useEffect(() => {
    const accepted =
      localStorage.getItem('auraphragm_disclaimer_accepted') ||
      localStorage.getItem('auracough_disclaimer_accepted');
    if (!accepted || forceOpen) {
      setIsOpen(true);
    }
  }, [forceOpen]);

  const handleAccept = () => {
    localStorage.setItem('auraphragm_disclaimer_accepted', 'true');
    setIsOpen(false);
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl border border-rose-500/40 bg-slate-900 p-6 md:p-7 shadow-2xl text-slate-100">
        <div className="flex items-center gap-3 text-rose-400 pb-3 border-b border-slate-800">
          <div className="rounded-xl bg-rose-950/70 p-2.5 border border-rose-500/30">
            <AlertTriangle className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-display font-bold tracking-tight text-white">
              {t.disclaimerTitle}
            </h2>
            <p className="text-xs text-rose-300 font-mono">AURAPHRAGM RESEARCH PROTOTYPE</p>
          </div>
        </div>

        <div className="mt-5 space-y-4 text-sm text-slate-300 leading-relaxed">
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-4 text-amber-200 text-xs md:text-sm font-medium">
            {t.disclaimerText}
          </div>

          <div className="space-y-2 text-xs md:text-sm">
            <div className="flex items-start gap-2.5">
              <Stethoscope className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-white">Multi-Sensor Prototype Scope:</strong> Combines MPU6050 chest-wall motion, INMP441 I2S audio, experimental MAX30102 optical PPG, and DS18B20 contact skin temperature for experimental screening research.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-white">Validation Required:</strong> Derived metrics require validation against certified medical equipment and clinician judgment before clinical use.
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-950 p-3 text-xs text-slate-400 border border-slate-800">
            In medical emergencies (coughing blood, blue lips, acute breathlessness), contact <strong className="text-white">108 (National Ambulance Service)</strong> immediately.
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={handleAccept}
            className="w-full rounded-xl bg-teal-500 hover:bg-teal-400 py-3 text-sm font-bold text-slate-950 transition cursor-pointer flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-5 h-5" />
            <span>{t.iUnderstand}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
