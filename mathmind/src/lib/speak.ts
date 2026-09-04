// Shared read-aloud + captions. One place calls expo-speech so we never double-speak.
// Milo animates his mouth off `onTalking`; a global caption bar shows the spoken text off
// `onCaption`. Both respect the user's accessibility settings (read-aloud on/off).

import * as Speech from 'expo-speech';

import { useStore } from './store';

type TalkListener = (talking: boolean) => void;
type CaptionListener = (text: string, talking: boolean) => void;

const talkListeners = new Set<TalkListener>();
const captionListeners = new Set<CaptionListener>();

function emitTalk(talking: boolean) {
  talkListeners.forEach((l) => l(talking));
}
function emitCaption(text: string, talking: boolean) {
  captionListeners.forEach((l) => l(text, talking));
}

/** Subscribe to speaking state (Milo's mouth moves while true). Returns an unsubscribe. */
export function onTalking(cb: TalkListener): () => void {
  talkListeners.add(cb);
  return () => {
    talkListeners.delete(cb);
  };
}

/** Subscribe to caption text + speaking state (for the on-screen subtitle bar). */
export function onCaption(cb: CaptionListener): () => void {
  captionListeners.add(cb);
  return () => {
    captionListeners.delete(cb);
  };
}

/**
 * Speak a line (if read-aloud is on) and surface it as a caption. When read-aloud is off
 * we skip audio but still show the caption for a readable beat, so subtitles work either
 * way for low-audio / accessibility contexts.
 */
export function speak(text: string) {
  Speech.stop();
  if (!text) return;
  const { readAloud } = useStore.getState().settings;

  emitTalk(true);
  emitCaption(text, true);

  const done = () => {
    emitTalk(false);
    emitCaption(text, false);
  };

  if (readAloud) {
    Speech.speak(text, {
      rate: 0.95,
      pitch: 1.15,
      onDone: done,
      onStopped: done,
      onError: done,
    });
  } else {
    // No audio — hold the caption for a readable moment, then clear.
    setTimeout(done, Math.min(6000, 1400 + text.length * 45));
  }
}

/** Stop any current speech and settle the mouth + caption. */
export function stopSpeaking() {
  Speech.stop();
  emitTalk(false);
  emitCaption('', false);
}
