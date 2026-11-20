import { AnalysisResult, CalibrationProfile, FeedbackRecord, PatientProfile } from '../types';

const DB_NAME = 'AuraPhragmDB';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('tests')) {
        db.createObjectStore('tests', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('feedback')) {
        db.createObjectStore('feedback', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('calibration')) {
        db.createObjectStore('calibration', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('patients')) {
        db.createObjectStore('patients', { keyPath: 'id' });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveTestResult(result: AnalysisResult): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tests', 'readwrite');
    const store = tx.objectStore('tests');
    const req = store.put(result);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAllTestResults(): Promise<AnalysisResult[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tests', 'readonly');
    const store = tx.objectStore('tests');
    const req = store.getAll();
    req.onsuccess = () => {
      const res = req.result as AnalysisResult[];
      res.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      resolve(res);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteTestResult(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tests', 'readwrite');
    const store = tx.objectStore('tests');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function saveFeedbackRecord(record: FeedbackRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('feedback', 'readwrite');
    const store = tx.objectStore('feedback');
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAllFeedbackRecords(): Promise<FeedbackRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('feedback', 'readonly');
    const store = tx.objectStore('feedback');
    const req = store.getAll();
    req.onsuccess = () => {
      const res = req.result as FeedbackRecord[];
      res.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      resolve(res);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveCalibrationProfile(profile: CalibrationProfile, patientId: string = 'default'): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('calibration', 'readwrite');
    const store = tx.objectStore('calibration');
    const req = store.put({ id: patientId, ...profile });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getCalibrationProfile(patientId: string = 'default'): Promise<CalibrationProfile | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('calibration', 'readonly');
    const store = tx.objectStore('calibration');
    const req = store.get(patientId);
    req.onsuccess = () => resolve(req.result ? (req.result as CalibrationProfile) : null);
    req.onerror = () => reject(req.error);
  });
}

export async function savePatientProfile(patient: PatientProfile): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('patients', 'readwrite');
    const store = tx.objectStore('patients');
    const req = store.put(patient);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAllPatientProfiles(): Promise<PatientProfile[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('patients', 'readonly');
    const store = tx.objectStore('patients');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as PatientProfile[]);
    req.onerror = () => reject(req.error);
  });
}

export async function clearAllLocalData(): Promise<void> {
  const db = await openDB();
  const stores = ['tests', 'feedback', 'calibration', 'patients'];
  const tx = db.transaction(stores, 'readwrite');
  for (const s of stores) {
    tx.objectStore(s).clear();
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Dataset Export Helpers for Clinical Audits & Model Review
export function exportFeedbackAsCSV(records: FeedbackRecord[]): string {
  const headers = [
    'id',
    'timestamp',
    'modelVersion',
    'breathingRate',
    'coughCount',
    'dominantFrequency',
    'spectralCentroid',
    'avgContactTempC',
    'avgHeartRateBpm',
    'avgSpo2Pct',
    'predictedTriage',
    'predictedCondition',
    'userFeedback',
    'doctorFinding',
    'clinicalNotes',
    'groundTruth',
  ];

  const rows = records.map((r) => [
    r.id,
    `"${r.timestamp}"`,
    `"${r.modelVersion}"`,
    r.features?.breathingRate ?? '',
    r.features?.coughCount ?? '',
    r.features?.dominantFrequency ?? '',
    r.features?.spectralCentroid ?? '',
    r.features?.avgContactTempC ?? '',
    r.features?.avgHeartRateBpm ?? '',
    r.features?.avgSpo2Pct ?? '',
    `"${r.predictedTriage}"`,
    `"${r.predictedCondition}"`,
    `"${r.userFeedback}"`,
    `"${r.doctorFinding || ''}"`,
    `"${(r.clinicalNotes || '').replace(/"/g, '""')}"`,
    `"${r.groundTruth || ''}"`,
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

export function exportFeedbackAsJSON(records: FeedbackRecord[]): string {
  return JSON.stringify(records, null, 2);
}
