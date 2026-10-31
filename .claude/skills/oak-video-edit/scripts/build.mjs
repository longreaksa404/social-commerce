// Build a CapCut draft from oak-template, a shot list and its voice MP3s, with shots fitted to the real voice.
// CapCut must be closed. Never touches oak-template or any other draft: it works on a fresh copy.
// Usage: node build.mjs <shotlist.txt> [--name <draft name>] [--check]   (--check: report only, build nothing)
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { execFileSync } from 'child_process';
import { parseShotList } from './shotlist.mjs';
import { ASSETS, SFX_DIR, MCP_DIR, TEMPLATE, capcutRunning, seconds, logNo } from './common.mjs';
import { copyDraft } from './draft-copy.mjs';

// look and timing (change here, then note it in the playbook's "CapCut template")
const VOICE_GAP = 0.25;      // s of silence between voice blocks
const END_CARD = 3;          // s the end card lasts
const END_CARD_OVERLAP = 1.5; // s the end card starts before the last voice block ends
const ZOOM = 1.15;           // zoom-in goes 1 → ZOOM over the shot, zoom-out ZOOM → 1
const SLIDE_IN = 0.4;        // s a slide-in takes, from just off the right edge
const SFX_VOLUME = 0.5;      // sound effects under the voice (sounds and voice are both evened to -16 LUFS)
const FPS = 30;
const US = 1e6;
const ACORN = 'oak-acorn-on-navy-1024.png';

const args = process.argv.slice(2);
const listFile = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--name');
const checkOnly = args.includes('--check');
if (!listFile) { console.error('usage: node build.mjs <shotlist.txt> [--name <draft>] [--check]'); process.exit(2); }
const dir = path.dirname(path.resolve(listFile));
const plan = parseShotList(fs.readFileSync(listFile, 'utf8'));
const draftName = args.includes('--name') ? args[args.indexOf('--name') + 1] : plan.video;
const snap = t => Math.round(Math.round(t * FPS) * US / FPS); // seconds -> µs on a frame

// ---- find every file first; stop before building anything if one is missing ----
const missing = [];
const findIn = (folder, name, exts) => {
  if (!fs.existsSync(folder)) return null;
  const want = name.toLowerCase();
  const f = fs.readdirSync(folder).find(f => exts.includes(path.extname(f).toLowerCase()) && path.basename(f, path.extname(f)).toLowerCase() === want);
  return f ? path.join(folder, f) : null;
};
for (const s of plan.shots) {
  const m = s.src.match(/^(phone|stock)\s*:\s*(.+)$/i);
  if (m && m[1].toLowerCase() === 'stock') { s.kind = 'stock'; s.words = m[2]; }
  else if (m) { s.file = findIn(dir, m[2].trim(), ['.png', '.jpg', '.jpeg', '.mp4', '.mov']); if (!s.file) missing.push(`SHOT ${s.n}: phone screenshot "${m[2]}" not in ${dir}`); }
  else { s.file = path.join(ASSETS, s.src); if (!fs.existsSync(s.file)) missing.push(`SHOT ${s.n}: ${s.src} not in backend/marketing/out`); }
  if (s.file) s.kind = /\.(mp4|mov)$/i.test(s.file) ? 'clip' : 'picture';
  if (s.sfx !== 'none') { s.sfxFile = findIn(SFX_DIR, s.sfx, ['.mp3', '.wav']); if (!s.sfxFile) missing.push(`SHOT ${s.n}: sound effect "${s.sfx}" not in ${SFX_DIR}`); }
}
const voiceFiles = plan.audio
  ? plan.audio.map(f => path.join(dir, f))
  : plan.voices.map(v => path.join(dir, `${logNo(plan.video)}_${v.n}_${v.name}.mp3`));
for (const f of voiceFiles) if (!fs.existsSync(f)) missing.push(`voice ${path.basename(f)} not in ${dir} (run voice.mjs first)`);
if (missing.length) { console.log('MISSING:\n- ' + missing.join('\n- ')); process.exit(1); }

// ---- timing: voice blocks end to end, then each shot's planned time mapped onto the real blocks ----
const lens = voiceFiles.map(seconds);
const starts = []; let cursor = 0;
for (const len of lens) { starts.push(cursor); cursor += len + VOICE_GAP; }
const voiceEnd = starts[3] + lens[3];
// planned block edges -> real block edges (a block's real span runs to the next block's start, gap included)
let P, A;
if (!plan.audio) { P = [0, ...plan.voices.slice(1).map(v => v.start), plan.voices[3].end]; A = [0, starts[1], starts[2], starts[3], voiceEnd]; }
else { P = [0, plan.shots.at(-1).end]; A = [0, voiceEnd]; }
const map = t => {
  if (t >= P.at(-1)) return A.at(-1);
  const k = P.findIndex((p, i) => t >= p && t < P[i + 1]);
  return A[k] + (t - P[k]) * (A[k + 1] - A[k]) / (P[k + 1] - P[k]);
};
const ecStart = Math.max(voiceEnd - END_CARD_OVERLAP, starts[3] + 0.5);
const ecStartUs = snap(ecStart), ecEndUs = snap(ecStart + END_CARD);
const shots = [];
for (const s of plan.shots) {
  const a = snap(map(s.start)), b = Math.min(snap(map(s.end)), ecStartUs);
  if (a >= ecStartUs || b - a < US / FPS) { console.log(`note: SHOT ${s.n} falls under the end card, left out`); continue; }
  shots.push({ ...s, atUs: a, durUs: b - a });
}
if (shots.length) shots.at(-1).durUs = ecStartUs - shots.at(-1).atUs; // the last shot runs up to the end card

console.log(`${draftName}: voice ${lens.map(l => l.toFixed(2)).join(' + ')} s, end card ${(ecStartUs / US).toFixed(2)}–${(ecEndUs / US).toFixed(2)} s`);
for (const s of shots) console.log(`  SHOT ${String(s.n).padStart(2)}  ${(s.start).toFixed(1)}–${(s.end).toFixed(1)} → ${(s.atUs / US).toFixed(2)}–${((s.atUs + s.durUs) / US).toFixed(2)}  ${s.kind === 'stock' ? 'stock: ' + s.words : path.basename(s.file)}${s.from ? ` from ${s.from}s` : ''}  ${s.anim}  ${s.sfx}`);
if (checkOnly) process.exit(0);

// ---- build on a copy of the template ----
if (capcutRunning()) { console.log('CapCut is running: close it, then run this again.'); process.exit(1); }
copyDraft(TEMPLATE, draftName);
process.on('uncaughtException', e => {
  console.log(`FAILED after copying the template: draft "${draftName}" exists but is unfilled (a plain copy of ${TEMPLATE}).`);
  console.log(`Fix the problem, then rebuild with --name <new name>; the founder can delete "${draftName}" in CapCut.\n${e.stack}`);
  process.exit(1);
});
const { CapCutDraft } = await import(pathToFileURL(path.join(MCP_DIR, 'src/core.js')));
const d = new CapCutDraft(draftName);
d.templates(); // harvest the template's samples (picture, clip, caption, voice) before removing them
const track = name => { const i = d.content.tracks.findIndex(t => t.name === name); if (i < 0) throw new Error(`template has no "${name}" track`); return i; };
const [main, captions, logo, endcard, voice] = ['main', 'captions', 'logo', 'endcard', 'voice'].map(track);
const matOf = seg => d.content.materials.videos.find(m => m.id === seg.material_id);
const card = d.content.tracks[main].segments.find(s => matOf(s)?.material_name === ACORN);
const link = d.content.tracks[endcard].segments[0]; // the template's t.me link, before any stock labels join it
if (!card || !link) throw new Error('template is missing its end card picture or link');
for (const [i, keep] of [[main, card], [captions], [voice]]) for (const s of [...d.content.tracks[i].segments]) if (s !== keep) d.deleteSegment(s.id);

lens.forEach((len, i) => d.addAudio(voiceFiles[i], { atUs: snap(starts[i]), trackIndex: voice }));

let stockPng;
for (const s of shots) {
  let file = s.file;
  if (s.kind === 'stock') {
    stockPng ||= path.join(dir, '_stock-placeholder.png');
    if (!fs.existsSync(stockPng)) execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=0x1f3350:s=1080x1920', '-frames:v', '1', stockPng]);
    file = stockPng;
  }
  let seg;
  if (s.kind === 'clip') {
    const fromUs = Math.round(s.from * US);
    const clipUs = Math.round(seconds(file) * US) - fromUs;
    if (clipUs <= 0) throw new Error(`SHOT ${s.n}: from ${s.from}s is past the end of ${path.basename(file)}`);
    seg = d.addVideo(file, { atUs: s.atUs, durUs: s.durUs, srcStartUs: fromUs, trackIndex: main }).segmentId;
    if (clipUs < s.durUs) { // slow the clip down to fill the shot
      const speed = clipUs / s.durUs;
      d.setProps(seg, { speed });
      d._find(seg).s.source_timerange.duration = Math.round(s.durUs * speed);
      if (speed < 0.6) console.log(`note: SHOT ${s.n} clip slowed to ${(speed * 100).toFixed(0)}% to fill the shot`);
    }
  } else seg = d.addImage(file, { atUs: s.atUs, durUs: s.durUs, trackIndex: main }).segmentId;
  const dur = s.durUs;
  if (s.anim === 'zoom-in') d.setKeyframes(seg, 'scale', [{ tUs: 0, value: 1 }, { tUs: dur, value: ZOOM }]);
  if (s.anim === 'zoom-out') d.setKeyframes(seg, 'scale', [{ tUs: 0, value: ZOOM }, { tUs: dur, value: 1 }]);
  if (s.anim === 'slide-in') d.setKeyframes(seg, 'posX', [{ tUs: 0, value: 2 }, { tUs: Math.min(snap(SLIDE_IN), dur), value: 0 }]);
  if (s.caption) d.addText(s.caption, { atUs: s.atUs, durUs: s.durUs, trackIndex: captions });
  if (s.kind === 'stock') d.addText(`stock: ${s.words}`, { atUs: s.atUs, durUs: s.durUs, posY: 0.2, trackIndex: endcard });
}

// sound effects at each shot's start, on as many tracks as needed so none overlap
const sfxTracks = [];
for (const s of shots.filter(s => s.sfxFile)) {
  const len = Math.round(seconds(s.sfxFile) * US);
  let t = sfxTracks.find(t => t.free <= s.atUs);
  if (!t) { t = { index: d.addTrack('audio', `sfx ${sfxTracks.length + 1}`), free: 0 }; sfxTracks.push(t); }
  d.addAudio(s.sfxFile, { atUs: s.atUs, trackIndex: t.index, volume: SFX_VOLUME });
  t.free = s.atUs + len;
}

// the logo runs until the end card; the end card and its link move to the end
d.trimSegment(d.content.tracks[logo].segments[0].id, { atUs: 0, durUs: ecStartUs });
for (const s of [card, link]) {
  d.moveSegment(s.id, ecStartUs);
  d.trimSegment(s.id, { durUs: ecEndUs - ecStartUs });
}

const v = d.validate();
if (!v.ok) { console.log('NOT SAVED, validation failed:', v.issues.join('; ')); process.exit(1); }
const r = d.save();
console.log(`saved draft "${draftName}": ${r.durationSec}s, ${shots.length} shots, ${shots.filter(s => s.caption).length} captions, ${shots.filter(s => s.sfxFile).length} sound effects`);
if (stockPng) console.log('stock shots are navy placeholders with their search words: drop the real clips in by hand in CapCut');
