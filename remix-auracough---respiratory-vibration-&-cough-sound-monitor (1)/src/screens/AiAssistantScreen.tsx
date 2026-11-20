import React, { useState, useEffect, useRef } from 'react';
import { SupportedLanguage } from '../config/appConfig';
import {
  AiAudioAnalysisResult,
  AiChatMessage,
  AiSessionBrief,
  AnalysisResult,
  BleConnectionState,
  FeedbackRecord,
  PatientProfile,
  SensorPacket,
  SignalFeatures,
} from '../types';
import {
  analyzeCoughAudioClip,
  generateLongitudinalSessionBrief,
  sendAiCopilotMessage,
} from '../services/geminiService';
import { getAllFeedbackRecords, getAllTestResults } from '../services/storage';
import { audioSpeech } from '../services/audioSpeech';
import {
  Bot,
  Mic,
  Square,
  Upload,
  Send,
  Volume2,
  VolumeX,
  FileText,
  AlertTriangle,
  Copy,
  Check,
  Loader2,
  Activity,
  AudioWaveform,
  ClipboardCheck,
  Cpu,
} from 'lucide-react';

interface Props {
  language: SupportedLanguage;
  currentPatient: PatientProfile;
  packet: SensorPacket | null;
  features: SignalFeatures;
  lastTestResult: AnalysisResult | null;
  bleState: BleConnectionState;
  isSimulated: boolean;
  onNavigate: (tab: string) => void;
}

type AiSubTab = 'copilot' | 'audio_lab' | 'handover_brief';

const QUICK_STARTER_PROMPTS = [
  {
    label: 'Explain Latest Screening',
    prompt:
      'Summarize the latest respiratory screening result in simple language for a rural health worker and list warning signs to watch for.',
  },
  {
    label: 'Interpret Live AP2 Sensors',
    prompt:
      'Analyze the current live AP2 belt biometrics, INMP441 spectral centroid, orientation-compensated MPU6050 chest wave, and SQI.',
  },
  {
    label: 'Hardware & Firmware Help',
    prompt:
      'Explain how to verify INMP441 (256-sample DMA), DS18B20 4.7k pull-up, MAX30102 contact threshold, and BLE RX commands on ESP32 Core v2/v3.',
  },
  {
    label: 'Doctor Referral Questions',
    prompt:
      'What key clinical questions and prototype caveats should an ASHA worker share with a PHC doctor from these AuraPhragm readings?',
  },
];

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to encode audio file.'));
        return;
      }
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error('Failed to read recorded audio blob.'));
    reader.readAsDataURL(blob);
  });
}

export const AiAssistantScreen: React.FC<Props> = ({
  language,
  currentPatient,
  packet,
  features,
  lastTestResult,
  bleState,
  isSimulated,
  onNavigate,
}) => {
  const [subTab, setSubTab] = useState<AiSubTab>('copilot');

  // Chat Copilot State
  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      timestamp: new Date().toISOString(),
      content:
        'AuraPhragm AI Copilot is connected to your live AP2 sensor frame and screening context. Ask about respiratory metrics, hardware pinouts/firmware fixes (F-01 to F-08), or test results.',
      suggestedFollowups: [
        'Interpret my current belt SQI and breathing rate',
        'Why is Piezo GPIO34 disabled by default?',
      ],
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  // Multimodal Audio Analyzer State
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string>('audio/webm');
  const [audioFileName, setAudioFileName] = useState<string>('');
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioResult, setAudioResult] = useState<AiAudioAnalysisResult | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<BlobPart[]>([]);
  const recordTimerRef = useRef<number | null>(null);

  // Longitudinal Handover Brief State
  const [savedTests, setSavedTests] = useState<AnalysisResult[]>([]);
  const [savedFeedback, setSavedFeedback] = useState<FeedbackRecord[]>([]);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);
  const [sessionBrief, setSessionBrief] = useState<AiSessionBrief | null>(null);
  const [copiedBrief, setCopiedBrief] = useState(false);

  useEffect(() => {
    const loadRecords = async () => {
      const [tests, feedback] = await Promise.all([getAllTestResults(), getAllFeedbackRecords()]);
      setSavedTests(tests);
      setSavedFeedback(feedback);
    };
    loadRecords();
  }, []);

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
      audioSpeech.stopSpeaking();
    };
  }, [audioPreviewUrl]);

  const handleSendChat = async (promptOverride?: string) => {
    const prompt = (promptOverride ?? inputText).trim();
    if (!prompt || chatLoading) return;

    const userMsg: AiChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString(),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    if (!promptOverride) setInputText('');
    setChatError(null);
    setChatLoading(true);

    try {
      const res = await sendAiCopilotMessage({
        message: prompt,
        history: nextHistory,
        context: {
          isSimulated,
          patient: currentPatient,
          features,
          lastResult: lastTestResult,
        },
        language,
      });

      const assistantMsg: AiChatMessage = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toISOString(),
        suggestedFollowups: res.suggestedFollowups,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setChatError(err?.message || 'Unable to reach Gemini AI Copilot endpoint.');
    } finally {
      setChatLoading(false);
    }
  };

  const handleToggleSpeak = (msg: AiChatMessage) => {
    if (speakingMsgId === msg.id) {
      audioSpeech.stopSpeaking();
      setSpeakingMsgId(null);
    } else {
      audioSpeech.speakText(msg.content, language);
      setSpeakingMsgId(msg.id);
    }
  };

  const startMicRecording = async () => {
    setAudioError(null);
    setAudioResult(null);
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setAudioError('Browser microphone recording is unavailable. Upload a WAV, MP3, or WebM audio file instead.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);

      recordChunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) recordChunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const mime = recorder.mimeType || 'audio/webm';
        const cleanMime = mime.split(';')[0];
        const blob = new Blob(recordChunksRef.current, { type: cleanMime });
        if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
        setAudioBlob(blob);
        setAudioMimeType(cleanMime);
        setAudioFileName(`mic_capture_${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.webm`);
        setAudioPreviewUrl(URL.createObjectURL(blob));
        setIsRecording(false);
        if (recordTimerRef.current) {
          window.clearInterval(recordTimerRef.current);
          recordTimerRef.current = null;
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecording(true);
      setRecordSeconds(0);

      recordTimerRef.current = window.setInterval(() => {
        setRecordSeconds((prev) => {
          if (prev >= 14) {
            recorder.stop();
            return 15;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      setAudioError(err?.message || 'Microphone permission denied or no audio input found.');
    }
  };

  const stopMicRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleUploadAudioFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioError(null);
    setAudioResult(null);

    if (file.size > 8 * 1024 * 1024) {
      setAudioError('Audio file exceeds 8 MB limit. Please select a clip under 30 seconds.');
      return;
    }

    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    setAudioBlob(file);
    setAudioMimeType(file.type || 'audio/wav');
    setAudioFileName(file.name);
    setAudioPreviewUrl(URL.createObjectURL(file));
  };

  const handleAnalyzeAudio = async () => {
    if (!audioBlob || audioLoading) return;
    setAudioError(null);
    setAudioLoading(true);
    try {
      const base64 = await blobToBase64(audioBlob);
      const res = await analyzeCoughAudioClip({
        audioBase64: base64,
        mimeType: audioMimeType,
        features,
        language,
      });
      setAudioResult(res);
    } catch (err: any) {
      setAudioError(err?.message || 'Failed to analyze audio clip.');
    } finally {
      setAudioLoading(false);
    }
  };

  const handleGenerateBrief = async () => {
    if (briefLoading) return;
    setBriefError(null);
    setBriefLoading(true);
    try {
      const tests = savedTests.length > 0 ? savedTests : lastTestResult ? [lastTestResult] : [];
      if (tests.length === 0) {
        setBriefError('No completed screening sessions found yet. Run a 60s test first.');
        setBriefLoading(false);
        return;
      }
      const res = await generateLongitudinalSessionBrief({
        tests,
        feedback: savedFeedback,
        patient: currentPatient,
        language,
      });
      setSessionBrief(res);
    } catch (err: any) {
      setBriefError(err?.message || 'Failed to generate PHC handover brief.');
    } finally {
      setBriefLoading(false);
    }
  };

  const handleCopyBrief = () => {
    if (!sessionBrief) return;
    const formatted = `AuraPhragm PHC Handover Brief (${currentPatient.name}, ${currentPatient.age}y ${currentPatient.gender}, ${currentPatient.village})\n\nTrend Summary:\n${sessionBrief.trendSummary}\n\nHandover Note:\n${sessionBrief.clinicalHandoverNote}\n\nMetrics:\n- ${sessionBrief.keyMetricsTrend.join('\n- ')}\n\nFollow-Up Questions:\n- ${sessionBrief.followUpQuestionsForDoctor.join('\n- ')}`;
    navigator.clipboard.writeText(formatted);
    setCopiedBrief(true);
    setTimeout(() => setCopiedBrief(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-mono font-bold text-teal-400 uppercase tracking-wider">
            Server-Side Multimodal Clinical Intelligence
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight mt-1 font-display">
            AuraPhragm AI Copilot &amp; Acoustic Lab
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Live AP2 telemetry reasoning, recorded cough/breath audio inspection, and PHC doctor handover synthesis.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('test')}
          className="rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 transition cursor-pointer whitespace-nowrap shrink-0"
        >
          Run 60s Screening
        </button>
      </div>

      {/* Live Context Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs font-mono tabular-nums">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
          <span className="text-slate-500 block text-[10px]">SOURCE STREAM</span>
          <span className={isSimulated ? 'text-amber-300 font-bold' : 'text-emerald-400 font-bold'}>
            {isSimulated ? 'SIMULATOR AP2' : `BLE (${bleState.toUpperCase()})`}
          </span>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
          <span className="text-slate-500 block text-[10px]">RESPIRATION</span>
          <span className="text-white font-bold">{features.breathingRate} bpm</span>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
          <span className="text-slate-500 block text-[10px]">COUGHS / CENTROID</span>
          <span className="text-teal-300 font-bold">
            {features.coughCount} • {Math.round(features.spectralCentroid)} Hz
          </span>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
          <span className="text-slate-500 block text-[10px]">BELT SQI</span>
          <span
            className={`font-bold uppercase ${
              features.signalQuality.status === 'good'
                ? 'text-emerald-400'
                : features.signalQuality.status === 'fair'
                ? 'text-amber-300'
                : 'text-rose-400'
            }`}
          >
            {features.signalQuality.status} ({features.signalQuality.score}%)
          </span>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 col-span-2 sm:col-span-1">
          <span className="text-slate-500 block text-[10px]">LAST TRIAGE</span>
          <span className="text-slate-200 font-bold truncate block">
            {lastTestResult ? lastTestResult.overallTriage.replace(/_/g, ' ') : 'No Test Yet'}
          </span>
        </div>
      </div>

      {/* Sub-Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs overflow-x-auto">
        {[
          { id: 'copilot', label: 'AI Clinical & Hardware Copilot', icon: Bot },
          { id: 'audio_lab', label: 'Multimodal Cough Audio Analyzer', icon: AudioWaveform },
          { id: 'handover_brief', label: 'PHC Handover Trend Brief', icon: ClipboardCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id as AiSubTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: CONTEXT-AWARE COPILOT CHAT */}
      {subTab === 'copilot' && (
        <div className="space-y-4">
          {/* Quick Starters */}
          <div className="flex flex-wrap gap-2">
            {QUICK_STARTER_PROMPTS.map((item) => (
              <button
                key={item.label}
                type="button"
                disabled={chatLoading}
                onClick={() => handleSendChat(item.prompt)}
                className="rounded-lg border border-slate-800 bg-slate-900 hover:border-teal-500/50 hover:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-teal-300 transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Conversation Thread */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5 space-y-4 min-h-[340px] max-h-[520px] overflow-y-auto">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-xl px-4 py-3 text-xs sm:text-sm leading-relaxed border ${
                    msg.role === 'user'
                      ? 'bg-teal-950/60 border-teal-500/40 text-teal-50'
                      : 'bg-slate-950 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-1.5 text-[10px] font-mono text-slate-500">
                    <span className="uppercase font-bold text-teal-400">
                      {msg.role === 'user' ? 'Clinician / Engineer' : 'AuraPhragm Copilot'}
                    </span>
                    {msg.role === 'assistant' && (
                      <button
                        type="button"
                        onClick={() => handleToggleSpeak(msg)}
                        className="flex items-center gap-1 text-slate-400 hover:text-teal-300 cursor-pointer"
                        title="Listen aloud"
                      >
                        {speakingMsgId === msg.id ? (
                          <VolumeX className="w-3.5 h-3.5" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                        <span>{speakingMsgId === msg.id ? 'Stop' : 'Speak'}</span>
                      </button>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>

                {msg.role === 'assistant' &&
                  msg.suggestedFollowups &&
                  msg.suggestedFollowups.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 max-w-[90%]">
                      {msg.suggestedFollowups.map((f, idx) => (
                        <button
                          key={idx}
                          type="button"
                          disabled={chatLoading}
                          onClick={() => handleSendChat(f)}
                          className="rounded-lg border border-slate-800 bg-slate-950 hover:border-teal-500/40 px-2.5 py-1 text-[11px] text-slate-300 hover:text-teal-300 transition cursor-pointer text-left"
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            ))}

            {chatLoading && (
              <div className="flex items-center gap-2 text-xs font-mono text-teal-400 px-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Synthesizing telemetry and safety context...</span>
              </div>
            )}
          </div>

          {chatError && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{chatError}</span>
            </div>
          )}

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendChat();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask about cough pattern, chest SQI, DS18B20 vs core temp, or ESP32 pins..."
              className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-teal-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || chatLoading}
              className="flex items-center gap-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 px-5 py-3 text-xs sm:text-sm font-black transition cursor-pointer disabled:opacity-40 shrink-0 whitespace-nowrap"
            >
              <Send className="w-4 h-4" />
              <span>Ask AI</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: MULTIMODAL COUGH & BREATH AUDIO ANALYZER */}
      {subTab === 'audio_lab' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <AudioWaveform className="w-5 h-5 text-teal-400" />
                  <span>Direct Respiratory &amp; Cough Audio Inspection</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Record up to 15 seconds from microphone or upload a clip (.wav, .webm, .mp3) to classify cough/breath acoustics alongside live belt telemetry.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startMicRecording}
                  className="flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-4 py-2.5 text-xs font-bold transition cursor-pointer whitespace-nowrap"
                >
                  <Mic className="w-4 h-4" />
                  <span>Record Cough / Breath (Max 15s)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopMicRecording}
                  className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2.5 text-xs font-black transition cursor-pointer whitespace-nowrap font-mono tabular-nums"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>Stop Recording ({recordSeconds}s / 15s)</span>
                </button>
              )}

              <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 hover:bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-200 transition cursor-pointer whitespace-nowrap">
                <Upload className="w-4 h-4 text-teal-400" />
                <span>Upload Audio File</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleUploadAudioFile}
                  className="hidden"
                />
              </label>

              {audioBlob && (
                <button
                  type="button"
                  disabled={audioLoading}
                  onClick={handleAnalyzeAudio}
                  className="flex items-center gap-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 px-5 py-2.5 text-xs font-black transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  {audioLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Cpu className="w-4 h-4" />
                  )}
                  <span>{audioLoading ? 'Analyzing Acoustics...' : 'Analyze With Gemini'}</span>
                </button>
              )}
            </div>

            {audioPreviewUrl && (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs font-mono">
                  <span className="text-teal-300 font-bold block">{audioFileName || 'Recorded Clip'}</span>
                  <span className="text-slate-500">
                    {audioMimeType} • {((audioBlob?.size || 0) / 1024).toFixed(1)} KB
                  </span>
                </div>
                <audio controls src={audioPreviewUrl} className="w-full sm:w-80 h-9" />
              </div>
            )}

            {audioError && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{audioError}</span>
              </div>
            )}

            {audioResult && (
              <div className="rounded-xl border border-teal-500/35 bg-slate-950 p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-teal-400 block">
                      Acoustic Classification (Non-Diagnostic)
                    </span>
                    <h4 className="text-lg font-black text-white">{audioResult.coughClassification}</h4>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">{audioResult.modelVersion}</span>
                </div>

                {audioResult.warningFlags.length > 0 && (
                  <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-200 space-y-1">
                    <strong className="text-rose-300 block">Acoustic Warning Signs Noted:</strong>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {audioResult.warningFlags.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg border border-slate-800 bg-slate-900 p-3.5 space-y-1">
                    <span className="font-mono font-bold text-teal-300 block">Sound Observations</span>
                    <p className="text-slate-300 leading-relaxed">{audioResult.soundObservations}</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900 p-3.5 space-y-1">
                    <span className="font-mono font-bold text-sky-300 block">Breathing Acoustics</span>
                    <p className="text-slate-300 leading-relaxed">{audioResult.breathingAcousticNotes}</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900 p-3.5 space-y-1">
                    <span className="font-mono font-bold text-amber-300 block">Belt Telemetry Correlation</span>
                    <p className="text-slate-300 leading-relaxed">{audioResult.correlationWithBelt}</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900 p-3.5 space-y-1">
                    <span className="font-mono font-bold text-emerald-300 block">Screening Guidance</span>
                    <p className="text-slate-300 leading-relaxed">{audioResult.screeningGuidance}</p>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 font-mono">{audioResult.confidenceNote}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: LONGITUDINAL PHC HANDOVER BRIEF */}
      {subTab === 'handover_brief' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-teal-400" />
                  <span>PHC Referral &amp; Longitudinal Session Brief</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-mono tabular-nums">
                  Synthesizes {savedTests.length} saved screening session(s) and {savedFeedback.length} clinician feedback record(s) for {currentPatient.name}.
                </p>
              </div>

              <button
                type="button"
                disabled={briefLoading}
                onClick={handleGenerateBrief}
                className="flex items-center gap-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 px-5 py-2.5 text-xs font-black transition cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {briefLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Activity className="w-4 h-4" />
                )}
                <span>{briefLoading ? 'Generating Brief...' : 'Generate PHC Handover Brief'}</span>
              </button>
            </div>

            {briefError && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{briefError}</span>
              </div>
            )}

            {sessionBrief && (
              <div className="rounded-xl border border-teal-500/35 bg-slate-950 p-5 space-y-4">
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <span className="text-xs font-mono font-bold text-teal-400">
                    HANDOVER BRIEF • {sessionBrief.modelVersion}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyBrief}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition cursor-pointer"
                  >
                    {copiedBrief ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedBrief ? 'Copied' : 'Copy Handover Note'}</span>
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <h4 className="font-bold text-white uppercase tracking-wider">Longitudinal Trend Summary</h4>
                  <p className="text-slate-300 leading-relaxed">{sessionBrief.trendSummary}</p>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 space-y-1.5 text-xs">
                  <h4 className="font-bold text-teal-300 uppercase tracking-wider">PHC Referral Paragraph</h4>
                  <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {sessionBrief.clinicalHandoverNote}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 space-y-2">
                    <h4 className="font-bold text-sky-300 uppercase tracking-wider">Key Biometric Trajectory</h4>
                    <ul className="list-disc pl-4 space-y-1 text-slate-300">
                      {sessionBrief.keyMetricsTrend.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 space-y-2">
                    <h4 className="font-bold text-amber-300 uppercase tracking-wider">Questions for PHC Doctor</h4>
                    <ul className="list-disc pl-4 space-y-1 text-slate-300">
                      {sessionBrief.followUpQuestionsForDoctor.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Safety Footer */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 text-[11px] text-amber-200/90 text-center">
        Research Prototype AI Guidance Only — Does not replace stethoscope auscultation, pulse oximetry, or physician examination.
      </div>
    </div>
  );
};
