// Shared read-aloud + captions. One place calls TTS so we never double-speak. Milo
// animates his mouth off `onTalking`; a global caption bar shows the text off `onCaption`.
//
// Voice: if an ElevenLabs key is set (EXPO_PUBLIC_ELEVENLABS_API_KEY) we synthesize a
// natural voice on web; otherwise (or on any failure) we fall back to the device TTS
// (expo-speech). Everything respects the user's read-aloud / captions settings.

import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

import { useStore } from './store';

const IS_WEB = Platform.OS === 'web';
const ELEVEN_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY;
// Default to a warm, friendly preset voice; override with EXPO_PUBLIC_ELEVENLABS_VOICE_ID.
const ELEVEN_VOICE = process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
const ELEVEN_MODEL = process.env.EXPO_PUBLIC_ELEVENLABS_MODEL || 'eleven_flash_v2_5';
export const elevenConfigured = Boolean(ELEVEN_KEY) && IS_WEB;

type TalkListener = (talking: boolean) => void;
type CaptionListener = (text: string, talking: boolean) => void;

const talkListeners = new Set<TalkListener>();
const captionListeners = new Set<CaptionListener>();

const emitTalk = (t: boolean) => talkListeners.forEach((l) => l(t));
const emitCaption = (text: string, t: boolean) => captionListeners.forEach((l) => l(text, t));

/** Subscribe to speaking state (Milo's mouth moves while true). Returns an unsubscribe. */
export function onTalking(cb: TalkListener): () => void {
  talkListeners.add(cb);
  return () => void talkListeners.delete(cb);
}

/** Subscribe to caption text + speaking state (for the subtitle bar). */
export function onCaption(cb: CaptionListener): () => void {
  captionListeners.add(cb);
  return () => void captionListeners.delete(cb);
}

// --- ElevenLabs (web) --------------------------------------------------------
let currentAudio: any = null;
const g: any = globalThis;

function stopEleven() {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.src = '';
    } catch {
      /* noop */
    }
    currentAudio = null;
  }
}

/** Returns true if playback started (then `done` fires on 'ended'); false to fall back. */
async function speakEleven(text: string, done: () => void): Promise<boolean> {
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: { 'xi-api-key': ELEVEN_KEY as string, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          model_id: ELEVEN_MODEL,
          voice_settings: { stability: 0.4, similarity_boost: 0.8, style: 0.2 },
        }),
      },
    );
    if (!res.ok) return false;
    const blob = await res.blob();
    const url = g.URL.createObjectURL(blob);
    const audio = new g.Audio(url);
    currentAudio = audio;
    audio.onended = () => {
      g.URL.revokeObjectURL(url);
      if (currentAudio === audio) currentAudio = null;
      done();
    };
    audio.onerror = () => done();
    await audio.play();
    return true;
  } catch {
    return false;
  }
}

function deviceSpeak(text: string, done: () => void) {
  Speech.speak(text, { rate: 0.95, pitch: 1.15, onDone: done, onStopped: done, onError: done });
}

/**
 * Speak a line (if read-aloud is on) and surface it as a caption. Prefers ElevenLabs on
 * web, falls back to device TTS. When read-aloud is off we still show the caption.
 */
export function speak(text: string) {
  Speech.stop();
  stopEleven();
  if (!text) return;
  const { readAloud } = useStore.getState().settings;

  emitTalk(true);
  emitCaption(text, true);

  let finished = false;
  const done = () => {
    if (finished) return;
    finished = true;
    emitTalk(false);
    emitCaption(text, false);
  };

  if (!readAloud) {
    setTimeout(done, Math.min(6000, 1400 + text.length * 45));
    return;
  }

  if (elevenConfigured) {
    speakEleven(text, done).then((ok) => {
      if (!ok && !finished) deviceSpeak(text, done);
    });
  } else {
    deviceSpeak(text, done);
  }
}

/** Stop any current speech and settle the mouth + caption. */
export function stopSpeaking() {
  Speech.stop();
  stopEleven();
  emitTalk(false);
  emitCaption('', false);
}
