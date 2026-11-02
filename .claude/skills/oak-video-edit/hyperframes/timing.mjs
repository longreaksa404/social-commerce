// Write a video's timing.json, the clock its film runs on: each voice block's start, length and phrases.
// With the voice MP3s: blocks end to end, 0.25 s apart; phrases are the speech between pauses of 0.12 s or more
// (breaths, short and quiet, don't count), joined across the shortest pauses down to the text's phrase count.
// Without them: an estimate from the shot list's planned VOICE times, each block's text split into phrases at
// ។ ៖ ? ! and <short pause>/<long pause>, sized by their length (marked "estimated"; kept unless --estimate).
// Usage: node timing.mjs <video folder> [--estimate]
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { parseShotList } from '../scripts/shotlist.mjs';
import { seconds, logNo } from '../scripts/common.mjs';

const VOICE_GAP = 0.25;

function phrases(file) {
  const log = spawnSync('ffmpeg', ['-v', 'info', '-i', file, '-af', 'silencedetect=noise=-30dB:d=0.12', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const out = [], len = seconds(file);
  let start = 0;
  for (const m of log.matchAll(/silence_(start|end): ([\d.]+)/g)) {
    if (m[1] === 'start') { if (+m[2] - start > 0.05) out.push([+start.toFixed(2), +(+m[2]).toFixed(2)]); }
    else start = +m[2];
  }
  if (len - start > 0.05) out.push([+start.toFixed(2), +len.toFixed(2)]);
  // a breath between phrases reads as a short, quiet "phrase" (peak about -24 dB; speech peaks above -10 dB)
  return out.filter(([a, z]) => z - a >= 0.3 || peak(file, a, z - a) > -18);
}

function peak(file, at, len) {
  const log = spawnSync('ffmpeg', ['-v', 'info', '-ss', String(at), '-t', String(len), '-i', file, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  return parseFloat((log.match(/max_volume: ([-\d.]+) dB/) || [])[1] ?? '0');
}

// the planned phrases: the text between ។ ៖ ? ! and the pause tags
const planned = text => text.split(/<(?:short|long) pause>|[។៖?!]/).map(s => s.replace(/<[^>]+>/g, '').trim()).filter(Boolean);

// the voice may also pause inside a planned phrase (at a space): join across the shortest gaps until the counts match
function fit(phrases, n) {
  const out = phrases.map(p => [...p]);
  while (out.length > n) {
    let k = 0;
    for (let i = 1; i < out.length - 1; i++) if (out[i + 1][0] - out[i][1] < out[k + 1][0] - out[k][1]) k = i;
    out.splice(k, 2, [out[k][0], out[k + 1][1]]);
  }
  return out;
}

function estimate(text, len) {
  const parts = planned(text);
  const gap = 0.2, speak = len - gap * (parts.length - 1), total = parts.reduce((n, s) => n + s.length, 0);
  let t = 0;
  return parts.map(s => { const d = speak * s.length / total, ph = [+t.toFixed(2), +(t + d).toFixed(2)]; t += d + gap; return ph; });
}

export function writeTiming(dir, { forceEstimate = false } = {}) {
  const plan = parseShotList(fs.readFileSync(path.join(dir, 'shotlist.txt'), 'utf8'));
  const file = path.join(dir, 'timing.json');
  const mp3s = plan.voices.map(v => path.join(dir, `${logNo(plan.video)}_${v.n}_${v.name}.mp3`));
  const blocks = {}; let t = 0, T;
  if (mp3s.every(f => fs.existsSync(f))) {
    plan.voices.forEach((v, i) => {
      const len = +seconds(mp3s[i]).toFixed(3), heard = phrases(mp3s[i]), n = planned(v.text).length;
      if (heard.length < n) console.log(`  ${v.name}: the voice made ${heard.length} phrases, the text has ${n}: the film falls back to even spacing (retake, or snapshot the beats)`);
      blocks[v.name] = { start: +t.toFixed(3), len, phrases: fit(heard, n) }; t += len + VOICE_GAP;
    });
    T = { estimated: false, blocks, voiceEnd: +(t - VOICE_GAP).toFixed(3) };
  } else if (fs.existsSync(file) && !forceEstimate) {
    console.log(`no voice yet (${mp3s.filter(f => !fs.existsSync(f)).map(f => path.basename(f)).join(', ')} missing): kept timing.json`);
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } else {
    plan.voices.forEach(v => { const len = v.end - v.start; blocks[v.name] = { start: +t.toFixed(3), len, phrases: estimate(v.text, len) }; t += len + VOICE_GAP; });
    T = { estimated: true, note: 'Guessed from the shot list until the voice is made; timing.mjs rewrites this from the MP3s.', blocks, voiceEnd: +(t - VOICE_GAP).toFixed(3) };
  }
  fs.writeFileSync(file, JSON.stringify(T, null, 1));
  return T;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const folder = process.argv.slice(2).find(a => !a.startsWith('--'));
  if (!folder) { console.error('usage: node timing.mjs <video folder> [--estimate]'); process.exit(2); }
  const T = writeTiming(path.resolve(folder), { forceEstimate: process.argv.includes('--estimate') });
  for (const [name, b] of Object.entries(T.blocks)) console.log(`  ${name.padEnd(6)} ${b.start.toFixed(2)}–${(b.start + b.len).toFixed(2)}s  ${b.phrases.length} phrases: ${b.phrases.map(([a, z]) => `${a.toFixed(2)}–${z.toFixed(2)}`).join('  ')}`);
  console.log(`voice ends ${T.voiceEnd}s${T.estimated ? ' (estimated)' : ''}`);
}
