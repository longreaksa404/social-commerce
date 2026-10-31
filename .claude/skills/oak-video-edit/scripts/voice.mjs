// Make the 4 voice MP3s for a shot list with Gemini TTS (Interactions API). Never prints the key.
// Speaker and style lines come from docs/02_video_playbook.md "Voice recipe" unless a VOICE line has its own style.
// Usage: node voice.mjs <shotlist.txt> [--only 2] [--force] [--check]
//   existing MP3s are kept unless --force (all) or --only <n> (that block); --check transcribes each new block
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { parseShotList } from './shotlist.mjs';
import { REPO, geminiKey, seconds, logNo } from './common.mjs';

const MODEL = process.env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-tts';
const CHECK_MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-3.8-flash';
const API = 'https://generativelanguage.googleapis.com/v1beta';

const args = process.argv.slice(2);
const listFile = args.find(a => !a.startsWith('--') && !/^\d+$/.test(a));
const only = args.includes('--only') ? +args[args.indexOf('--only') + 1] : null;
const force = args.includes('--force'), check = args.includes('--check');
if (!listFile) { console.error('usage: node voice.mjs <shotlist.txt> [--only n] [--force] [--check]'); process.exit(2); }

const plan = parseShotList(fs.readFileSync(listFile, 'utf8'));
if (plan.audio) { console.log('This shot list has an AUDIO line (ready-made MP3s): nothing to make.'); process.exit(0); }
const dir = path.dirname(path.resolve(listFile));
const key = geminiKey();

// playbook: "Speaker: Nika (...)" and "1. Hook: `style`" … "4. Offer + CTA: `style`"
const playbook = fs.readFileSync(path.join(REPO, 'docs/02_video_playbook.md'), 'utf8');
const recipe = playbook.slice(playbook.indexOf('## Voice recipe'));
const speaker = (recipe.match(/Speaker:\s*([^\s(]+)/) || [])[1];
const styles = [...recipe.matchAll(/^\s*([1-4])\.\s*[^:`]+:\s*`([^`]+)`/gm)].reduce((m, x) => ({ ...m, [x[1]]: x[2] }), {});
if (!speaker || Object.keys(styles).length !== 4) throw new Error('could not read Speaker and the 4 style lines from the playbook\'s Voice recipe');

async function call(url, init, what) {
  for (const wait of [0, 5, 15, 30, 60]) {
    if (wait) { console.log(`  ${what}: busy, retrying in ${wait}s`); await new Promise(r => setTimeout(r, wait * 1000)); }
    const res = await fetch(url, { ...init, headers: { 'x-goog-api-key': key, 'content-type': 'application/json' } });
    const body = await res.json().catch(() => ({}));
    if (res.ok) return body;
    if (![429, 500, 502, 503, 504].includes(res.status)) throw new Error(`${what}: HTTP ${res.status} ${JSON.stringify(body.error || body).slice(0, 400)}`);
  }
  throw new Error(`${what}: still busy after several tries; try again later`);
}

async function voiceId(name) {
  const body = await call(`${API}/voices?search=${encodeURIComponent(name)}&page_size=50`, {}, 'voice lookup');
  const v = (body.voices || []).find(v => v.display_name?.toLowerCase() === name.toLowerCase()) || (body.voices || [])[0];
  if (!v) throw new Error(`no Gemini voice called ${name}`);
  return v.id;
}

async function speak(voice, style, text, out) {
  const body = await call(`${API}/interactions`, {
    method: 'POST',
    body: JSON.stringify({
      model: MODEL,
      input: [{ type: 'user_input', content: [{ type: 'text', text, annotations: [{ type: 'speech_metadata', style }] }] }],
      response_format: { type: 'audio' },
      generation_config: { speech_config: [{ voice }] },
    }),
  }, path.basename(out));
  const audio = (body.steps || []).filter(s => s.type === 'model_output').flatMap(s => s.content || []).find(c => c.type === 'audio' && c.data);
  if (!audio) throw new Error(`no audio for ${path.basename(out)}: ${JSON.stringify(body).slice(0, 300)}`);
  const wav = out.replace(/\.mp3$/i, '.raw.wav');
  fs.writeFileSync(wav, Buffer.from(audio.data, 'base64'));
  // trim silence at both ends (reverse trick), even out loudness like the sound effects
  const trim = 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05';
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', wav, '-af', `${trim},areverse,${trim},areverse,loudnorm=I=-16:TP=-1.5:LRA=11`, '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '192k', out]);
  fs.unlinkSync(wav);
}

async function transcribe(file) {
  const body = await call(`${API}/models/${CHECK_MODEL}:generateContent`, {
    method: 'POST',
    body: JSON.stringify({ contents: [{ parts: [
      { inlineData: { mimeType: 'audio/mp3', data: fs.readFileSync(file).toString('base64') } },
      { text: 'Transcribe exactly what is spoken, in the script it is spoken in. One line. If any English instruction is spoken, add " [INSTRUCTION SPOKEN]".' },
    ] }] }),
  }, 'check');
  return body.candidates?.[0]?.content?.parts?.map(p => p.text).join('').trim();
}

const voice = await voiceId(speaker);
console.log(`speaker ${speaker} (${voice}), model ${MODEL}, into ${dir}`);
for (const v of plan.voices) {
  const out = path.join(dir, `${logNo(plan.video)}_${v.n}_${v.name}.mp3`);
  const redo = force || only === v.n;
  if (only && only !== v.n) continue;
  if (fs.existsSync(out) && !redo) { console.log(`${path.basename(out)}  kept (${seconds(out).toFixed(2)}s)`); continue; }
  await speak(voice, v.style || styles[v.n], v.text, out);
  const len = seconds(out), planned = v.end - v.start;
  const note = len > planned * 1.6 + 1 ? '  ← much longer than planned: check it' : '';
  console.log(`${path.basename(out)}  ${len.toFixed(2)}s (planned ${planned.toFixed(1)}s)${note}`);
  if (check) console.log(`  heard: ${await transcribe(out)}`);
}
