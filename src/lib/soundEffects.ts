export type SoundEventType = "prep" | "countdown" | "start" | "finish";

// In-memory audio elements cache for zero-latency playback
const audioCache: Record<string, HTMLAudioElement> = {};

// Keep track of any currently active Audio elements or synth timers
let currentAudio: HTMLAudioElement | null = null;
let currentSynthTimer: any = null;

export function playSound(
  type: SoundEventType,
  customUrl?: string,
  volume: number = 0.8,
  loop: boolean = false,
  onEnd?: () => void
): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;

  const actualLoop = loop;

  // 1. If custom audio URL is provided, try playing it
  if (customUrl && customUrl.trim() !== "") {
    try {
      if (!audioCache[customUrl]) {
        audioCache[customUrl] = new Audio(customUrl);
      }
      const audio = audioCache[customUrl];
      audio.volume = Math.max(0, Math.min(1, volume));
      audio.loop = actualLoop;
      try {
        audio.currentTime = 0;
      } catch {}

      // Handle onended: if loop is true, guarantee it rewinds and replays
      audio.onended = () => {
        if (actualLoop) {
          audio.currentTime = 0;
          audio.play().catch(() => {});
        } else {
          if (currentAudio === audio) {
            currentAudio = null;
          }
          if (onEnd) onEnd();
        }
      };

      currentAudio = audio;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // If custom audio fails (e.g. autoplay restriction or missing file), fallback to synthesizer
          playSynthesizedSound(type, volume, actualLoop, onEnd);
        });
      }
      return audio;
    } catch {
      // Fallback
    }
  }

  // 2. Play high quality synthesized Web Audio API sound
  playSynthesizedSound(type, volume, actualLoop, onEnd);
  return null;
}

export function stopSound(customUrl?: string) {
  if (typeof window === "undefined") return;
  if (customUrl && audioCache[customUrl]) {
    try {
      const audio = audioCache[customUrl];
      audio.pause();
      try { audio.currentTime = 0; } catch {}
      audio.loop = false;
      audio.onended = null;
    } catch {}
  }
  if (currentAudio && audioCache[customUrl || ""] === currentAudio) {
    currentAudio = null;
  }
  if (currentSynthTimer) {
    clearTimeout(currentSynthTimer);
    currentSynthTimer = null;
  }
}

export function stopAllSounds() {
  if (typeof window === "undefined") return;
  Object.values(audioCache).forEach((audio) => {
    try {
      audio.pause();
      try { audio.currentTime = 0; } catch {}
      audio.loop = false;
      audio.onended = null;
    } catch {}
  });
  currentAudio = null;
  if (currentSynthTimer) {
    clearTimeout(currentSynthTimer);
    currentSynthTimer = null;
  }
}

export function playSynthesizedSound(
  type: SoundEventType,
  volume: number = 0.8,
  loop: boolean = false,
  onEnd?: () => void
) {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const triggerPlay = () => {
      if (type === "prep") {
        // Pleasant dual-tone announcement chime (C5 -> G5)
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(523.25, now);
        gain1.gain.setValueAtTime(volume * 0.35, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc1.start(now);
        osc1.stop(now + 0.35);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(783.99, now + 0.18);
        gain2.gain.setValueAtTime(volume * 0.4, now + 0.18);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc2.start(now + 0.18);
        osc2.stop(now + 0.6);

        if (loop) {
          currentSynthTimer = setTimeout(triggerPlay, 1000);
        } else if (onEnd) {
          setTimeout(onEnd, 700);
        }
      } else if (type === "countdown") {
        // Crisp 880 Hz metronome countdown beep (for 3, 2, 1)
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(volume * 0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);

        if (loop) {
          currentSynthTimer = setTimeout(triggerPlay, 1000);
        } else if (onEnd) {
          setTimeout(onEnd, 250);
        }
      } else if (type === "start") {
        // Powerful ascending arena start buzzer
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
        gain.gain.setValueAtTime(volume * 0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
        osc.start(now);
        osc.stop(now + 0.7);

        if (loop) {
          currentSynthTimer = setTimeout(triggerPlay, 1000);
        } else {
          // Bersihkan dan tutup audio context setelah suara selesai
          setTimeout(() => {
            try {
              ctx.close();
            } catch {}
            if (onEnd) onEnd();
          }, 750);
        }
      } else if (type === "finish") {
        // Deep heavy stadium buzzer horn (220 Hz low saw blast)
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, now);
        gain.gain.setValueAtTime(volume * 0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
        osc.start(now);
        osc.stop(now + 1.4);

        if (loop) {
          currentSynthTimer = setTimeout(triggerPlay, 2000);
        } else if (onEnd) {
          setTimeout(onEnd, 1500);
        }
      }
    };

    triggerPlay();
  } catch {
    // Autoplay restrictions or unavailable audio context
  }
}

