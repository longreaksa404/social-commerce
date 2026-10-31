---
name: oak-video-edit
description: Make an Oak Order marketing video as a CapCut draft, the founder's way. Takes a shot-list block (or writes the script and shot list first), makes the four Khmer voice MP3s with Gemini, and builds a CapCut draft from the oak-template draft with the shots fitted to the real voice lengths, captions, keyframe animations, sound effects and the end card. Use whenever the founder asks for a video, a script, a voice-over, a CapCut draft, a fix to a video draft, or says "video 2", "next video", "make the draft", "/oak-video-edit". Windows laptop only (CapCut desktop), not the dev container.
---

# Make an Oak Order video

The founder makes 3 short videos a week (TikTok, Facebook Reels, Instagram
Reels), part-time, and reviews every draft in CapCut before exporting. The
whole workflow happens here in Claude Code (founder, 2026-11-01): script,
voice, edit. The founder watches, asks for fixes, exports and posts.

Read first: `docs/02_video_playbook.md` (tools, voice recipe, visuals,
CapCut template, words to avoid, pronunciation fixes),
`docs/MARKETING_FACTS.md` (what's true, section 6 "Don't claim", section 10
every picture and clip), `docs/04_content_log.md` (what's been made).

## Where things are

| What | Where |
|---|---|
| A video's own files (shot list, voice MP3s, phone screenshots) | `C:\Users\reaksa\Documents\Video Marketing\Oak Order\<VIDEO name>\` |
| Sound effects (`sfx: <name>` = file name) | `...\Oak Order\Sound effects\` (`sources.txt`: Mixkit licence and ids) |
| App pictures and clips | `backend/marketing/out/` (`km/…png`, `video/km_…mp4`), made by `shots.py` |
| Template draft (never edit it) | CapCut draft `oak-template` |
| CapCut drafts | `%LOCALAPPDATA%\CapCut\User Data\Projects\com.lveditor.draft` |
| capcut-mcp fork the build uses | `%USERPROFILE%\mcp\capcut-mcp`, branch `oak` |
| Gemini key | `GEMINI_API_KEY` in the repo's `.env` (git-ignored); never print it |

Run the scripts with the Windows `node` (PowerShell), from anywhere:
`node .claude\skills\oak-video-edit\scripts\<script> ...`

## The shot-list block

```
VIDEO <log#>_<type>_<topic>
VOICE 1 | <start>–<end> | hook | <voice text>
VOICE 2 | <start>–<end> | pain | <voice text>
VOICE 3 | <start>–<end> | fix  | <voice text>
VOICE 4 | <start>–<end> | cta  | <voice text>
SHOT <n> | <start>–<end> | <file, "phone: name" or "stock: search words"> | anim: <none / slide-in / zoom-in / zoom-out> | sfx: <none / name> | caption: <Khmer text>
END CARD | template end card
```

- **VOICE times** are the plan; the real MP3 lengths decide the video.
  Each block's shots are stretched or squeezed onto that block's real
  length, so a shot planned at the hook's end stays at the hook's end.
- **Voice text vs caption** (founder, 2026-11-01): in VOICE text, English
  words are spelled in Khmer letters (Order → អូឌ័រ, chat → ឆាត, Oak Order →
  អូក អូឌ័រ, Telegram → តេឡេក្រាម) or the voice mispronounces them; captions
  keep the English. Add new spellings to the playbook's "Pronunciation fixes".
- Inline tags in VOICE text, in English: `<short pause>`, `<long pause>`,
  one expression tag per video at most (`<sigh>`, `<laugh>`…). An optional
  5th field `style: …` overrides the playbook's style line for that block.
- **SHOT files**: a path under `backend/marketing/out/` (`km/07_dashboard.png`,
  `video/km_order_arrives.mp4`); `phone: <name>` = a screenshot in the
  video's folder with that file name (any of png/jpg/mp4); `stock: <words>`
  = a navy placeholder labelled with the words, for the founder to replace
  by hand in CapCut. Shots follow each other from 0 with no gaps.
- `from: <seconds>` (optional, clips only) starts the clip that far in.
  shots.py clips open on a 1-second still, and the action you want is
  often later: look at the frames first (ffmpeg `fps=1,tile`), then pick.
  A clip too short for its shot is slowed down to fill it.
- `AUDIO a.mp3 | b.mp3 | c.mp3 | d.mp3` instead of VOICE lines uses MP3s
  already in the video's folder (shots are then scaled to the total).
- A `|` can't appear inside a caption.

## Steps

1. **Script and shot list.** If the founder gives a block, use it. If they
   ask for a video on a topic, write it (see "Writing the script") and show
   it before making anything. Save the agreed block as `shotlist.txt` in
   `...\Oak Order\<VIDEO name>\` (create the folder).
2. **Check the files**: `node build.mjs <shotlist.txt> --check`. It lists
   anything MISSING (a picture, a phone screenshot, a sound) and the planned
   timing; nothing is built. If a phone screenshot is missing, ask the
   founder to put it in the video's folder under that name.
3. **Voice**: `node voice.mjs <shotlist.txt> --check`. Makes
   `<log#>_1_hook.mp3` … `<log#>_4_cta.mp3` in the video's folder (trimmed,
   evened to -16 LUFS), keeps ones that exist; `--only 3` redoes one block,
   `--force` all. `--check` has Gemini transcribe each block: if a line says
   `[INSTRUCTION SPOKEN]` or "much longer than planned", redo that block.
   Busy errors are retried by the script.
4. **Build**: ask the founder to close CapCut if it's open, then
   `node build.mjs <shotlist.txt>`. It copies `oak-template` to a draft
   named after VIDEO and saves it in one go. If the name exists, it stops:
   use `--name <VIDEO>-v2`. It prints every shot's planned → real times.
5. **Hand over**: tell the founder the draft name, the length, any notes
   (stock placeholders, slowed clips, shots left under the end card), and
   ask them to open it in CapCut, watch, and say what to fix. They close
   CapCut before you change anything.
6. **Fixes**: small ones with the `capcut_*` MCP tools on that draft
   (`capcut_read_timeline` first; times in seconds; `capcut_set_keyframes`
   for zooms and slides; `capcut_save`, never `force`). Bigger ones (new
   order, new voice, different shots): edit `shotlist.txt`, redo voice
   blocks if their text changed, and rebuild with `--name <VIDEO>-v2`.
7. **After export**: the founder writes the edit time in the content log's
   Edit column (e.g. "MCP, 25"); offer to fill in the row.

## Writing the script

- 30–40 s, four blocks: hook (one punchy line, ≤3 s), pain / setup, fix
  (Oak Order doing it, shown with the app's pictures and clips), offer + CTA
  (message on Telegram; the end card shows `t.me/longreaksa`).
- Facts only from `MARKETING_FACTS.md`; never anything in its "Don't
  claim". The demo shop Oak Fashion is an example: never present its orders
  as real sales. No private seller or customer data (it goes to Gemini's
  free tier).
- Check the content log so hooks, angles and features don't repeat, and the
  playbook's "Words to avoid" and "Winning hooks".
- Every shot uses a file that exists (MARKETING_FACTS section 10) or is
  marked `phone:` / `stock:`; flag anything that doesn't exist as MISSING.
- Captions: short Khmer lines (one or two lines on screen), the English
  product words kept in English. The first scripts are read aloud by a Khmer
  speaker before posting (playbook).
- Add the video's row to `docs/04_content_log.md` as Draft.

## Rules

- **Never edit `oak-template` or any draft the founder made**: only drafts
  this skill built. The build always works on a fresh copy.
- **CapCut must be closed** whenever a draft is written (build, MCP save).
  CapCut's autosave overwrites edits made while it's open. Never pass
  `force: true`.
- Don't use `capcut_clone_draft` (it skips subfolders and keeps the
  original's id); copies go through `scripts/draft-copy.mjs`.
- Full Windows paths for every media file; drafts point at files where they
  are, so don't move or rename them after building.
- Look and timing constants (zoom amount, end card length, sound volume…)
  are at the top of `scripts/build.mjs`. If the founder changes one, update
  the playbook's "CapCut template" section too.
- If a CapCut update breaks a draft (it won't open, layers missing), stop
  and tell the founder: the fallback is editing by hand from `oak-template`.
