// Copy a CapCut draft the way CapCut's own Duplicate does: the whole folder, a new draft_id,
// and an entry in root_meta_info.json (CapCut's draft list; it ignores a copy that isn't listed).
// capcut-mcp's capcut_clone_draft skips subfolders and keeps the original's id, so don't use it.
// CLI: node draft-copy.mjs <source draft> <new draft>
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { DRAFTS_DIR, capcutRunning } from './common.mjs';

export function copyDraft(srcName, dstName) {
  if (/[\\/:*?"<>|]/.test(dstName)) throw new Error(`bad draft name: ${dstName}`);
  if (capcutRunning()) throw new Error('CapCut is running: close it first');
  const root = DRAFTS_DIR.replace(/\\/g, '/');
  let src = `${root}/${srcName}`;
  const dst = `${root}/${dstName}`;
  const rootPath = `${root}/root_meta_info.json`;
  const rootMeta = JSON.parse(fs.readFileSync(rootPath, 'utf8'));
  let srcEntry = rootMeta.all_draft_store.find(e => e.draft_fold_path === src);
  if (!srcEntry) { // deleted in CapCut: it waits in CapCut's recycle bin, which keeps its own list
    const bin = `${root}/.recycle_bin`;
    const binList = `${bin}/root_meta_info.json`;
    srcEntry = fs.existsSync(binList) && JSON.parse(fs.readFileSync(binList, 'utf8')).all_draft_store.find(e => e.draft_name === srcName);
    if (!srcEntry || !fs.existsSync(`${bin}/${srcName}`)) throw new Error(`source draft not in CapCut's list or its recycle bin: ${srcName}`);
    src = `${bin}/${srcName}`;
    console.log(`note: ${srcName} is in CapCut's recycle bin; copied from there. Restore it in CapCut to keep it.`);
  }
  if (fs.existsSync(dst) || rootMeta.all_draft_store.some(e => e.draft_name === dstName)) throw new Error(`draft already exists: ${dstName}`);

  const skip = /(^\.locked$|\.mcpbak$|\.after-mcp$)/;
  fs.cpSync(src, dst, { recursive: true, filter: p => !skip.test(path.basename(p)) });

  const id = crypto.randomUUID().toUpperCase();
  const nowUs = Date.now() * 1000;
  const metaPath = `${dst}/draft_meta_info.json`;
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  Object.assign(meta, { draft_id: id, draft_name: dstName, draft_fold_path: dst, draft_root_path: root });
  fs.writeFileSync(metaPath, JSON.stringify(meta));

  fs.copyFileSync(rootPath, rootPath + '.oakbak');
  rootMeta.all_draft_store.unshift({
    ...srcEntry, draft_id: id, draft_name: dstName, draft_fold_path: dst,
    draft_cover: `${dst}\\draft_cover.jpg`, draft_json_file: `${dst}\\draft_content.json`,
    tm_draft_create: nowUs, tm_draft_modified: nowUs,
  });
  rootMeta.draft_ids = rootMeta.all_draft_store.length;
  fs.writeFileSync(rootPath + '.tmp', JSON.stringify(rootMeta));
  fs.renameSync(rootPath + '.tmp', rootPath);
  return { created: dstName, draft_id: id, from: srcName };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [src, dst] = process.argv.slice(2);
  if (!src || !dst) { console.error('usage: node draft-copy.mjs <source draft> <new draft>'); process.exit(2); }
  console.log(JSON.stringify(copyDraft(src, dst)));
}
