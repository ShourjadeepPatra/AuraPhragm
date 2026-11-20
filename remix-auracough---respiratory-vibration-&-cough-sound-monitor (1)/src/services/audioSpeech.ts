import { SupportedLanguage } from '../config/appConfig';
import { AnalysisResult, SimulationScenario } from '../types';

class AudioSpeechService {
  private synth: SpeechSynthesis | null = null;
  private audioCtx: AudioContext | null = null;
  private isSpeaking: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  private initAudioContext() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playBeep(freq: number = 440, durationMs: number = 100, type: OscillatorType = 'sine') {
    try {
      this.initAudioContext();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + durationMs / 1000);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + durationMs / 1000);
    } catch (e) {
      console.warn('Audio tone error:', e);
    }
  }

  playScenarioAcousticSound(scenario: SimulationScenario) {
    try {
      this.initAudioContext();
      if (!this.audioCtx) return;
      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      if (scenario === 'whooping') {
        // Whooping cough: 5 staccato cough clicks followed by rising 400Hz -> 580Hz whoop gasp
        for (let i = 0; i < 5; i++) {
          const t = now + i * 0.16;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(140 + Math.random() * 40, t);
          gain.gain.setValueAtTime(0.2, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.1);
        }

        // Whoop gasp at end
        const whoopTime = now + 5 * 0.16 + 0.05;
        const whoopOsc = ctx.createOscillator();
        const whoopGain = ctx.createGain();
        whoopOsc.type = 'sine';
        whoopOsc.frequency.setValueAtTime(360, whoopTime);
        whoopOsc.frequency.exponentialRampToValueAtTime(560, whoopTime + 0.6);
        whoopGain.gain.setValueAtTime(0.001, whoopTime);
        whoopGain.gain.linearRampToValueAtTime(0.18, whoopTime + 0.25);
        whoopGain.gain.exponentialRampToValueAtTime(0.001, whoopTime + 0.65);
        whoopOsc.connect(whoopGain);
        whoopGain.connect(ctx.destination);
        whoopOsc.start(whoopTime);
        whoopOsc.stop(whoopTime + 0.7);
      } else if (scenario === 'barking_croup') {
        // Barking cough: metallic brassy resonant blast
        for (let b = 0; b < 2; b++) {
          const t = now + b * 0.45;
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();
          osc1.type = 'sawtooth';
          osc2.type = 'square';
          osc1.frequency.setValueAtTime(110, t);
          osc2.frequency.setValueAtTime(165, t);
          gain.gain.setValueAtTime(0.25, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);
          osc1.start(t);
          osc2.start(t);
          osc1.stop(t + 0.3);
          osc2.stop(t + 0.3);
        }
      } else if (scenario === 'wheeze') {
        // Musical high-pitch expiratory wheeze sweep
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.type = 'sine';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(340, now);
        osc1.frequency.linearRampToValueAtTime(420, now + 0.7);
        osc1.frequency.linearRampToValueAtTime(320, now + 1.2);

        osc2.frequency.setValueAtTime(480, now);
        osc2.frequency.linearRampToValueAtTime(520, now + 0.7);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.35);
        osc2.stop(now + 1.35);
      } else if (scenario === 'stridor') {
        // High-pitched monophonic continuous crowing inspiratory tone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(490, now);
        osc.frequency.linearRampToValueAtTime(540, now + 0.5);
        osc.frequency.linearRampToValueAtTime(470, now + 1.0);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.14, now + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.15);
      } else if (scenario === 'crackles_rales') {
        // Discontinuous fine alveolar popping clicks
        for (let i = 0; i < 9; i++) {
          const t = now + 0.1 + Math.random() * 0.7;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(200 + Math.random() * 250, t);
          gain.gain.setValueAtTime(0.15, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.015);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.02);
        }
      } else if (scenario === 'dry_cough') {
        // Sharp single dry crack
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.14);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (scenario === 'wet_cough') {
        // Multi-peaked rattling burst
        for (let j = 0; j < 3; j++) {
          const t = now + j * 0.08;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(90 + Math.random() * 50, t);
          gain.gain.setValueAtTime(0.18, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.1);
        }
      } else {
        // Gentle tidal breathing airflow
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.06, now + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.95);
      }
    } catch (e) {
      console.warn('Scenario audio error:', e);
    }
  }

  speakResult(result: AnalysisResult, lang: SupportedLanguage = 'en') {
    if (!this.synth) return;

    this.stopSpeaking();

    let textToSpeak = '';
    let voiceLang = 'en-US';

    if (lang === 'hi') {
      voiceLang = 'hi-IN';
      const triageStr =
        result.overallTriage === 'MEDICAL_HELP_NEEDED'
          ? 'चेतावनी: डॉक्टर की तुरंत सहायता चाहिए।'
          : result.overallTriage === 'MONITOR_RETEST'
          ? 'निगरानी रखें और दोबारा जांचें।'
          : 'डॉक्टर सहायता की आवश्यकता नहीं है। श्वसन सामान्य है।';
      textToSpeak = `${triageStr} सांस की गति ${result.features.breathingRate} प्रति मिनट है। खांसी की संख्या ${result.features.coughCount} दर्ज की गई है। ${result.plainExplanation}`;
    } else if (lang === 'bn') {
      voiceLang = 'bn-IN';
      const triageStr =
        result.overallTriage === 'MEDICAL_HELP_NEEDED'
          ? 'সতর্কতা: অবিলম্বে ডাক্তারি সাহায্য প্রয়োজন।'
          : result.overallTriage === 'MONITOR_RETEST'
          ? 'নজর রাখুন ও পুনরায় পরীক্ষা করুন।'
          : 'ডাক্তারি সাহায্য প্রয়োজন নেই। শ্বাস-প্রশ্বাস স্বাভাবিক।';
      textToSpeak = `${triageStr} শ্বাস-প্রশ্বাসের হার প্রতি মিনিটে ${result.features.breathingRate}। কাশির সংখ্যা ${result.features.coughCount}। ${result.plainExplanation}`;
    } else {
      voiceLang = 'en-US';
      const triageStr =
        result.overallTriage === 'MEDICAL_HELP_NEEDED'
          ? 'Warning: Medical help needed.'
          : result.overallTriage === 'MONITOR_RETEST'
          ? 'Monitor and re-test in 24 hours.'
          : 'Medical help not needed. Normal respiratory pattern.';
      textToSpeak = `${triageStr} Breathing rate is ${result.features.breathingRate} breaths per minute. Detected ${result.features.coughCount} cough events. ${result.plainExplanation}`;
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = voiceLang;
    utterance.rate = 0.95;

    const voices = this.synth.getVoices();
    const matchingVoice = voices.find((v) => v.lang.startsWith(voiceLang.split('-')[0]));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onend = () => {
      this.isSpeaking = false;
    };
    utterance.onerror = () => {
      this.isSpeaking = false;
    };

    this.isSpeaking = true;
    this.synth.speak(utterance);
  }

  speakText(text: string, lang: SupportedLanguage = 'en') {
    if (!this.synth || !text.trim()) return;
    this.stopSpeaking();

    const voiceLang = lang === 'hi' ? 'hi-IN' : lang === 'bn' ? 'bn-IN' : 'en-US';
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceLang;
    utterance.rate = 0.96;

    const voices = this.synth.getVoices();
    const matchingVoice = voices.find((v) => v.lang.startsWith(voiceLang.split('-')[0]));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onend = () => {
      this.isSpeaking = false;
    };
    utterance.onerror = () => {
      this.isSpeaking = false;
    };

    this.isSpeaking = true;
    this.synth.speak(utterance);
  }

  stopSpeaking() {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
    }
  }

  getSpeakingStatus(): boolean {
    return this.isSpeaking;
  }
}

export const audioSpeech = new AudioSpeechService();
