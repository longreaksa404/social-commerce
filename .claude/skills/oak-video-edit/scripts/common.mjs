// Paths and helpers shared by the oak-video-edit scripts. Windows laptop only.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync, spawnSync } from 'child_process';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
export const VIDEO_ROOT = process.env.OAK_VIDEO_DIR || path.join(process.env.USERPROFILE, 'Documents/Video Marketing/Oak Order');
export const SFX_DIR = path.join(VIDEO_ROOT, 'Sound effects');
export const MUSIC_DIR = path.join(VIDEO_ROOT, 'Music');
export const ASSETS = path.join(REPO, 'backend/marketing/out'); // shots.py's pictures and clips
export const MCP_DIR = process.env.CAPCUT_MCP_DIR || path.join(process.env.USERPROFILE, 'mcp/capcut-mcp');
export const DRAFTS_DIR = (process.env.CAPCUT_DRAFTS_DIR ||= path.join(process.env.LOCALAPPDATA, 'CapCut/User Data/Projects/com.lveditor.draft').replace(/\\/g, '/'));
export const TEMPLATE = 'oak-template';

// the Gemini key from the repo's git-ignored .env; never printed
export function geminiKey() {
  const env = fs.readFileSync(path.join(REPO, '.env'), 'utf8');
  const key = (env.match(/^\s*GEMINI_API_KEY\s*=\s*"?([^"\r\n]+)"?/m) || [])[1]?.trim();
  if (!key) throw new Error('GEMINI_API_KEY is missing from the repo .env (see .env.example)');
  return key;
}

export function capcutRunning() {
  return /CapCut\.exe/i.test(execFileSync('tasklist', ['/FI', 'IMAGENAME eq CapCut.exe', '/NH'], { encoding: 'utf8' }));
}

export function seconds(file) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim();
  const v = parseFloat(out);
  if (!Number.isFinite(v)) throw new Error(`can't read the length of ${file}`);
  return v;
}

export const videoDir = name => path.join(VIDEO_ROOT, name);
export const logNo = videoName => videoName.split('_')[0];

// seconds of voiced sound (a pitch between 70 and 400 Hz) in a stretch of an audio file: a word has some, a breath
// or a sigh has none
export function voicedSeconds(file, at, len) {
  const SR = 16000, buf = execFileSync('ffmpeg', ['-v', 'error', '-ss', String(at), '-t', String(len), '-i', file, '-ac', '1', '-ar', String(SR), '-f', 's16le', '-']);
  const x = new Float32Array(buf.length / 2).map((_, i) => buf.readInt16LE(i * 2) / 32768);
  const W = 640, H = 160, lo = Math.floor(SR / 400), hi = Math.floor(SR / 70);
  let n = 0;
  for (let s = 0; s + W + hi < x.length; s += H) {
    let best = 0;
    for (let L = lo; L <= hi; L++) {
      let num = 0, d1 = 0, d2 = 0;
      for (let i = 0; i < W; i++) { num += x[s + i] * x[s + i + L]; d1 += x[s + i] ** 2; d2 += x[s + i + L] ** 2; }
      best = Math.max(best, num / Math.sqrt(d1 * d2 + 1e-12));
    }
    if (best > 0.6) n++;
  }
  return n * H / SR;
}

// the stretches of sound in a voice take: between pauses quieter than -30 dB for 0.12 s or more
export function soundStretches(file) {
  const log = spawnSync('ffmpeg', ['-v', 'info', '-i', file, '-af', 'silencedetect=noise=-30dB:d=0.12', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const out = [], len = seconds(file);
  let start = 0;
  for (const m of log.matchAll(/silence_(start|end): ([\d.]+)/g)) {
    if (m[1] === 'start') { if (+m[2] - start > 0.05) out.push([+start.toFixed(2), +(+m[2]).toFixed(2)]); }
    else start = +m[2];
  }
  if (len - start > 0.05) out.push([+start.toFixed(2), +len.toFixed(2)]);
  return out;
}

// a breath or a sigh: a short stretch with no pitch in it
export const isBreath = (file, [a, z]) => z - a < 0.5 && voicedSeconds(file, a, z - a) < 0.05;
