---
name: oak-video-edit
description: Make an Oak Order marketing video the founder's way, with HyperFrames (HTML rendered to MP4): writes the Khmer script and shot list, makes the four voice MP3s with Gemini, turns a film template into a HyperFrames project timed to the real voice (iPhone with the app's screens, a clicking cursor, word-by-word titles, sounds on the exact frame, music), checks and reviews it frame by frame, opens the preview, and renders the MP4 once the founder approves. Use whenever the founder asks for a video, a script, a voice-over, a fix to a video, a render, or says "video 3", "next video", "make the video", "/oak-video-edit". Windows laptop only, not the dev container. (Older CapCut-draft builds are kept as an option.)
---

# Make an Oak Order video

The founder makes short videos for TikTok, Facebook Reels and Instagram Reels,
part-time. Everything happens here in Claude Code: script, voice, edit. Since
2026-11-02 the edit is **HyperFrames** (HeyGen's open-source HTML-to-video
renderer, the founder's pick): Claude Code writes the film, checks it, and
gives the founder a preview link; they watch, ask for changes, approve; Claude
Code renders the MP4; they post it.

Read first: `docs/02_video_playbook.md` (tools, voice recipe, looks, words to
avoid, pronunciation fixes), `docs/MARKETING_FACTS.md` (what's true, section 6
"Don't claim", section 10 every app picture), `docs/04_content_log.md` (what's
been made). For a new film also read the plugin's `hyperframes` skill and its
`references/types/vertical.md`, `types/launch.md`, `motion.md`, `sound.md`,
`spec.md` and `review.md` (plugin root below).

## Where things are

| What | Where |
|---|---|
| A video's folder (`shotlist.txt`, `film.mjs`, `timing.json`, the voice MP3s, `hf/`, the final MP4) | `C:\Users\reaksa\Documents\Video Marketing\Oak Order\<VIDEO>\` |
| Its HyperFrames project (generated, plus `SPEC.md` and `REVIEW.md` written by hand) | `<VIDEO>\hf\` |
| Film templates | `.claude\skills\oak-video-edit\hyperframes\films\` (`pain-fix-flow.mjs` = video 002 v2) |
| Music beds / sound effects / style references | `...\Oak Order\Music\`, `Sound effects\` (Mixkit; `sources.txt` each), `Style references\` |
| App pictures (Khmer) | `backend/marketing/out/km/*.png` (MARKETING_FACTS section 10; `shots.py` makes them) |
| Brand files | `brand/` (`navy_<file>`/`white_<file>` in a film = that file recoloured on a transparent ground) |
| HyperFrames plugin | `%USERPROFILE%\.claude\plugins\cache\hyperframes\hyperframes\<version>\` (`hf.mjs` finds it) |
| Gemini key | `GEMINI_API_KEY` in the repo's `.env` (git-ignored); never print it |

Scripts run with the Windows `node`, from the repo root:
`node .claude\skills\oak-video-edit\hyperframes\<script> <video folder>` (and
`scripts\voice.mjs <shotlist.txt>` for the voice).

## The house look (the founder's notes, 2026-11-01/02)

- 9:16, 1080 × 1920. Every word and the product between y 168 and 1330 (TikTok's
  tabs above, caption and buttons below); nothing to read under the right rail.
- Frame 0 is the thumbnail: the hook line already on screen over something
  busy, ideally a pain sellers feel (video 2: "Stop answering 'How much?'
  one by one").
- The app is real: shots.py screens in a current iPhone Pro (Cosmic Orange),
  straight on; pieces lift out at 2× as the voice names them; an arrow cursor
  clicks and its click causes the next thing on the same frame (no rings).
- Titles land word by word (blur in) on the word the voice says, then hold still.
- Colour: one ground per act, never muddy. Problem: crimson `#420c12`. Fix:
  bright teal `#0c8063`, key words yellow `#ffe45c`. Offer: white words on Oak
  navy `#1f3350`. End: the navy brand on light grey `#f3f5f7` with a dot grid.
  **No yellow grounds; navy never next to yellow** (founder, 2026-11-02). The
  closest model is the reference IMG_4465 (Prodigis): claims in white on navy,
  the logo in navy on light.
- Energetic music (Mixkit), its drop on the fix; a sound on every visible action,
  peaking one frame after it; no chimes or dings; music lifts on the end card.
- About 25 s: voice ~22 s plus a 3 s end card (acorn, wordmark, the offer line,
  a Telegram button, t.me/longreaksa).

## Steps

1. **Script.** If the founder gives one, use it; otherwise write it (see
   "Writing the script") and show it before making anything. Save
   `shotlist.txt` in the video's folder: `VIDEO <log#>_<type>_<topic>` and four
   `VOICE n | <start>–<end> | <name> | <voice text> [| style: …]` lines (the
   format in "The voice"). No SHOT lines: the film holds the shots.
2. **Film.** Copy a template from `hyperframes\films\` to `<VIDEO>\film.mjs` and
   change it: the words, the screens, the beats, which phrase each beat lands on.
   For a new story write `hf\SPEC.md` first (the plugin's `references/spec.md`;
   video 002's `hf\SPEC.md` is a model). See "How a film works".
3. **Timing**: `node hyperframes\timing.mjs <folder>`. With the voice MP3s it
   measures each block and its phrases; without them it estimates from the shot
   list (and keeps an existing timing.json). Every beat follows this file.
4. **Voice**: `node scripts\voice.mjs <folder>\shotlist.txt --check`, then
   timing.mjs again. Gemini's free tier makes **10 clips a day**: plan
   retakes; AI Studio is the backup (save the MP3s as `<log#>_<n>_<name>.mp3`).
5. **Make**: `node hyperframes\make.mjs <folder>`. Writes `hf\index.html` and one
   file per scene, copies every screen, font, brand mark, sound, the music and
   the voice into `hf\assets` (it scaffolds `hf\` with HyperFrames the first
   time). It overwrites the generated files.
6. **Check and look** (`node hyperframes\hf.mjs <folder> <command>`):
   `check --json` until 0 errors (weigh each warning; keep a deliberate one and
   say why in REVIEW.md); `snapshot --review` and read the beat, seam and phone
   sheets; `snapshot --range a,b --frames 8` around every move and payoff. Fix in
   film.mjs, make again. Write `hf\REVIEW.md` (the plugin's `references/review.md`).
7. **Preview**: `hf.mjs <folder> preview --background`, confirm the URL answers,
   give the founder `http://localhost:<port>/#project/hf` and wait. Their notes
   go into film.mjs (or timing / the voice), then make, check, look again.
8. **Render** only when they approve (or ask for the file):
   `hf.mjs <folder> render --quality delivery -o ..\<VIDEO>.mp4`; check its
   length with ffprobe and its sound with `hf.mjs <folder> audio ..\<VIDEO>.mp4 --json`
   (about -16 to -14 LUFS; say the sound was measured, not heard). Don't send
   HyperFrames feedback or publish without asking.
9. **After posting**: offer to fill in the content log row.

## How a film works

`make.mjs` loads `film.mjs` and calls its default export with the kit
(`hyperframes\kit.mjs`) plus `T` (timing.json), `ph` and `span`. The film
returns `{ END, scenes: [{ id, start, duration, html }], ground, music, cues }`;
the kit's `rootIndex` turns that into the root composition.

- **Timing**: `ph(block, i, n)` = when phrase i of n starts (`ph(.., true)` its
  end), `span(block, i, n)` its length. If the voice split into a different
  number of phrases than planned, they fall back to even spacing: snapshot the
  beats after every new take.
- **Scenes**: `scene(id, css, body, js)` gives a `<template>` with the fonts and
  a paused timeline with `land(sel, at)`, `leave(sel, at)`, `move(cursor, x, y, at, d)`,
  `press(cursor, at)`. Prefix every id by scene (`a2-…`); scene time starts at 0.
- **Pieces**: `words()` (a title), `CURSOR()`, `iphone({ id })` (geometry, `at(x, y)`
  for an app point on the stage, `shot`/`crop`/`lift`/`liftBox`, `html({ view, overlay })`),
  `linkCard()` (the shop link's preview card), `TELEGRAM_ICON()`, `rng(seed)`.
- **Sounds**: `const { cue, cues } = sounds(END)`; `cue(at, 'click'|'pop'|'whoosh'|<name>, gain)`
  rotates takes and lands the peak a frame after `at`. A new file needs its row
  in `SFX` (peak, volume, length from `hf.mjs <folder> audio <file> --json`):
  `hf-<name>` = HyperFrames' bundled sounds, `mx-<name>` = `Sound effects\<name>.mp3`.
- **Music**: `{ file, mediaStart, points }`; `mediaStart` = the track's drop
  minus the beat it should land on; `points` = the volume envelope (about 0.16
  under the voice, more in the gaps).
- **HyperFrames rules that bite** (lint catches most): `fromTo`, never CSS
  `transform` on a tweened element, a fade-in's destination says `opacity: 1`,
  texture text gets `data-layout-ignore`, about 30+ blurred/clipped elements in
  one scene can render black frames, `<audio>` needs an id and a duration.

## The voice

- **VOICE times** are the plan; the real MP3 lengths decide the film.
- In VOICE text, English words are spelled in Khmer letters (Order → អូឌ័រ,
  chat → ឆាត, Telegram → តេឡេក្រាម, KHQR → ខេអេចឃ្យូអា) or the voice mispronounces
  them; on-screen titles keep the English. New spellings go in the playbook's
  "Pronunciation fixes". "Oak Order" in English letters works; check by ear.
- Tags in English: `<short pause>`, `<long pause>`, at most one expression tag
  per video. A 5th field `style: …` overrides the playbook's style line.
- `voice.mjs`: `--only 3` redoes one block, `--force` all; `--check` transcribes
  each new block (gemini-3.5-transcribe, 3 a minute): redo it if a line says
  `[INSTRUCTION SPOKEN?]` or "much longer than planned". A plain transcript can
  mishear "Oak" as "Book" or blur a word: ask a Gemini Flash model about the
  words directly before spending a retake (the newest Flash is often overloaded
  in the evening; an older one answers).
- Style lines ask for calm everyday talk (a real person to a friend, not an
  announcer). Emotion words make Gemini act: "punchy", "teasing", "overwhelmed",
  "deflated" gave a laugh, a sigh and a dramatic read the founder didn't like
  (2026-11-02). The fix line's easy tone is the model.
- A take with long pauses (Gemini leaves 0.5-1 s): `node scripts	ighten.mjs
  <mp3> [--no-breaths]` shortens them (sentence breaks stay a little longer),
  never cuts words, keeps the untouched take as `_<name>_raw.mp3`;
  `--no-breaths` also cuts a sigh. Then timing.mjs.
- `timing.mjs` skips breaths and sighs (short, no pitch) and joins pauses inside
  a sentence down to the text's phrase count (split at ។ ៖ ? ! and the pause
  tags), so put ។ where the film changes beat. It warns when the voice has fewer.

## Writing the script

- 20–30 s, four blocks: hook (one punchy line, ≤3 s, on screen at frame 0),
  pain, fix (Oak Order doing it, with the app's screens), offer + CTA (message
  on Telegram; the end card shows `t.me/longreaksa`).
- Facts only from `MARKETING_FACTS.md` rows marked Live; never anything in its
  "Don't claim". The demo shop Oak Phone (Oak Fashion before 2026-11-02) is an example: never present its
  orders as real sales. No private seller or customer data (Gemini's free tier).
- Check the content log so hooks, angles and features don't repeat, and the
  playbook's "Words to avoid" and "Winning hooks".
- On-screen words: short Khmer lines, the English product words in English.
  The scripts are read by a Khmer speaker before posting.
- Add the video's row to `docs/04_content_log.md` as Draft.

## Setup and HyperFrames notes

- The plugin: `claude plugin marketplace add heygen-com/hyperframes` and
  `claude plugin install hyperframes@hyperframes` (the `/plugin` command doesn't
  work in the VS Code chat; the `claude` CLI does). Its skills show as
  `/hyperframes:…` after a window reload; run its CLI only through `hf.mjs` (the
  plugin's launcher, pinned version). Don't update it during a video.
- It needs Node 22+, FFmpeg and Chrome (all on the laptop). It sends anonymous
  usage data (`hf.mjs <folder> telemetry disable` stops it). No HeyGen account is
  needed; its voice and music catalog need a sign-in we don't use (no Khmer voice).
- The preview page has an **Edit with Framey** button for HyperFrames' desktop
  app. If the founder edits there, run `hf.mjs <folder> catch-up` and port their
  changes into film.mjs before the next make.

## CapCut drafts (optional, the older way)

`scripts\build.mjs` still builds a CapCut draft from `oak-template` for a shot
list with SHOT lines (`SHOT n | start–end | <file or phone:/stock:> | anim: … | sfx: … | caption: …`,
`from:` for a clip's in-point, `AUDIO a|b|c|d` for ready-made MP3s,
`END CARD | template end card`): `--check` first, CapCut closed, `--name <VIDEO>-v2`
if the draft exists. Rules: never edit `oak-template` or a draft the founder
made; CapCut closed whenever a draft is written (`capcut_*` MCP tools, never
`force`); copies only through `scripts\draft-copy.mjs` (it finds `oak-template`
in CapCut's recycle bin if it was deleted). A rendered HyperFrames MP4 can also
just be dropped into CapCut for small touches.
