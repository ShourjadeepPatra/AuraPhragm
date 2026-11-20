import { SupportedLanguage } from '../config/appConfig';

export interface TranslationDictionary {
  appName: string;
  tagline: string;
  disclaimerTitle: string;
  disclaimerText: string;
  iUnderstand: string;
  emergencyBanner: string;
  callAmbulance: string;

  // Tabs
  tabHome: string;
  tabLive: string;
  tabTest: string;
  tabResult: string;
  tabSimulator: string;
  tabCalibration: string;
  tabHistory: string;
  tabModel: string;
  tabAi: string;
  tabDevice: string;
  tabSettings: string;
  tabAbout: string;

  // Triage banners
  helpNeeded: string;
  helpNotNeeded: string;
  monitorRetest: string;
  simulatedDataWarning: string;

  // Signal & features
  breathingRate: string;
  coughCount: string;
  signalQuality: string;
  good: string;
  fair: string;
  poor: string;
  chestDisplacement: string;
  vibration: string;
  audioEnergy: string;
  spectrum: string;
  contactTemp: string;
  experimentalPpg: string;
  sensorUnavailable: string;
  piezoSafetyDisabled: string;

  // Test flow
  startTest: string;
  stopTest: string;
  secondsRemaining: string;
  breatheNormally: string;
  sitUpright: string;
  keepBeltSnug: string;

  // Symptoms
  symptomsTitle: string;
  fever: string;
  coughDuration: string;
  bloodInSputum: string;
  severeBreathlessness: string;
  blueLips: string;
  weightLoss: string;
  smoking: string;
  tbContact: string;

  // Actions
  voiceReadout: string;
  stopVoice: string;
  provideFeedback: string;
  markedCorrect: string;
  markedWrong: string;
  actualDoctorFinding: string;
  saveFeedback: string;
  exportData: string;
}

export const TRANSLATIONS: Record<SupportedLanguage, TranslationDictionary> = {
  en: {
    appName: 'AuraPhragm',
    tagline: 'Multi-Sensor Diaphragm Motion, I2S Audio & Respiratory Prototype',
    disclaimerTitle: 'Research Prototype & Screening Aid Only',
    disclaimerText:
      'AuraPhragm is a student/research prototype. It is NOT a clinically validated medical device and must NOT be used to diagnose asthma, pneumonia, COPD, sleep apnoea, fever, or any condition. MAX30102 SpO2/HR is experimental, DS18B20 measures skin/contact temperature only, and Piezo GPIO34 stays disabled until a protected analogue front-end is verified. Always consult a qualified doctor.',
    iUnderstand: 'I Understand & Agree',
    emergencyBanner: 'EMERGENCY: Urgent Medical Attention Needed',
    callAmbulance: 'Call 108 (Ambulance)',

    tabHome: 'Home',
    tabLive: 'Live Lab',
    tabTest: '60s Test',
    tabResult: 'Result',
    tabSimulator: 'Simulator',
    tabCalibration: 'Calibration',
    tabHistory: 'History',
    tabModel: 'Feedback',
    tabAi: 'AI Copilot',
    tabDevice: 'Hardware & BLE',
    tabSettings: 'Settings',
    tabAbout: 'Safety & BOM',

    helpNeeded: 'MEDICAL HELP NEEDED',
    helpNotNeeded: 'MEDICAL HELP NOT NEEDED',
    monitorRetest: 'MONITOR & RE-TEST',
    simulatedDataWarning: 'SIMULATED MULTI-SENSOR DATA — Prototype Testing Only',

    breathingRate: 'Breathing Rate',
    coughCount: 'Cough Events',
    signalQuality: 'Signal Quality',
    good: 'Good',
    fair: 'Fair',
    poor: 'Poor',
    chestDisplacement: 'Chest Expansion (MPU6050)',
    vibration: 'Piezo Vibration (AFE)',
    audioEnergy: 'INMP441 I2S Acoustic RMS',
    spectrum: 'Acoustic & Motion Spectrum',
    contactTemp: 'Contact Temp (DS18B20)',
    experimentalPpg: 'Experimental PPG (MAX30102)',
    sensorUnavailable: 'Unavailable',
    piezoSafetyDisabled: 'Disabled (Safety Isolation)',

    startTest: 'Start 60s Test',
    stopTest: 'Cancel Test',
    secondsRemaining: 'Seconds Remaining',
    breatheNormally: 'Breathe normally and stay still',
    sitUpright: 'Sit upright with shoulders relaxed',
    keepBeltSnug: 'Ensure belt is snug around diaphragm',

    symptomsTitle: 'Patient Symptoms Checklist',
    fever: 'Fever (Reported high temperature)',
    coughDuration: 'Cough Duration (>3 weeks indicates TB risk)',
    bloodInSputum: 'Blood in Sputum (Coughing blood)',
    severeBreathlessness: 'Severe Breathlessness / Chest Tightness',
    blueLips: 'Blue Lips or Fingertips (Low oxygen)',
    weightLoss: 'Unexplained Weight Loss / Night Sweats',
    smoking: 'History of Smoking / Bidi / Chulha smoke',
    tbContact: 'Close Contact with Known TB Patient',

    voiceReadout: 'Voice Readout',
    stopVoice: 'Stop Voice',
    provideFeedback: 'Clinician / Health Worker Feedback',
    markedCorrect: 'Agreed with screening',
    markedWrong: 'Disagreed with screening',
    actualDoctorFinding: 'Actual Clinical Finding',
    saveFeedback: 'Save Feedback Record',
    exportData: 'Export Records (CSV/JSON)',
  },

  hi: {
    appName: 'ऑराफ्रेग्म (AuraPhragm)',
    tagline: 'मल्टी-सेंसर डायाफ्राम गति, I2S ऑडियो व श्वसन जांच प्रोटोटाइप',
    disclaimerTitle: 'केवल शोध प्रोटोटाइप व प्रारंभिक जांच सहायता',
    disclaimerText:
      'ऑराफ्रेग्म एक शोध प्रोटोटाइप है। यह कोई प्रमाणित मेडिकल उपकरण या डॉक्टरी निदान नहीं है। MAX30102 SpO2/हृदय गति प्रयोगात्मक है, DS18B20 केवल त्वचा का संपर्क तापमान मापता है, और पिजो सेंसर सुरक्षा सर्किट सत्यापित होने तक बंद है। हमेशा योग्य चिकित्सक से संपर्क करें।',
    iUnderstand: 'मैं समझता/समझती हूँ और सहमत हूँ',
    emergencyBanner: 'आपातकाल: तुरंत अस्पताल ले जाएं',
    callAmbulance: '108 एम्बुलेंस बुलाएं',

    tabHome: 'होम',
    tabLive: 'लाइव लैब',
    tabTest: '60s जांच',
    tabResult: 'परिणाम',
    tabSimulator: 'सिम्युलेटर',
    tabCalibration: 'कैलिब्रेशन',
    tabHistory: 'इतिहास',
    tabModel: 'फीडबैक',
    tabAi: 'AI सहायक',
    tabDevice: 'हार्डवेयर व BLE',
    tabSettings: 'सेटिंग्स',
    tabAbout: 'सुरक्षा व BOM',

    helpNeeded: 'डॉक्टर की तुरंत सहायता चाहिए',
    helpNotNeeded: 'डॉक्टर सहायता की आवश्यकता नहीं',
    monitorRetest: 'निगरानी रखें और दोबारा जांचें',
    simulatedDataWarning: 'सिम्युलेटेड मल्टी-सेंसर डेटा — केवल परीक्षण हेतु',

    breathingRate: 'सांस की गति',
    coughCount: 'खांसी घटनाएं',
    signalQuality: 'सिग्नल गुणवत्ता',
    good: 'उत्तम',
    fair: 'मध्यम',
    poor: 'खराब',
    chestDisplacement: 'छाती का फैलाव (MPU6050)',
    vibration: 'पिजो कंपन (AFE)',
    audioEnergy: 'INMP441 I2S ऑडियो RMS',
    spectrum: 'ऑडियो व गति स्पेक्ट्रम',
    contactTemp: 'त्वचा तापमान (DS18B20)',
    experimentalPpg: 'प्रयोगात्मक PPG (MAX30102)',
    sensorUnavailable: 'अनुपलब्ध',
    piezoSafetyDisabled: 'निष्क्रिय (सुरक्षा अलगाव)',

    startTest: '60 सेकंड जांच शुरू करें',
    stopTest: 'जांच रोकें',
    secondsRemaining: 'सेकंड शेष',
    breatheNormally: 'सामान्य सांस लें और शांत बैठें',
    sitUpright: 'सीधे बैठें और कंधे ढीले रखें',
    keepBeltSnug: 'बेल्ट को छाती के निचले हिस्से पर सही कसें',

    symptomsTitle: 'मरीज के लक्षणों की सूची',
    fever: 'बुखार (उच्च शरीर तापमान)',
    coughDuration: 'खांसी की अवधि (3 हफ्ते से ज्यादा = टीबी खतरा)',
    bloodInSputum: 'बलगम में खून आना',
    severeBreathlessness: 'सांस लेने में भारी तकलीफ',
    blueLips: 'होंठ या नाखून नीले पड़ना (ऑक्सीजन कमी)',
    weightLoss: 'वजन घटना या रात में पसीना',
    smoking: 'बीड़ी/सिगरेट या चूल्हे का धुआं',
    tbContact: 'टीबी मरीज के संपर्क में आना',

    voiceReadout: 'आवाज में सुनें',
    stopVoice: 'आवाज रोकें',
    provideFeedback: 'डॉक्टर या स्वास्थ्य कार्यकर्ता फीडबैक',
    markedCorrect: 'परिणाम सही माना',
    markedWrong: 'परिणाम गलत माना',
    actualDoctorFinding: 'डॉक्टर की वास्तविक जांच',
    saveFeedback: 'फीडबैक सहेजें',
    exportData: 'डेटा निर्यात (CSV/JSON)',
  },

  bn: {
    appName: 'অরাফ্র্যাগম (AuraPhragm)',
    tagline: 'মাল্টি-সেন্সর ডায়াফ্রাম গতি, I2S অডিও ও শ্বাস-প্রশ্বাস প্রোটোটাইপ',
    disclaimerTitle: 'গবেষণা প্রোটোটাইপ ও প্রাথমিক স্ক্রিনিং সহায়তা',
    disclaimerText:
      'অরাফ্র্যাগম একটি গবেষণা প্রোটোটাইপ। এটি কোনো প্রমাণিত চিকিৎসা সরঞ্জাম বা রোগ নির্ণয় যন্ত্র নয়। MAX30102 SpO2/হৃদস্পন্দন পরীক্ষামূলক, DS18B20 কেবল ত্বকের স্পর্শ তাপমাত্রা মাপে এবং নিরাপত্তা সার্কিট যাচাই না হওয়া পর্যন্ত পাইজো নিষ্ক্রিয় থাকে। সর্বদা চিকিৎসকের পরামর্শ নিন।',
    iUnderstand: 'আমি বুঝতে পেরেছি ও সম্মত',
    emergencyBanner: 'জরুরি অবস্থা: অবিলম্বে হাসপাতালে নিন',
    callAmbulance: '১০৮ অ্যাম্বুলেন্সে ফোন করুন',

    tabHome: 'হোম',
    tabLive: 'লাইভ ল্যাব',
    tabTest: '৬০ সে. টেস্ট',
    tabResult: 'ফলাফল',
    tabSimulator: 'সিমুলেটর',
    tabCalibration: 'ক্যালিব্রেশন',
    tabHistory: 'ইতিহাস',
    tabModel: 'ফিডব্যাক',
    tabAi: 'AI সহায়ক',
    tabDevice: 'হার্ডওয়্যার ও BLE',
    tabSettings: 'সেটিংস',
    tabAbout: 'সুরক্ষা ও BOM',

    helpNeeded: 'ডাক্তারি সাহায্য প্রয়োজন',
    helpNotNeeded: 'ডাক্তারি সাহায্য প্রয়োজন নেই',
    monitorRetest: 'নজর রাখুন ও পুনরায় পরীক্ষা করুন',
    simulatedDataWarning: 'সিমুলেটেড মাল্টি-সেন্সর ডেটা — শুধুমাত্র পরীক্ষার জন্য',

    breathingRate: 'শ্বাস-প্রশ্বাসের হার',
    coughCount: 'কাশির ঘটনা',
    signalQuality: 'সংকেতের মান',
    good: 'ভালো',
    fair: 'মোটামুটি',
    poor: 'দুর্বল',
    chestDisplacement: 'বুকের প্রসারণ (MPU6050)',
    vibration: 'পাইজো কম্পন (AFE)',
    audioEnergy: 'INMP441 I2S অডিও RMS',
    spectrum: 'অডিও ও গতি স্পেকট্রাম',
    contactTemp: 'স্পর্শ তাপমাত্রা (DS18B20)',
    experimentalPpg: 'পরীক্ষামূলক PPG (MAX30102)',
    sensorUnavailable: 'অনুপলব্ধ',
    piezoSafetyDisabled: 'নিষ্ক্রিয় (নিরাপত্তা বিচ্ছিন্নতা)',

    startTest: '৬০ সেকেন্ড পরীক্ষা শুরু করুন',
    stopTest: 'পরীক্ষা বাতিল করুন',
    secondsRemaining: 'সেকেন্ড বাকি',
    breatheNormally: 'স্বাভাবিক শ্বাস নিন ও স্থির বসুন',
    sitUpright: 'সোজা হয়ে বসুন',
    keepBeltSnug: 'বেল্টটি বুকের নিচে ঠিকমতো আঁটসাঁট করুন',

    symptomsTitle: 'রোগীর লক্ষণসমূহ',
    fever: 'জ্বর',
    coughDuration: 'কাশির স্থায়িত্ব (৩ সপ্তাহের বেশি = যক্ষ্মা ঝুঁকি)',
    bloodInSputum: 'কফে রক্ত বের হওয়া',
    severeBreathlessness: 'তীব্র শ্বাসকষ্ট',
    blueLips: 'ঠোঁট বা নখ নীল হয়ে যাওয়া',
    weightLoss: 'ওজন হ্রাস বা রাতে ঘাম',
    smoking: 'ধূমপান বা উনুনের ধোঁয়া',
    tbContact: 'যক্ষ্মা রোগীর সংস্পর্শে আসা',

    voiceReadout: 'ভয়েস শুনুন',
    stopVoice: 'ভয়েস বন্ধ করুন',
    provideFeedback: 'স্বাস্থ্যকর্মীর মতামত ও ফিডব্যাক',
    markedCorrect: 'সঠিক ফলাফল',
    markedWrong: 'ভুল ফলাফল',
    actualDoctorFinding: 'ডাক্তারের প্রকৃত পর্যবেক্ষণ',
    saveFeedback: 'ফিডব্যাক সংরক্ষণ করুন',
    exportData: 'ডেটা এক্সপোর্ট (CSV/JSON)',
  },
};
