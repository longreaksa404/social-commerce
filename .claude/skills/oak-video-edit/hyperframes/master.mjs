// Bring a rendered MP4's sound to the feed's loudness (-15 LUFS, peaks under -1.5 dBTP); the picture is copied.
// HyperFrames' mix lands quieter (video 002: -18.8 LUFS: the voice's pauses and the music-only end card), and
// raising it plainly would clip, so it is ffmpeg's two-pass loudnorm. The render before is kept as _<name>_unmastered.mp4.
// Usage: node master.mjs <video.mp4>
import fs from 'fs';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';

const file = process.argv[2];
if (!file || !fs.existsSync(file)) { console.error('usage: node master.mjs <video.mp4>'); process.exit(2); }
const raw = path.join(path.dirname(file), `_${path.basename(file, '.mp4')}_unmastered.mp4`);
if (!fs.existsSync(raw)) fs.renameSync(file, raw);

const TARGET = 'I=-15:TP=-1.5:LRA=11';
const log = spawnSync('ffmpeg', ['-v', 'info', '-i', raw, '-af', `loudnorm=${TARGET}:print_format=json`, '-vn', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
const m = JSON.parse(log.slice(log.lastIndexOf('{'), log.lastIndexOf('}') + 1));
const second = `loudnorm=${TARGET}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-c:v', 'copy', '-af', second, '-ar', '48000', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', file]);

const after = spawnSync('ffmpeg', ['-v', 'info', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
const I = (after.match(/I:\s+(-?[\d.]+) LUFS/g) || []).pop(), peak = (after.match(/Peak:\s+(-?[\d.]+) dBFS/g) || []).pop();
console.log(`${path.basename(file)}: ${m.input_i} LUFS → ${I?.replace(/\s+/g, ' ')}, true peak ${peak?.replace(/\s+/g, ' ')} (before: ${path.basename(raw)})`);
