// Shorten the long pauses in a voice MP3 to a natural length; the words themselves are never cut.
// Gemini can leave 0.5-1 s of silence between phrases (a <short pause> or a calm style); everyday talk has
// about 0.25-0.4 s. A pause is quieter than -30 dB for 0.12 s or more (the same as timing.mjs). One longer than
// --max becomes --max plus a quarter of the rest, cut from its middle: longer pauses stay a little longer, so
// timing.mjs still tells a sentence break from a pause inside a sentence. Breaths stay unless --no-breaths
// (a loud sigh between lines sounds acted): then a breath counts as part of the pause around it.
// The untouched take is kept once as _<name>_raw.mp3 next to it, and every run starts from that copy
// (voice.mjs deletes it when it makes a new take).
// Usage: node tighten.mjs <voice.mp3> [--max 0.3] [--no-breaths]
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { seconds, soundStretches, isBreath } from './common.mjs';

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--') && !/^[\d.]+$/.test(a));
const max = args.includes('--max') ? +args[args.indexOf('--max') + 1] : 0.3;
if (!file || !(max > 0)) { console.error('usage: node tighten.mjs <voice.mp3> [--max 0.3] [--no-breaths]'); process.exit(2); }

const raw = path.join(path.dirname(file), `_${path.basename(file, '.mp3').replace(/^\d+_\d+_/, '')}_raw.mp3`);
if (!fs.existsSync(raw)) fs.copyFileSync(file, raw);

const len = seconds(raw);
const all = soundStretches(raw), sounds = args.includes('--no-breaths') ? all.filter(p => !isBreath(raw, p)) : all;
const keep = [];
let from = 0;
for (let i = 0; i + 1 < sounds.length; i++) {
  const [a, z] = [sounds[i][1], sounds[i + 1][0]];
  if (z - a <= max) continue;
  const half = (max + (z - a - max) / 4) / 2;
  keep.push([from, a + half]);
  from = z - half;
}
keep.push([from, len]);

const parts = keep.map(([a, z], i) => `[0:a]atrim=${a.toFixed(3)}:${z.toFixed(3)},asetpts=PTS-STARTPTS[p${i}]`);
const filter = `${parts.join(';')};${keep.map((_, i) => `[p${i}]`).join('')}concat=n=${keep.length}:v=0:a=1`;
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-filter_complex', filter, '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '192k', file]);
console.log(`${path.basename(file)}: ${len.toFixed(2)}s → ${seconds(file).toFixed(2)}s (${keep.length - 1} pauses shortened${all.length > sounds.length ? `, ${all.length - sounds.length} breath(s) cut` : ''}; untouched take: ${path.basename(raw)})`);
