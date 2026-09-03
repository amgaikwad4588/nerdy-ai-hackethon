// Shared read-aloud. One place calls expo-speech so we never double-speak, and Milo
// the buddy can animate his mouth for *any* spoken line by subscribing to `onTalking`.

import * as Speech from 'expo-speech';

type TalkListener = (talking: boolean) => void;
const listeners = new Set<TalkListener>();

function emit(talking: boolean) {
  listeners.forEach((l) => l(talking));
}

/** Subscribe to speaking state (Milo's mouth moves while true). Returns an unsubscribe. */
export function onTalking(cb: TalkListener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Speak a line in Milo's friendly, slightly-higher voice. Stops any prior line. */
export function speak(text: string) {
  Speech.stop();
  if (!text) return;
  emit(true);
  Speech.speak(text, {
    rate: 0.95,
    pitch: 1.15,
    onDone: () => emit(false),
    onStopped: () => emit(false),
    onError: () => emit(false),
  });
}

/** Stop any current speech and settle the mouth. */
export function stopSpeaking() {
  Speech.stop();
  emit(false);
}
