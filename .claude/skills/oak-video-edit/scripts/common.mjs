// Paths and helpers shared by the oak-video-edit scripts. Windows laptop only.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
export const VIDEO_ROOT = process.env.OAK_VIDEO_DIR || path.join(process.env.USERPROFILE, 'Documents/Video Marketing/Oak Order');
export const SFX_DIR = path.join(VIDEO_ROOT, 'Sound effects');
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
