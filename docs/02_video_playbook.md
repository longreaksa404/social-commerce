# Oak Order: Video Playbook

Last updated: 2026-10-30

## Tools ($0/month)
| Step | Tool | Notes |
|---|---|---|
| Ideas + script | Claude (this project) | Won a blind test vs ChatGPT and Gemini on ideas and facts. A Khmer speaker reads the first scripts aloud before posting. Every script ends with a shot-list block for Claude Code. |
| Voice | Gemini 3.8 Flash TTS, Google AI Studio (free tier) | Khmer supported, sounds natural. Free with daily limits. Never paste private seller or customer data (free tier input may be used by Google). Don't click "Unlock Gemini 4 Argon". |
| Edit | CapCut desktop, edited by Claude Code + CapCut MCP (jmsldrn/capcut-mcp) with the `oak-video-edit` skill | Claude Code builds the draft from the template and the shot-list block. I watch every draft and ask Claude Code for fixes before export. Fallback if the MCP breaks: edit by hand from the template. CapCut has no Khmer voice. Use only assets marked "Commercial". Don't use CapCut auto captions or AI auto-edit. |
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
- [ ] Claude Code writes the `oak-video-edit` skill: input = shot-list block + voice MP3s + screenshots; output = CapCut draft from the template.
- [ ] Video 1 made with it; edit time written in the content log.

## Cadence
3 videos/week to start, one per post day (e.g. Mon / Wed / Fri), same time each day. Each video goes to TikTok, Facebook Reels and Instagram Reels. Never more than one a day. → 5–7/week once one batch takes 3 hours or less → daily only if videos bring seller sign-ups. Videos support direct outreach, they don't replace it: if a week is tight, keep outreach and post 2.

## Weekly rhythm
1. **Plan (Claude project, ~45 min).** New chat each week. REVIEW with the filled-in log (from week 2), then BATCH 3. Check the fact-check lists. FIX with Khmer corrections.
2. **Produce (one sitting).** Voice MP3s in Gemini (4 per video), phone screenshots if needed, Claude Code builds the 3 drafts, I watch, fix, export, schedule.
3. **Results (~10 min, 3 days after each post).** Fill in the content log. Ask every new lead where they heard about Oak Order.
4. **Update the project.** Replace 04_content_log.md (and 02 if it changed) after each REVIEW.

## Voice recipe (Gemini, AI Studio)
- Speaker: Nika (warm, approachable, medium pitch). Update here if I change it.
- 4 blocks, same speaker, one mood each. Default style lines:
  1. Hook: `Surprised and a little frustrated, like complaining to a friend`
  2. Pain / setup: `Tired and relatable, slightly faster, like listing daily problems`
  3. Fix: `Relieved and bright, confident and friendly, clear on each point`
  4. Offer + CTA: `Warm and inviting, a little excited, slow down slightly on the offer`
- `<short pause>` after the hook, after the product name reveal, before the CTA.
- At most one expression tag per video.
- Target 30–40 s.
- If the voice mispronounces an English word, write it in Khmer letters in the voice text only (Oak Order → អូក អូឌ័រ). Captions keep the English.
- Save one MP3 per block, named by content-log number: `001_1_hook.mp3`, `001_2_pain.mp3`, `001_3_fix.mp3`, `001_4_cta.mp3`.

## Visuals
- Demo shop: **Oak Fashion**, a men's and women's shoe shop ($8–$25) on the live site. Its orders stay paused except while I take phone screenshots. It's an example shop: never present its orders as real sales or a real seller's results.
- App pictures and clips: made by the local tool `backend/marketing/shots.py` from a copy of Oak Fashion: 22 pictures and 15 clips, in Khmer and English. The full list (file name, what it shows, length) is in section 10 "Video assets" of MARKETING_FACTS.md. Shot lists name the exact file, with its path relative to `backend/marketing/out/` (e.g. `km/07_dashboard.png`, `video/km_order_arrives.mp4`). If a shot needs something that isn't there, flag it as MISSING.
- Clips have no sound and start and end on a 1-second still; a circle shows every tap. Khmer videos use `km/` pictures and `km_` clips.
- Before a batch: check the files the scripts need exist. If the KHQR or low-stock steps were skipped in the last run, re-run shots.py (see MARKETING_FACTS section 10).
- The bell's number counts only "says paid", low stock and sold out, not new orders (those show on the Orders tab). Don't script a bell badge for a new order.
- Phone screenshots (taken by me): Telegram new-order alert, low-stock alert, "customer says paid" alert, the customer's receipt from the bot, bank app scan screen, bank app payment-success screen. Animated with keyframes (slide-in, zoom, sound effect), not AI image-to-video.
- The share clip ends on "Link copied": the phone's share list can't be filmed.
- My own Telegram, phone number and KHQR may be shown; no blurring needed.
- Bank screenshots: keep the bank's logo incidental; never imply a partnership with a bank.

## Where files live
- Tool pictures and clips: `backend/marketing/out/` on the laptop (`km/`, `en/`, `video/`; `.work/` is the tool's scratch space). Re-made by one command; not backed up. Claude Code uses them from there.
- Google Drive → "Oak Video Marketing": 1 Phone screenshots, 2 Voice (Gemini MP3s), 3 Finished videos (named by content-log number, e.g. 001_pain-fix_lost-order.mp4), 4 Brand.
- Claude Code needs the voice MP3s and screenshots on the laptop: keep "Oak Video Marketing" synced with Google Drive for desktop. Local path: (fill in).

## CapCut template
Built by Claude Code as a template draft: 9:16 · Noto Sans Khmer captions, large · Oak navy (#1f3350) and the acorn logo · end card with the acorn (`brand/oak-acorn-on-navy-1024.png`) and https://t.me/longreaksa. Template draft name: **`oak-template`** (built 2026-11-01; never edited, every video starts from a copy).
- Tracks: `main` (pictures and clips, then the end card), `captions`, `logo`, `endcard`, `voice`.
- Background: navy behind every picture and clip, so the strips beside a phone screenshot at 100% are navy, not black.
- Captions: white Noto Sans Khmer **Bold** (`brand/fonts/NotoSansKhmer-Bold.ttf`; CapCut's font list has no Noto Sans Khmer), size 15, on a rounded navy box, about 70% down the screen, at most 78% of the width.
- Logo: the acorn, small, top left, until the end card.
- End card: 3 s, navy with the acorn in the middle and `t.me/longreaksa` in white below.
- Style samples (a picture, a clip, a caption, a voice clip) that the skill copies the look from, then removes.

## Words to avoid (Khmer corrections from native speakers)
- (none yet)

## Pronunciation fixes (for the Gemini voice)
- (none yet)

## Winning hooks (update from REVIEW)
- (none yet)

## Results
Every video and its results live in 04_content_log.md (one file, so ideas never repeat). Ask every new lead where they heard about Oak Order. Review weekly (15 min). After 4 weeks, drop the weakest type.
