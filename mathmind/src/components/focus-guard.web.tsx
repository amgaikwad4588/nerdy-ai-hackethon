// Focus Guard (web) — enroll a photo, then random spot-checks during study.
//
// Flow:
//   1. Turn on camera. A live preview shows an alignment oval; we detect the face
//      live and only enable "Capture my photo" once it's a single, centered,
//      close-enough face.
//   2. That photo becomes the reference (we store its face descriptor + thumbnail).
//   3. While studying, the camera silently snaps a photo at RANDOM intervals and an
//      on-device model compares the two faces (euclidean distance between 128-d
//      descriptors). Each check reports: on task, no one there, a stranger, or more
//      than one person.
//
// Privacy by design: everything runs in the browser via @vladmandic/face-api +
// getUserMedia. No frame, photo, or descriptor ever leaves the device or is uploaded.
// Strictly opt-in.
//
// DOM objects are typed loosely (`any`) so this compiles under the app's RN tsconfig;
// this file only ever runs on web.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { BigButton } from '@/components/big-button';
import { SketchSurface } from '@/components/sketch';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing, Wobbly } from '@/constants/theme';
import { useStore } from '@/lib/store';

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
const MATCH_THRESHOLD = 0.55; // lower = stricter identity match
const CHECK_MIN_MS = 4000; // random spot-check window
const CHECK_MAX_MS = 12000;
const ALIGN_MS = 500;

type Status = 'ok' | 'away' | 'stranger' | 'multiple';
type Phase = 'off' | 'starting' | 'align' | 'watching' | 'error';

const g: any = globalThis;

const STATUS_UI: Record<Status, { color: string; short: string; label: string }> = {
  ok: { color: Brand.blue, short: 'On task', label: 'Just you — great focus!' },
  away: { color: Brand.gentle, short: 'Away', label: 'Nobody at the screen — come back and keep going.' },
  stranger: { color: Brand.accent, short: 'Check in', label: 'That doesn’t look like you. Everything ok?' },
  multiple: { color: Brand.accent, short: 'Check in', label: 'Looks like more than one person is here.' },
};

export function FocusGuard({ studentName, compact = false }: { studentName: string; compact?: boolean }) {
  const setScoreEligible = useStore((s) => s.setScoreEligible);
  const stageRef = useRef<any>(null); // RNW View -> DOM node we append <video> to
  const videoRef = useRef<any>(null);
  const streamRef = useRef<any>(null);
  const faceapiRef = useRef<any>(null);
  const enrolledRef = useRef<any>(null);
  const alignTimer = useRef<any>(null);
  const checkTimer = useRef<any>(null);
  const mounted = useRef(true);

  const [phase, setPhase] = useState<Phase>('off');
  const [status, setStatus] = useState<Status | null>(null);
  const [enrolledPhoto, setEnrolledPhoto] = useState<string | null>(null);
  const [lastShot, setLastShot] = useState<{ uri: string; status: Status } | null>(null);
  const [alignHint, setAlignHint] = useState('Getting the camera ready…');
  const [canCapture, setCanCapture] = useState(false);
  const [error, setError] = useState('');

  const clearTimers = useCallback(() => {
    if (alignTimer.current) clearInterval(alignTimer.current);
    if (checkTimer.current) clearTimeout(checkTimer.current);
    alignTimer.current = null;
    checkTimer.current = null;
  }, []);

  const stopEverything = useCallback(() => {
    clearTimers();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t: any) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.remove?.();
      videoRef.current = null;
    }
  }, [clearTimers]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stopEverything();
      setScoreEligible(false);
    };
  }, [stopEverything, setScoreEligible]);

  const opts = () => new faceapiRef.current.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });

  // Draw the current (mirrored) frame to a canvas so the snapshot matches the preview.
  function snapshot(): any {
    const v = videoRef.current;
    const canvas = g.document.createElement('canvas');
    canvas.width = v.videoWidth || 320;
    canvas.height = v.videoHeight || 240;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  async function enable() {
    try {
      setError('');
      setStatus(null);
      setLastShot(null);
      setEnrolledPhoto(null);
      setCanCapture(false);
      setAlignHint('Getting the camera ready…');
      setPhase('starting');

      const stream = await g.navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      if (!mounted.current) return stream.getTracks().forEach((t: any) => t.stop());
      streamRef.current = stream;

      const video = g.document.createElement('video');
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.objectFit = 'cover';
      video.style.transform = 'scaleX(-1)';
      video.style.display = 'block';
      video.srcObject = stream;
      stageRef.current?.appendChild(video);
      videoRef.current = video;
      await video.play?.().catch(() => {});

      const faceapi =
        faceapiRef.current ??
        // @ts-ignore — browser ESM build; the default entry pulls in the Node TF backend.
        (await import('@vladmandic/face-api/dist/face-api.esm.js'));
      faceapiRef.current = faceapi;
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      if (!mounted.current) return;

      setPhase('align');
      alignTimer.current = setInterval(runAlign, ALIGN_MS);
    } catch (e) {
      if (!mounted.current) return;
      setError(friendlyError(e));
      setPhase('error');
      stopEverything();
      setScoreEligible(false);
    }
  }

  // Live guidance so the enrollment photo is well framed.
  async function runAlign() {
    const faceapi = faceapiRef.current;
    const v = videoRef.current;
    if (!faceapi || !v || !v.videoWidth) return;
    try {
      const faces = await faceapi.detectAllFaces(v, opts());
      if (faces.length === 0) {
        setCanCapture(false);
        return setAlignHint('Come into the frame so I can see your face.');
      }
      if (faces.length > 1) {
        setCanCapture(false);
        return setAlignHint('Just you for this photo — ask others to step out.');
      }
      const box = faces[0].box;
      const ratio = box.width / v.videoWidth;
      const cx = (box.x + box.width / 2) / v.videoWidth;
      if (ratio < 0.24) {
        setCanCapture(false);
        return setAlignHint('Move a little closer to the camera.');
      }
      if (cx < 0.32 || cx > 0.68) {
        setCanCapture(false);
        return setAlignHint('Center your face in the circle.');
      }
      setCanCapture(true);
      setAlignHint('Perfect — hold still and capture.');
    } catch {
      /* transient */
    }
  }

  async function capture() {
    try {
      const faceapi = faceapiRef.current;
      const canvas = snapshot();
      const res = await faceapi
        .detectSingleFace(canvas, opts())
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (!res) {
        setError('Could not read your face — line up again and retry.');
        return;
      }
      enrolledRef.current = res.descriptor;
      setEnrolledPhoto(canvas.toDataURL('image/jpeg', 0.7));
      setError('');
      if (alignTimer.current) clearInterval(alignTimer.current);
      alignTimer.current = null;
      setPhase('watching');
      setScoreEligible(true); // camera on during study → you're on the scoreboard
      scheduleCheck(1500); // first spot-check soon after enrolling
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  function scheduleCheck(delay?: number) {
    const wait = delay ?? CHECK_MIN_MS + Math.random() * (CHECK_MAX_MS - CHECK_MIN_MS);
    checkTimer.current = setTimeout(runCheck, wait);
  }

  // A random spot-check: snap a photo and compare it to the enrolled face.
  async function runCheck() {
    const faceapi = faceapiRef.current;
    if (!faceapi || !videoRef.current || !enrolledRef.current || !mounted.current) return;
    try {
      const canvas = snapshot();
      const results = await faceapi
        .detectAllFaces(canvas, opts())
        .withFaceLandmarks()
        .withFaceDescriptors();

      let next: Status;
      if (results.length === 0) next = 'away';
      else if (results.length > 1) next = 'multiple';
      else {
        const dist = faceapi.euclideanDistance(enrolledRef.current, results[0].descriptor);
        next = dist < MATCH_THRESHOLD ? 'ok' : 'stranger';
      }
      if (!mounted.current) return;
      setStatus(next);
      setLastShot({ uri: canvas.toDataURL('image/jpeg', 0.6), status: next });
    } catch {
      /* keep last status */
    } finally {
      if (mounted.current) scheduleCheck();
    }
  }

  function disable() {
    stopEverything();
    enrolledRef.current = null;
    setStatus(null);
    setLastShot(null);
    setEnrolledPhoto(null);
    setError('');
    setPhase('off');
    setScoreEligible(false);
  }

  const active = phase === 'align' || phase === 'watching' || phase === 'starting';
  const s = status ? STATUS_UI[status] : null;

  return (
    <SketchSurface radius="md" shadow={3} style={{ gap: Spacing.two }}>
      <View style={styles.headerRow}>
        <ThemedText type="smallBold">FOCUS GUARD</ThemedText>
        {phase === 'watching' && s && (
          <View style={[styles.pill, { backgroundColor: s.color }]}>
            <ThemedText type="smallBold" color="#fff">{s.short}</ThemedText>
          </View>
        )}
      </View>

      {/* Live camera stage with alignment oval (video appended imperatively) */}
      {active && (
        <View style={[styles.stage, compact && styles.stageCompact]}>
          <View ref={stageRef} style={StyleSheet.absoluteFill} />
          {phase === 'align' && (
            <View pointerEvents="none" style={styles.guideWrap}>
              <View
                style={[
                  styles.guideOval,
                  { borderColor: canCapture ? Brand.blue : 'rgba(253,251,247,0.85)' },
                ]}
              />
            </View>
          )}
        </View>
      )}

      {phase === 'off' && (
        <>
          <ThemedText type="small" color={Brand.muted}>
            Take one photo of {studentName}, then the camera quietly checks a few random
            snapshots while you study. Runs on this device only — nothing is uploaded.
          </ThemedText>
          <View style={[styles.optInNote, { borderColor: Brand.blue }]}>
            <ThemedText type="small" color={Brand.ink}>
              Turn the camera on and your points count on the class scoreboard. Prefer not
              to? You can still study and play — you just won&apos;t be ranked.
            </ThemedText>
          </View>
          <BigButton label="Turn on camera + join scoreboard" variant="primary" onPress={enable} />
        </>
      )}

      {phase === 'starting' && (
        <ThemedText type="small" color={Brand.muted}>
          Starting camera and loading the on-device model…
        </ThemedText>
      )}

      {phase === 'align' && (
        <>
          <ThemedText type="small" color={canCapture ? Brand.blue : Brand.muted} style={styles.center}>
            {alignHint}
          </ThemedText>
          {!!error && (
            <ThemedText type="small" color={Brand.accent} style={styles.center}>
              {error}
            </ThemedText>
          )}
          <View style={styles.btnRow}>
            <BigButton
              label="Capture my photo"
              variant="primary"
              disabled={!canCapture}
              onPress={capture}
              style={{ flex: 1 }}
            />
            <BigButton label="Turn off" variant="ghost" tint={Brand.muted} onPress={disable} />
          </View>
        </>
      )}

      {phase === 'watching' && s && (
        <>
          <View style={styles.thumbRow}>
            {enrolledPhoto && (
              <View style={styles.thumbBox}>
                <Image source={{ uri: enrolledPhoto }} style={[styles.thumb, compact && styles.thumbCompact, { borderColor: Brand.ink }]} />
                <ThemedText type="small" color={Brand.muted}>Enrolled</ThemedText>
              </View>
            )}
            <View style={styles.thumbBox}>
              {lastShot ? (
                <Image source={{ uri: lastShot.uri }} style={[styles.thumb, compact && styles.thumbCompact, { borderColor: s.color }]} />
              ) : (
                <View style={[styles.thumb, compact && styles.thumbCompact, styles.thumbEmpty]}>
                  <ThemedText type="small" color={Brand.muted}>…</ThemedText>
                </View>
              )}
              <ThemedText type="small" color={Brand.muted}>Last check</ThemedText>
            </View>
          </View>

          <View style={[styles.banner, { borderColor: s.color, backgroundColor: status === 'ok' ? Brand.card : Brand.postit }]}>
            <ThemedText color={status === 'ok' ? Brand.blue : Brand.ink}>{s.label}</ThemedText>
          </View>
          <ThemedText type="small" color={Brand.muted} style={styles.center}>
            The camera snaps a photo at random moments to check it&apos;s still you.
          </ThemedText>
          <BigButton label="Turn off Focus Guard" variant="ghost" tint={Brand.muted} onPress={disable} />
        </>
      )}

      {phase === 'error' && (
        <>
          <ThemedText type="small" color={Brand.accent}>{error || 'Camera unavailable.'}</ThemedText>
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

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: { paddingHorizontal: Spacing.two, paddingVertical: 3, ...Wobbly.sm },
  stage: {
    height: 210,
    backgroundColor: '#00000010',
    borderWidth: 2,
    borderColor: Brand.ink,
    overflow: 'hidden',
    ...Wobbly.md,
  },
  stageCompact: { height: 132 },
  guideWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideOval: {
    width: '52%',
    height: '82%',
    borderWidth: 3,
    borderStyle: 'dashed',
    borderRadius: 140,
  },
  center: { textAlign: 'center' },
  optInNote: { borderWidth: 2, backgroundColor: Brand.postit, padding: Spacing.two, ...Wobbly.sm },
  btnRow: { flexDirection: 'row', gap: Spacing.two },
  thumbRow: { flexDirection: 'row', gap: Spacing.three, justifyContent: 'center' },
  thumbBox: { alignItems: 'center', gap: 4 },
  thumb: { width: 96, height: 72, borderWidth: 3, ...Wobbly.sm },
  thumbCompact: { width: 66, height: 50, borderWidth: 2 },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.erased, borderColor: Brand.ink },
  banner: { borderWidth: 3, padding: Spacing.three, ...Wobbly.md },
});
