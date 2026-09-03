// Focus Guard (web) — on-device presence + identity check during study.
//
// Enroll once ("This is me"), then every few seconds we run face detection on the
// webcam frame and confirm exactly one face is present and it matches the enrolled
// student. Flags: away (no face), stranger (someone else), or more-than-one person.
//
// Privacy by design: everything runs in the browser via @vladmandic/face-api +
// getUserMedia. No frame, image, or descriptor ever leaves the device; nothing is
// uploaded or stored server-side. It is strictly opt-in.
//
// DOM objects are typed loosely (`any`) so this compiles under the app's RN tsconfig
// without pulling in the DOM lib; this file only ever runs on web.

import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { BigButton } from '@/components/big-button';
import { SketchSurface } from '@/components/sketch';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing, Wobbly } from '@/constants/theme';

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
const MATCH_THRESHOLD = 0.55; // lower = stricter identity match
const CHECK_MS = 2500;

type Status = 'ok' | 'away' | 'stranger' | 'multiple';
type Phase = 'off' | 'loading' | 'enroll' | 'watching' | 'error';

const g: any = globalThis;

const STATUS_UI: Record<Status, { color: string; label: string }> = {
  ok: { color: Brand.blue, label: 'Just you — great focus!' },
  away: { color: Brand.gentle, label: 'Can’t see you — come back to the screen.' },
  stranger: { color: Brand.accent, label: 'That doesn’t look like you. Everything ok?' },
  multiple: { color: Brand.accent, label: 'Looks like more than one person is here.' },
};

export function FocusGuard({ studentName }: { studentName: string }) {
  const containerRef = useRef<any>(null); // RNW View -> DOM node we append <video> to
  const videoRef = useRef<any>(null);
  const streamRef = useRef<any>(null);
  const faceapiRef = useRef<any>(null);
  const enrolledRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  const [phase, setPhase] = useState<Phase>('off');
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState('');

  const stopEverything = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t: any) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.remove?.();
      videoRef.current = null;
    }
  }, []);

  useEffect(() => () => stopEverything(), [stopEverything]);

  const detectorOpts = () =>
    new faceapiRef.current.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });

  async function enable() {
    try {
      setError('');
      setStatus(null);
      setPhase('loading');

      // 1. Camera (prompts the browser permission dialog).
      const stream = await g.navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;

      const video = g.document.createElement('video');
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.style.width = '100%';
      video.style.maxHeight = '220px';
      video.style.objectFit = 'cover';
      video.style.borderRadius = '14px';
      video.style.transform = 'scaleX(-1)'; // mirror like a selfie
      video.style.display = 'block';
      video.srcObject = stream;
      containerRef.current?.appendChild(video);
      videoRef.current = video;
      await video.play?.().catch(() => {});

      // 2. Models (tiny detector + landmarks + recognition), loaded on-device.
      // Import the browser ESM build explicitly — the package's default entry pulls in
      // the Node TensorFlow backend, which Metro can't (and shouldn't) resolve for web.
      // @ts-ignore — deep path to the browser bundle; it ships no types at this path.
      const faceapi = faceapiRef.current ?? (await import('@vladmandic/face-api/dist/face-api.esm.js'));
      faceapiRef.current = faceapi;
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);

      setPhase('enroll');
    } catch (e) {
      setError(friendlyError(e));
      setPhase('error');
      stopEverything();
    }
  }

  async function enroll() {
    try {
      const faceapi = faceapiRef.current;
      const res = await faceapi
        .detectSingleFace(videoRef.current, detectorOpts())
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (!res) {
        setError('Center your face in the frame and try again.');
        return;
      }
      enrolledRef.current = res.descriptor;
      setError('');
      setPhase('watching');
      timerRef.current = setInterval(check, CHECK_MS);
      check();
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  async function check() {
    const faceapi = faceapiRef.current;
    if (!faceapi || !videoRef.current || !enrolledRef.current) return;
    try {
      const results = await faceapi
        .detectAllFaces(videoRef.current, detectorOpts())
        .withFaceLandmarks()
        .withFaceDescriptors();
      if (results.length === 0) return setStatus('away');
      if (results.length > 1) return setStatus('multiple');
      const dist = faceapi.euclideanDistance(enrolledRef.current, results[0].descriptor);
      setStatus(dist < MATCH_THRESHOLD ? 'ok' : 'stranger');
    } catch {
      /* transient frame error — keep last status */
    }
  }

  function disable() {
    stopEverything();
    enrolledRef.current = null;
    setStatus(null);
    setError('');
    setPhase('off');
  }

  const active = phase !== 'off';
  const s = status ? STATUS_UI[status] : null;

  return (
    <SketchSurface radius="md" shadow={3} rotate={-0.5} style={{ gap: Spacing.two }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <ThemedText type="smallBold">FOCUS GUARD</ThemedText>
        {phase === 'watching' && s && (
          <View
            style={{
              backgroundColor: s.color,
              paddingHorizontal: Spacing.two,
              paddingVertical: 3,
              ...Wobbly.sm,
            }}
          >
            <ThemedText type="smallBold" color="#fff">
              {status === 'ok' ? 'On task' : 'Check in'}
            </ThemedText>
          </View>
        )}
      </View>

      {/* Camera preview mounts here (DOM <video>) */}
      <View ref={containerRef} style={{ minHeight: active ? 0 : 0 }} />

      {phase === 'off' && (
        <>
          <ThemedText type="small" color={Brand.muted}>
            Turn on the camera to check that it&apos;s just {studentName} studying. Runs
            on your device only — nothing is recorded or uploaded.
          </ThemedText>
          <BigButton label="Turn on Focus Guard" variant="ghost" tint={Brand.ink} onPress={enable} />
        </>
      )}

      {phase === 'loading' && (
        <ThemedText type="small" color={Brand.muted}>
          Starting camera and loading the on-device model…
        </ThemedText>
      )}

      {phase === 'enroll' && (
        <>
          <ThemedText type="small" color={Brand.muted}>
            Look at the camera, {studentName}, then tap to remember your face.
          </ThemedText>
          {!!error && (
            <ThemedText type="small" color={Brand.accent}>
              {error}
            </ThemedText>
          )}
          <View style={{ flexDirection: 'row', gap: Spacing.two }}>
            <BigButton label="This is me" variant="primary" onPress={enroll} style={{ flex: 1 }} />
            <BigButton label="Turn off" variant="ghost" tint={Brand.muted} onPress={disable} />
          </View>
        </>
      )}

      {phase === 'watching' && s && (
        <>
          <View
            style={{
              borderWidth: 3,
              borderColor: s.color,
              backgroundColor: status === 'ok' ? Brand.card : Brand.postit,
              padding: Spacing.three,
              ...Wobbly.md,
            }}
          >
            <ThemedText color={status === 'ok' ? Brand.blue : Brand.ink}>{s.label}</ThemedText>
          </View>
          <BigButton label="Turn off Focus Guard" variant="ghost" tint={Brand.muted} onPress={disable} />
        </>
      )}

      {phase === 'error' && (
        <>
          <ThemedText type="small" color={Brand.accent}>
            {error || 'Camera unavailable.'}
          </ThemedText>
          <BigButton label="Try again" variant="ghost" tint={Brand.ink} onPress={enable} />
        </>
      )}
    </SketchSurface>
  );
}

function friendlyError(e: unknown): string {
  const name = (e as any)?.name ?? '';
  if (name === 'NotAllowedError') return 'Camera permission was blocked. Allow it to use Focus Guard.';
  if (name === 'NotFoundError') return 'No camera found on this device.';
  return 'Could not start the camera or load the model. Check your connection and try again.';
}
