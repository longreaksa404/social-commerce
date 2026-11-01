// Run the HyperFrames CLI in a video's hf/ project, through the Claude Code plugin's launcher (it pins the
// plugin's CLI version; see the plugin's hyperframes/references/plugin-installation.md).
// Usage: node hf.mjs <video folder> <command> [args]
//   e.g. check --json | snapshot --at 0,9.6 | snapshot --review | preview --background | preview --status |
//        render --quality delivery -o ../<VIDEO>.mp4 | audio assets/sfx/x.mp3 --json
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

// the installed plugin's folder (user scope: `claude plugin install hyperframes@hyperframes`)
export function pluginRoot() {
  const list = path.join(os.homedir(), '.claude/plugins/installed_plugins.json');
  const entry = fs.existsSync(list) && JSON.parse(fs.readFileSync(list, 'utf8')).plugins?.['hyperframes@hyperframes']?.[0];
  if (!entry || !fs.existsSync(entry.installPath)) throw new Error('the HyperFrames plugin is not installed: run `claude plugin marketplace add heygen-com/hyperframes` and `claude plugin install hyperframes@hyperframes`');
  return entry.installPath;
}

export function runCli(cwd, args, { capture = false } = {}) {
  const launcher = path.join(pluginRoot(), 'skills/hyperframes/scripts/plugin-cli.mjs');
  const r = spawnSync(process.execPath, [launcher, ...args], { cwd, stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit', encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.error) throw r.error;
  return capture ? r.stdout : r.status;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [folder, ...args] = process.argv.slice(2);
  if (!folder || !args.length) { console.error('usage: node hf.mjs <video folder> <command> [args]'); process.exit(2); }
  const dir = path.resolve(folder);
  const cwd = fs.existsSync(path.join(dir, 'hyperframes.json')) ? dir : path.join(dir, 'hf');
  process.exit(runCli(cwd, args) ?? 1);
}
