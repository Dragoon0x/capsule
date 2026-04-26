/**
 * Web Speech Recognition lifecycle with auto-restart to cope with Chrome's
 * ~60-second implicit cutoff and spurious `onend` on silence.
 *
 * Emits typed events so consumers can subscribe without touching the raw API.
 */

import { CapsuleError } from '../../lib/errors';
import { detectCapabilities } from '../capabilities/detect';

// --- Ambient types: Web Speech is not in lib.dom for TS without help. ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySpeech = any;

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string; confidence: number };
}
interface SpeechRecognitionResultListLike {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}

export interface VoiceEvent {
  interim: string;
  final: string;
  /** concatenation of all finals so far, in order */
  transcript: string;
  /** audio level 0..1 (best-effort; may be 0 if analyser not available) */
  level: number;
}

export interface VoiceSessionOptions {
  lang?: string | null;
  onEvent: (ev: VoiceEvent) => void;
  onError: (err: CapsuleError) => void;
  onEnd: () => void;
}

export interface VoiceSession {
  readonly running: boolean;
  stop: () => void;
}

function getCtor(): AnySpeech {
  if (typeof window === 'undefined') return null;
  const w = window as AnySpeech;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function isVoiceSupported(): boolean {
  return detectCapabilities().webSpeech;
}

/**
 * Start a new recognition session. Caller must call `.stop()` to end.
 * Handles auto-restart internally; surfaces errors to `onError` and then ends.
 */
export async function startVoiceSession(opts: VoiceSessionOptions): Promise<VoiceSession> {
  const Ctor = getCtor();
  if (!Ctor) {
    throw new CapsuleError(
      'VOICE_UNSUPPORTED',
      'Speech recognition is not supported in this browser.',
    );
  }

  // Request mic permission up front by starting (and stopping) a silent stream.
  // This gives the user a permission prompt at the moment they expect it.
  let micStream: MediaStream | null = null;
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    throw new CapsuleError('VOICE_PERMISSION_DENIED', 'Microphone access was denied.', e);
  }

  // Hook up a level meter
  const audioCtx = new AudioContext();
  const source = audioCtx.createMediaStreamSource(micStream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);
  const data = new Uint8Array(analyser.frequencyBinCount);

  let level = 0;
  let levelRaf = 0;
  const sampleLevel = (): void => {
    analyser.getByteTimeDomainData(data);
    // Compute peak deviation from 128 midpoint.
    let peak = 0;
    for (let i = 0; i < data.length; i += 1) {
      const d = Math.abs((data[i] ?? 128) - 128);
      if (d > peak) peak = d;
    }
    level = Math.min(1, peak / 128);
    levelRaf = requestAnimationFrame(sampleLevel);
  };
  levelRaf = requestAnimationFrame(sampleLevel);

  let running = true;
  let finalAccum = '';
  let stopping = false;

  const recognition = new Ctor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = opts.lang ?? navigator.language ?? 'en-US';

  function attachHandlers(r: AnySpeech): void {
    r.onresult = (ev: SpeechRecognitionEventLike) => {
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
        const res = ev.results[i];
        if (!res) continue;
        const text = res[0]?.transcript ?? '';
        if (res.isFinal) {
          finalAccum += (finalAccum && !finalAccum.endsWith(' ') ? ' ' : '') + text.trim();
        } else {
          interim += text;
        }
      }
      opts.onEvent({
        interim: interim.trim(),
        final: finalAccum,
        transcript: finalAccum + (interim ? ' ' + interim.trim() : ''),
        level,
      });
    };

    r.onerror = (ev: { error: string; message?: string }) => {
      if (ev.error === 'no-speech' || ev.error === 'aborted') return; // benign
      const msg =
        ev.error === 'not-allowed'
          ? 'Microphone access was denied.'
          : ev.error === 'audio-capture'
            ? 'No microphone was found.'
            : `Speech recognition error: ${ev.error}`;
      opts.onError(
        new CapsuleError(
          ev.error === 'not-allowed' ? 'VOICE_PERMISSION_DENIED' : 'VOICE_UNSUPPORTED',
          msg,
        ),
      );
    };

    r.onend = () => {
      if (stopping) {
        cleanup();
        return;
      }
      // Chrome cuts off around 60s; auto-restart transparently.
      try {
        r.start();
      } catch {
        cleanup();
      }
    };
  }

  attachHandlers(recognition);

  try {
    recognition.start();
  } catch (e) {
    cleanup();
    throw new CapsuleError('VOICE_UNSUPPORTED', 'Failed to start speech recognition.', e);
  }

  function cleanup(): void {
    if (!running) return;
    running = false;
    try {
      cancelAnimationFrame(levelRaf);
    } catch {
      /* noop */
    }
    try {
      analyser.disconnect();
      source.disconnect();
    } catch {
      /* noop */
    }
    try {
      micStream?.getTracks().forEach((t) => t.stop());
    } catch {
      /* noop */
    }
    void audioCtx.close().catch(() => undefined);
    opts.onEnd();
  }

  function stop(): void {
    stopping = true;
    try {
      recognition.stop();
    } catch {
      cleanup();
    }
  }

  return {
    get running(): boolean {
      return running;
    },
    stop,
  };
}
