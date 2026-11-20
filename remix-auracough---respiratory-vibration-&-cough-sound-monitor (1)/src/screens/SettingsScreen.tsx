import React, { useState, useEffect } from 'react';
import { SupportedLanguage } from '../config/appConfig';
import { PatientProfile } from '../types';
import { getAllPatientProfiles, savePatientProfile, clearAllLocalData } from '../services/storage';
import {
  Globe,
  Users,
  Shield,
  Trash2,
  Plus,
  UserCheck,
} from 'lucide-react';

interface Props {
  language: SupportedLanguage;
  onChangeLanguage: (lang: SupportedLanguage) => void;
  currentPatient: PatientProfile;
  onSelectPatient: (p: PatientProfile) => void;
  onOpenDisclaimer: () => void;
}

export const SettingsScreen: React.FC<Props> = ({
  language,
  onChangeLanguage,
  currentPatient,
  onSelectPatient,
  onOpenDisclaimer,
}) => {
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [isAddingPatient, setIsAddingPatient] = useState(false);

  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState(35);
  const [newGender, setNewGender] = useState<'Female' | 'Male' | 'Other'>('Female');
  const [newVillage, setNewVillage] = useState('Rampur Block');
  const [newAshaId, setNewAshaId] = useState('ASHA-01');

  const loadPatients = async () => {
    const list = await getAllPatientProfiles();
    setPatients(list);
  };

  useEffect(() => {
    loadPatients();
  }, []);

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newP: PatientProfile = {
      id: `p_${Date.now()}`,
      name: newName.trim(),
      age: Number(newAge) || 30,
      gender: newGender,
      village: newVillage.trim(),
      ashaWorkerId: newAshaId.trim(),
      lastTestDate: new Date().toISOString(),
    };

    await savePatientProfile(newP);
    await loadPatients();
    onSelectPatient(newP);
    setIsAddingPatient(false);
    setNewName('');
  };

  const handleClearAllData = async () => {
    await clearAllLocalData();
    window.location.reload();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <div className="border-b border-slate-800 pb-4">
        <span className="text-xs font-mono font-bold text-teal-400 uppercase tracking-wider">
          Configuration
        </span>
        <h2 className="text-2xl font-black text-white tracking-tight mt-1 font-display">
          App &amp; Community Settings
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Multi-language preferences, patient profiles for rural ASHA health workers, and offline AuraPhragm storage privacy.
        </p>
      </div>

      {/* Language Selector */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <Globe className="w-5 h-5 text-teal-400" />
          <span>Regional Language / भाषा / ভাষা</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: 'en', label: 'English', sub: 'Standard clinical terms' },
            { id: 'hi', label: 'हिन्दी (Hindi)', sub: 'सरल ग्रामीण ASHA शब्दावली' },
            { id: 'bn', label: 'বাংলা (Bengali)', sub: 'সহজ গ্রামীণ পরিভাষা' },
          ].map((lang) => (
            <button
              key={lang.id}
              type="button"
              onClick={() => onChangeLanguage(lang.id as SupportedLanguage)}
              className={`rounded-xl p-4 border text-left transition cursor-pointer flex flex-col justify-between ${
                language === lang.id
                  ? 'border-teal-500 bg-teal-950/40 shadow-md ring-1 ring-teal-500'
                  : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
              }`}
            >
              <div>
                <span className="text-base font-bold text-white block">{lang.label}</span>
                <span className="text-xs text-slate-400 mt-0.5 block">{lang.sub}</span>
              </div>
              {language === lang.id && (
                <span className="text-[10px] font-bold text-teal-400 font-mono mt-3">SELECTED</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Community / Health Worker Patient Profiles */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-400" />
            <h3 className="text-base font-bold text-white">Community Patient Profiles (ASHA Mode)</h3>
          </div>

          <button
            type="button"
            onClick={() => setIsAddingPatient(!isAddingPatient)}
            className="flex items-center gap-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 text-xs font-bold transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Patient</span>
          </button>
        </div>

        {/* Add Patient Form */}
        {isAddingPatient && (
          <form
            onSubmit={handleCreatePatient}
            className="rounded-xl border border-teal-500/30 bg-slate-950 p-5 space-y-4 animate-in fade-in"
          >
            <h4 className="text-xs font-bold text-teal-300 uppercase">Register New Village Patient</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Patient Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-white focus:outline-hidden focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Age (Years)</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={newAge}
                  onChange={(e) => setNewAge(parseInt(e.target.value, 10))}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-white focus:outline-hidden focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Gender</label>
                <select
                  value={newGender}
                  onChange={(e) => setNewGender(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-white focus:outline-hidden focus:border-teal-500"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Village / Hamlet</label>
                <input
                  type="text"
                  placeholder="e.g. Rampur"
                  value={newVillage}
                  onChange={(e) => setNewVillage(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-white focus:outline-hidden focus:border-teal-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingPatient(false)}
                className="rounded-lg border border-slate-800 px-4 py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-5 py-2 text-xs transition cursor-pointer"
              >
                Save Profile
              </button>
            </div>
          </form>
        )}

        {/* Existing Patient List */}
        <div className="space-y-2">
          {patients.map((p) => {
            const isSelected = p.id === currentPatient.id;
            return (
              <div
                key={p.id}
                onClick={() => onSelectPatient(p)}
                className={`rounded-xl p-4 border transition cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'border-teal-500 bg-teal-950/40 shadow-xs'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex flex-wrap items-baseline gap-2.5">
                    <span className="font-bold text-white text-sm">{p.name}</span>
                    <span className="text-xs text-slate-400 font-mono tabular-nums">
                      {p.age}y • {p.gender}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Village: {p.village} • ASHA ID: <span className="font-mono">{p.ashaWorkerId || 'ASHA-01'}</span>
                  </p>
                </div>

                {isSelected ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-teal-400 font-mono">
                    <UserCheck className="w-4 h-4" />
                    <span>ACTIVE</span>
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-slate-500 hover:text-white">Select</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Data Privacy & Ethics */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <Shield className="w-5 h-5 text-teal-400" />
          <span>Data Privacy &amp; Device Storage (Indian DPDP Act Compliance)</span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          AuraPhragm operates OFFLINE-FIRST. All patient biometric waveforms, multi-sensor metrics, and feedback records are stored locally in your browser&apos;s private IndexedDB (<code className="font-mono text-teal-300">AuraPhragmDB</code>). No patient information is uploaded without explicit consent.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onOpenDisclaimer}
            className="rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-200 transition cursor-pointer"
          >
            Review Clinical Disclaimer
          </button>
          <button
            type="button"
            onClick={handleClearAllData}
            className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 px-4 py-2.5 text-xs font-bold transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Wipe All Local Storage Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
