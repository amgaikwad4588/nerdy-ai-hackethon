# MathMind — Roadmap / TODO

Working backlog of features we agreed to build. Games have their own file: see
[GAMES.md](./GAMES.md). Status: `idea` -> `building` -> `done`.

## Games (build one at a time) — see GAMES.md
1. Math Sprint — DONE
2. Highway Car Game — idea (question at bottom, steer car between lanes, dodge
   number/operator obstacles `+2 -7 x7`, drive into the correct answer)
3. Bird Shooter (gun game) — idea (birds fly carrying numbers, tap/shoot the one
   holding the correct answer)

## Milo the buddy
- [ ] **Subtitles / captions** for everything Milo says — show the words as he speaks
  (caption bar; stretch: karaoke word-highlight synced to the audio).
- [ ] **More natural voice** (replace robotic device TTS). Plan:
  - Use **ElevenLabs** for Milo's voice.
  - **Pre-generate** audio for the FIXED lines (they're already constant strings):
    greetings, the praise lines, the between-answer nudges, misconception remediations,
    game cheers. -> natural voice, zero latency, works offline in the demo.
  - For dynamic/live-Claude lines: live ElevenLabs TTS if a key is set, else fall back
    to device TTS. Subtitles come from the same text either way.
  - Decision point: prerecorded/pre-generated for demo is fine (see notes below).

## Focus Guard — camera opt-in + scoreboard gating
- [ ] Add a clear **warning / choice before studying**:
  - "Turn on the camera while you learn -> you earn points and can appear on the
    scoreboard/leaderboard."
  - "Prefer not to? You can study normally — no camera, no scoreboard."
  - So the camera is **opt-in**, and **scoreboard eligibility is tied to camera-on**.
  - Wire: a flag in the store (e.g. `cameraConsent` / `scoreEligible`) that the games'
    leaderboard reads; if camera off, the student still plays but isn't ranked.
  - Keep the child-privacy note: on-device only, nothing uploaded.

## Demo polish (later)
- Milo cheers on game-unlock and end-of-game screens.
- Tight 2–3 min demo video: misconception-catch wow moment + teacher data loop.
