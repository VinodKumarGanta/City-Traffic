/**
 * Real-Time Audio & Voice Alert Synthesizer Service
 * Uses native Web Audio API (procedural frequency synthesis - zero mp3/external file dependency)
 * and Web SpeechSynthesis API for hands-free traffic operator voice announcements.
 */

class AudioAlertService {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isVoiceEnabled: boolean = true;
  private volume: number = 0.5;
  private listeners: Array<() => void> = [];

  constructor() {
    // Restore sound preference from localStorage if available
    const savedMute = localStorage.getItem('city_traffic_audio_muted');
    if (savedMute !== null) {
      this.isMuted = savedMute === 'true';
    } else {
      // Default to unmuted so user can experience the audio feedback
      this.isMuted = false;
    }

    const savedVoice = localStorage.getItem('city_traffic_voice_enabled');
    if (savedVoice !== null) {
      this.isVoiceEnabled = savedVoice === 'true';
    }
  }

  private initAudioContext(): AudioContext | null {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private notify() {
    this.listeners.forEach(cb => cb());
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem('city_traffic_audio_muted', String(this.isMuted));
    this.notify();
    if (!this.isMuted) {
      this.playChime();
    }
    return this.isMuted;
  }

  public getVoiceEnabled(): boolean {
    return this.isVoiceEnabled;
  }

  public toggleVoice(): boolean {
    this.isVoiceEnabled = !this.isVoiceEnabled;
    localStorage.setItem('city_traffic_voice_enabled', String(this.isVoiceEnabled));
    this.notify();
    return this.isVoiceEnabled;
  }

  /**
   * Play a pleasant harmonic chime (e.g. for normal ANPR pass or successful actions)
   */
  public playChime() {
    if (this.isMuted) return;
    try {
      const ctx = this.initAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2 * this.volume, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    } catch {
      // Audio autoplay policy catch
    }
  }

  /**
   * Play a double warning pulse (e.g. for speeding alerts or congestion)
   */
  public playWarning() {
    if (this.isMuted) return;
    try {
      const ctx = this.initAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      [0, 0.12].forEach(offset => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(720, now + offset);

        gain.gain.setValueAtTime(0, now + offset);
        gain.gain.linearRampToValueAtTime(0.25 * this.volume, now + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.09);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.1);
      });
    } catch {
      // Autoplay catch
    }
  }

  /**
   * Play an emergency sweeping siren (e.g. for stolen/cloned vehicle or Green Corridor dispatch)
   */
  public playEmergencySiren() {
    if (this.isMuted) return;
    try {
      const ctx = this.initAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      // Siren sweep up and down
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.linearRampToValueAtTime(1100, now + 0.25);
      osc.frequency.linearRampToValueAtTime(650, now + 0.5);
      osc.frequency.linearRampToValueAtTime(1100, now + 0.75);
      osc.frequency.linearRampToValueAtTime(650, now + 1.0);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.25 * this.volume, now + 0.1);
      gain.gain.setValueAtTime(0.25 * this.volume, now + 0.85);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 1.1);
    } catch {
      // Autoplay catch
    }
  }

  /**
   * Text-to-speech announcement for critical events
   */
  public speakAlert(text: string) {
    if (this.isMuted || !this.isVoiceEnabled) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      // Cancel previous utterances so notifications don't pile up
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = this.volume;

      // Select an English voice if available
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
      if (englishVoice) {
        utterance.voice = englishVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      // Speech synthesis error catch
    }
  }
}

export const audioAlertService = new AudioAlertService();
