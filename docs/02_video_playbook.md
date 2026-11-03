# Oak Order: Video Playbook

Last updated: 2026-11-02

## Tools ($0/month)
| Step | Tool | Notes |
|---|---|---|
| Ideas + script | Claude Code, `oak-video-edit` skill (since 2026-11-01; was a claude.ai project) | Everything happens in Claude Code: script, voice, edit. A Khmer speaker reads the first scripts aloud before posting. Every script is saved as a shot list (`shotlist.txt`: the VIDEO and its four VOICE lines). |
| Voice | Gemini 3.8 Flash TTS, called by Claude Code (Gemini API free tier, key in `.env`) | Khmer supported, sounds natural. Free with daily limits: 10 clips a day (one video's 4 blocks plus retakes). Never put private seller or customer data in a script (free tier input may be used by Google). AI Studio still works as a backup: save the MP3s in the video's folder under the block names (`002_1_hook.mp3` …). |
| Edit | HyperFrames by HeyGen (open source, free; a Claude Code plugin), driven by Claude Code with the `oak-video-edit` skill (since 2026-11-02) | Claude Code writes the film from a template (`film.mjs`), times every beat from the real voice, checks and reviews the frames itself, and gives me a preview link (my browser, with sound). I ask for changes there; when I approve, Claude Code renders the MP4 with the voice, music and sounds mixed in. Sound effects and music beds from Mixkit and HyperFrames' bundled sounds (free licences). CapCut is optional now: the older draft builder still works, and a rendered MP4 can go into CapCut for small touches. |
| Post | Meta Business Suite (FB/IG), TikTok scheduler | Scheduling is my approval step. |

Backup voice: SpeechGen (Microsoft Sreymom / Piseth), more robotic. ElevenLabs has no Khmer.

## MCP setup (one time)
Status: in progress. Tick each step when done.
- [x] Install CapCut desktop (the MCP edits desktop drafts). CapCut 9.7.0.4153.
- [x] Back up the CapCut drafts folder. `%USERPROFILE%\CapCut-drafts-backup-2026-10-31`.
- [x] Install jmsldrn/capcut-mcp in Claude Code. Local fork, branch `oak`, adds keyframes.
- [ ] **Go/no-go: Khmer caption test.** A 5-second draft with one Khmer caption in Noto Sans Khmer. Stacked letters must look right in CapCut and on the phone. If not, stop and edit by hand. CapCut: passed 2026-11-01 (CapCut's font list has no Noto Sans Khmer; Claude Code sets the font file directly). Phone: check on the first export.
- [x] Check keyframes work (slide-in, zoom on phone screenshots). If not, plain cuts for screenshots. Passed 2026-11-01.
- [x] Claude Code builds the template draft (see "CapCut template"). `oak-template`, 2026-11-01.
- [x] Claude Code writes the `oak-video-edit` skill: input = shot-list block + voice MP3s + screenshots; output = CapCut draft from the template. 2026-11-01; it also makes the voice MP3s itself (Gemini API).
- [ ] Video 1 made with it; edit time written in the content log.

## Cadence
3 videos/week to start, one per post day (e.g. Mon / Wed / Fri), same time each day. Each video goes to TikTok, Facebook Reels and Instagram Reels. Never more than one a day. → 5–7/week once one batch takes 3 hours or less → daily only if videos bring seller sign-ups. Videos support direct outreach, they don't replace it: if a week is tight, keep outreach and post 2.
The current run: `03_video_plan.md` (videos 003–022 around the launch; one made a day, posted on this cadence).

## Weekly rhythm
1. **Plan (Claude Code, ~45 min).** REVIEW with the filled-in log (from week 2), then BATCH 3 scripts with shot lists. Check the fact-check lists. FIX with Khmer corrections.
2. **Produce (one sitting).** Phone screenshots if needed, into each video's folder. Claude Code makes the voice and the 3 films; I watch each preview, ask for changes, approve; Claude Code renders the MP4s; I schedule.
3. **Results (~10 min, 3 days after each post).** Fill in the content log. Ask every new lead where they heard about Oak Order.

## Voice recipe (Gemini, AI Studio)
- Speaker: Achird (male, friendly and warm, made for casual vlogs). Update here if I change it. Picked 2026-11-02 (founder: "talk everyday style, natural like a real human") from one line in four voices: Achird's Khmer came back word for word when transcribed and each question was its own phrase; Nika (the voice before, a high "influencer" pitch) ran two questions together; Aoede sounded word by word; Callirrhoe blurred two words. Gemini has no Khmer voice: every voice is a multilingual one speaking Khmer. The four takes: `Video Marketing\Oak Order\voice-test\2026-11-02 pain line\`.
- 4 blocks, same speaker, one mood each. Every style line asks for calm everyday talk, a real person to a friend, not an announcer: no emotion words like "punchy", "overwhelmed" or "deflated" (video 2: they gave a laugh, a sigh and an acted read; the founder wants it natural, 2026-11-02). Long pauses in a take: `scripts	ighten.mjs` (see the skill). Default style lines:
  1. Hook: `Native Khmer speaker, everyday Phnom Penh talk, calm and natural, like casually giving a seller friend a simple tip: easy, friendly and matter-of-fact, a natural pace. Not dramatic, not acted, no laugh, not an announcer.`
  2. Pain / setup: `Native Khmer speaker, everyday Phnom Penh talk, calm and natural, like casually telling a friend what happens every day: an easy conversational pace, a quick beat after each question, plain and matter-of-fact at the end. Not dramatic, not acted, not reading.`
  3. Fix: `Native Khmer speaker, everyday Phnom Penh talk, like telling a friend about a trick you just found: relieved and bright, upbeat and sure of it, smiling. Not reading.`
  4. Offer + CTA: `Native Khmer speaker, everyday Phnom Penh talk, warm and friendly like inviting a friend: a little excited, slow down slightly on the offer. Not an announcer.`
- `<short pause>` after the hook, after the product name reveal, before the CTA.
- At most one expression tag per video.
- Target about 20–25 s of voice (about 25–28 s with the end card; video 1's CapCut drafts were 30–40 s).
- If the voice mispronounces an English word, write it in Khmer letters in the voice text only (Oak Order → អូក អូឌ័រ). Captions keep the English.
- Save one MP3 per block, named by content-log number: `001_1_hook.mp3`, `001_2_pain.mp3`, `001_3_fix.mp3`, `001_4_cta.mp3`.

## Visuals
- Demo shop: **Oak Phone** (the shoe shop Oak Fashion until 2026-11-02), an iPhone shop (new and used iPhones, AirPods, $45–$2,349) on the live site. Its orders stay paused except while I take phone screenshots. It's an example shop: never present its orders as real sales or a real seller's results.
- App pictures and clips: made by the local tool `backend/marketing/shots.py` from a copy of the demo shop: 22 pictures and 15 clips, in Khmer and English (the ones made so far still show Oak Fashion's shoes; the next run shows Oak Phone). The full list (file name, what it shows, length) is in section 10 "Video assets" of MARKETING_FACTS.md. Shot lists name the exact file, with its path relative to `backend/marketing/out/` (e.g. `km/07_dashboard.png`, `video/km_order_arrives.mp4`). If a shot needs something that isn't there, flag it as MISSING.
- Clips have no sound and start and end on a 1-second still; a circle shows every tap. Khmer videos use `km/` pictures and `km_` clips.
- Before a batch: check the files the scripts need exist. If the KHQR or low-stock steps were skipped in the last run, re-run shots.py (see MARKETING_FACTS section 10).
- The bell's number counts only "says paid", low stock and sold out, not new orders (those show on the Orders tab). Don't script a bell badge for a new order.
- Phone screenshots (taken by me): Telegram new-order alert, low-stock alert, "customer says paid" alert, the customer's receipt from the bot, bank app scan screen, bank app payment-success screen. Animated with keyframes (slide-in, zoom, sound effect), not AI image-to-video.
- The share clip ends on "Link copied": the phone's share list can't be filmed.
- My own Telegram, phone number and KHQR may be shown; no blurring needed.
- Bank screenshots: keep the bank's logo incidental; never imply a partnership with a bank.

## Looks
- **The look now** (video 2 v2, HyperFrames, 2026-11-02): the hook line already on screen at frame 0; the app's real screens in an iPhone Pro (Cosmic Orange), straight on; an arrow cursor that clicks, each click causing the next thing; pieces of the screen lift out at 2× as the voice names them; titles land word by word on the spoken word and hold still; a sound on every visible action, on its frame; energetic music with its drop on the fix; about 25 s. Colour, one ground per part: crimson for the problem, bright teal for the fix (key words yellow), the offer in white on Oak navy, the end card in navy on light grey (acorn, wordmark, the offer line, a Telegram button, t.me/longreaksa). No yellow backgrounds; navy only with white and light grey. My closest reference: IMG_4465 (Prodigis) in `Style references\`. Titles are in the picture: ask Claude Code for word changes.
- Before: the template look (video 1: the app screen on navy, a caption box, the acorn top left) and the stage look (video 2 v1: a glowing dark navy stage). Both CapCut drafts.

## Where files live
- Tool pictures and clips: `backend/marketing/out/` on the laptop (`km/`, `en/`, `video/`; `.work/` is the tool's scratch space). Re-made by one command; not backed up. Claude Code uses them from there.
- On the laptop: `Documents\Video Marketing\Oak Order\`, one folder per video named by VIDEO (e.g. `002_pain-fix_how-much\`: `shotlist.txt`, `film.mjs`, `timing.json`, the 4 voice MP3s, `hf\` (the HyperFrames project, with `SPEC.md` and `REVIEW.md`), phone screenshots, the rendered MP4), `Sound effects\`, `Music\` (Mixkit music beds, `sources.txt` has the licence and ids) and `Style references\` (sample videos whose look we copy, not their content). Not synced to Google Drive (no Drive for desktop on this laptop); drafts point at these files, so don't move them.
- Brand files and the captions' font: `brand/` in the repo.

## CapCut template (optional, the older way)
Used only when a video is built as a CapCut draft. Built by Claude Code as a template draft: 9:16 · Noto Sans Khmer captions, large · Oak navy (#1f3350) and the acorn logo · end card with the acorn (`brand/oak-acorn-on-navy-1024.png`) and https://t.me/longreaksa. Template draft name: **`oak-template`** (built 2026-11-01; never edited, every video starts from a copy).
- Tracks: `main` (pictures and clips, then the end card), `captions`, `logo`, `endcard`, `voice`.
- Background: navy behind every picture and clip, so the strips beside a phone screenshot at 100% are navy, not black.
- Captions: white Noto Sans Khmer **Bold** (`brand/fonts/NotoSansKhmer-Bold.ttf`; CapCut's font list has no Noto Sans Khmer), size 15, on a rounded navy box, about 70% down the screen, at most 78% of the width.
- Logo: the acorn, small, top left, until the end card.
- End card: 3 s, navy with the acorn in the middle and `t.me/longreaksa` in white below.
- Style samples (a picture, a clip, a caption, a voice clip) that the skill copies the look from, then removes.

## Words to avoid (Khmer corrections from native speakers)
- (none yet)

## Pronunciation fixes (for the Gemini voice)
English words are spelled in Khmer letters in the voice text only; captions keep the English (picked 2026-11-01 from a test).
- Order → អូឌ័រ
- chat → ឆាត
- Oak Order → អូក អូឌ័រ (check by ear: a test transcript heard "All Go Order"). Video 2 tried "Oak Order" in English letters at the start of a block: the plain check wrote "Book order", but asked about the name directly it heard "Oak". Video 2 v2 (Achird, "ជាមួយ Oak Order"): asked directly, gemini-3.6-flash heard "Oak Order" clearly. Listen to it before posting.
- Telegram → តេឡេក្រាម
- KHQR → ខេអេចឃ្យូអា (heard back as "KHQR", 2026-11-01)

## Winning hooks (update from REVIEW)
- (none yet)

## Results
Every video and its results live in 04_content_log.md (one file, so ideas never repeat). Ask every new lead where they heard about Oak Order. Review weekly (15 min). After 4 weeks, drop the weakest type.
