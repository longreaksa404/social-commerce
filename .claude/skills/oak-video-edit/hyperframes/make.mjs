// Build a video's HyperFrames project (hf/) from its film.mjs and timing.json: the root and one file per
// scene, plus every asset they name (app screens, fonts, brand marks, sounds, music, the voice MP3s).
// Re-run after the voice changes (timing.mjs first) or after editing film.mjs; it overwrites the generated
// files, so edits made in the HyperFrames preview are lost on the next run (port them into film.mjs).
// Usage: node make.mjs <video folder>
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import * as kit from './kit.mjs';
import { runCli, pluginRoot } from './hf.mjs';
import { parseShotList } from '../scripts/shotlist.mjs';
import { REPO, SFX_DIR, MUSIC_DIR, logNo } from '../scripts/common.mjs';

const BRAND_COLOURS = { navy: [31, 51, 80], white: [255, 255, 255] }; // navy_<file>.png, white_<file>.png
const CAPCUT_FONTS = path.join(process.env.LOCALAPPDATA || '', 'CapCut/User Data/Resources/Font/SystemFont');

export async function make(dir) {
  const HF = path.join(dir, 'hf');
  const timingFile = path.join(dir, 'timing.json'), filmFile = path.join(dir, 'film.mjs');
  if (!fs.existsSync(timingFile)) throw new Error(`no timing.json in ${dir}: run timing.mjs first`);
  if (!fs.existsSync(filmFile)) throw new Error(`no film.mjs in ${dir}: copy one from hyperframes/films/`);
  const T = JSON.parse(fs.readFileSync(timingFile, 'utf8'));
  const plan = parseShotList(fs.readFileSync(path.join(dir, 'shotlist.txt'), 'utf8'));

  const film = (await import(pathToFileURL(filmFile).href + `?t=${Date.now()}`)).default;
  const out = film({ ...kit, T, ...kit.voiceTiming(T) });

  // the project itself: HyperFrames' own scaffold the first time (package.json, hyperframes.json, its CLAUDE.md)
  if (!fs.existsSync(path.join(HF, 'hyperframes.json'))) runCli(dir, ['init', 'hf', '--resolution', 'portrait', '--non-interactive', '--skip-skills', '--skip-transcribe']);
  const voices = plan.voices.map(v => ({ name: v.name, file: `${logNo(plan.video)}_${v.n}_${v.name}.mp3`, start: T.blocks[v.name]?.start ?? 0, len: T.blocks[v.name]?.len }))
    .filter(v => fs.existsSync(path.join(dir, v.file)));
  const index = kit.rootIndex({ ...out, T, voices, generator: 'make.mjs (oak-video-edit skill) from ../film.mjs' });
  fs.mkdirSync(path.join(HF, 'compositions'), { recursive: true });
  fs.writeFileSync(path.join(HF, 'index.html'), index);
  for (const sc of out.scenes) fs.writeFileSync(path.join(HF, 'compositions', `${sc.id}.html`), sc.html);

  // every asset the files name, copied (or made) into hf/assets
  const need = new Set();
  for (const html of [index, ...out.scenes.map(sc => sc.html)]) for (const m of html.matchAll(/assets\/([a-z]+)\/([\w.-]+\.(?:png|jpg|ttf|mp3))/g)) need.add(`${m[1]}/${m[2]}`);
  const missing = [];
  for (const rel of need) {
    const dst = path.join(HF, 'assets', rel);
    const [kind, name] = rel.split('/');
    const src = {
      // the film's `screens` picks the set: 'km' (Oak Phone, the default) or 'clothing/km' (Oak Wear)
      screens: () => path.join(REPO, 'backend/marketing/out', out.screens ?? 'km', name),
      fonts: () => name === 'NotoSansKhmer-Bold.ttf' ? path.join(REPO, 'brand/fonts', name) : path.join(CAPCUT_FONTS, name),
      sfx: () => name.startsWith('hf-') ? path.join(pluginRoot(), 'skills/media-use/audio/assets/sfx', name.slice(3)) : path.join(SFX_DIR, name.replace(/^mx-/, '')),
      audio: () => voices.some(v => v.file === name) ? path.join(dir, name) : path.join(MUSIC_DIR, name),
      brand: () => path.join(REPO, 'brand', name.replace(/^(navy|white)_/, '')),
      local: () => path.join(dir, name), // a picture made for this video, kept in its folder (e.g. 005's link card)
    }[kind]?.();
    if (!src || !fs.existsSync(src)) { missing.push(`${rel} (looked for ${src})`); continue; }
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    const colour = kind === 'brand' && BRAND_COLOURS[name.split('_')[0]];
    if (colour) { // a dark-on-white brand picture, recoloured with a transparent background
      if (!fs.existsSync(dst)) execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-vf', `format=rgba,geq=r=${colour[0]}:g=${colour[1]}:b=${colour[2]}:a='clip((255-(0.299*r(X,Y)+0.587*g(X,Y)+0.114*b(X,Y)))*255/205,0,255)'`, dst]);
    } else if (!fs.existsSync(dst) || fs.statSync(dst).mtimeMs < fs.statSync(src).mtimeMs) fs.copyFileSync(src, dst);
  }
  const sounds = out.cues.length;
  console.log(`hf/: ${out.END}s, ${out.scenes.map(sc => `${sc.id} ${kit.r3(sc.start)}–${kit.r3(sc.start + sc.duration)}`).join(', ')}; ${out.summary ? out.summary + ', ' : ''}${sounds} sounds, ${voices.length} voice blocks${T.estimated ? ' (timing estimated)' : ''}`);
  if (missing.length) console.log('MISSING assets:\n- ' + missing.join('\n- '));
  return { out, missing };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const folder = process.argv[2];
  if (!folder) { console.error('usage: node make.mjs <video folder>'); process.exit(2); }
  const { missing } = await make(path.resolve(folder));
  process.exit(missing.length ? 1 : 0);
}
