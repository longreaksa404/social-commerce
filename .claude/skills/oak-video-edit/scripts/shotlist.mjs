// Parse a shot-list block (the format is in ../SKILL.md). Times are seconds ("4.5") or m:ss ("0:04.5").

function toSec(s) {
  s = String(s).trim();
  if (/^\d+:\d+(\.\d+)?$/.test(s)) { const [m, x] = s.split(':'); return +m * 60 + +x; }
  const v = Number(s);
  if (!Number.isFinite(v)) throw new Error(`bad time: "${s}"`);
  return v;
}
function parseRange(s) {
  const parts = String(s || '').replace(/s\b/g, '').split(/\s*[–—-]\s*/);
  if (parts.length !== 2) throw new Error(`bad time range: "${s}" (want start–end)`);
  return parts.map(toSec);
}
// "anim: zoom-in" -> ['anim', 'zoom-in']; only the first colon splits, so captions may contain colons
function field(x) { const i = x.indexOf(':'); return i < 0 ? [x.trim().toLowerCase(), ''] : [x.slice(0, i).trim().toLowerCase(), x.slice(i + 1).trim()]; }

export function parseShotList(text) {
  const plan = { video: null, voices: [], audio: null, shots: [], endCard: false };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('```')) continue;
    const [head, ...rest] = line.split('|').map(s => s.trim());
    if (/^VIDEO\s/i.test(head)) plan.video = head.replace(/^VIDEO\s+/i, '').trim();
    else if (/^VOICE\s+\d/i.test(head)) {
      // VOICE <n> | <start>–<end> | <name> | <voice text> [| style: ...]
      const [times, name, voiceText, ...opts] = rest;
      const [start, end] = parseRange(times);
      const style = opts.map(field).find(([k]) => k === 'style')?.[1];
      plan.voices.push({ n: +head.match(/\d+/)[0], start, end, name: (name || '').toLowerCase(), text: voiceText || '', style });
    } else if (/^AUDIO\b/i.test(head)) plan.audio = [head.replace(/^AUDIO\s*/i, ''), ...rest].map(s => s.trim()).filter(Boolean);
    else if (/^SHOT\s+\d/i.test(head)) {
      // SHOT <n> | <start>–<end> | <source> | anim: … | sfx: … | caption: …
      const [times, src, ...fields] = rest;
      const [start, end] = parseRange(times);
      const f = Object.fromEntries(fields.map(field));
      plan.shots.push({
        n: +head.match(/\d+/)[0], start, end, src: (src || '').trim(),
        anim: (f.anim || 'none').toLowerCase(), sfx: (f.sfx || 'none').toLowerCase(), caption: f.caption || '',
      });
    } else if (/^END\s*CARD/i.test(head)) plan.endCard = true;
    else throw new Error(`can't read this line: ${line}`);
  }

  const errors = [];
  if (!plan.video || !/^\d+_/.test(plan.video)) errors.push('VIDEO <log#>_<type>_<topic> is missing or has no log number');
  if (plan.audio && plan.audio.length !== 4) errors.push(`AUDIO needs 4 files, has ${plan.audio.length}`);
  if (!plan.audio) {
    const ns = plan.voices.map(v => v.n).join(',');
    if (ns !== '1,2,3,4') errors.push(`need VOICE 1–4 (or an AUDIO line), have: ${ns || 'none'}`);
    let vt = 0;
    for (const v of plan.voices) {
      if (!v.text) errors.push(`VOICE ${v.n} has no text`);
      if (Math.abs(v.start - vt) > 0.3) errors.push(`VOICE ${v.n} starts at ${v.start}s, expected ${vt}s (blocks must follow each other)`);
      v.start = vt;
      if (!(v.end > v.start)) errors.push(`VOICE ${v.n} ends before it starts`);
      vt = v.end;
    }
  }
  if (!plan.shots.length) errors.push('no SHOT lines');
  plan.shots.sort((a, b) => a.start - b.start);
  // shots must tile the timeline from 0: small slips are snapped to the previous end
  let t = 0;
  for (const s of plan.shots) {
    if (Math.abs(s.start - t) > 0.3) errors.push(`SHOT ${s.n} starts at ${s.start}s, expected ${t}s (shots must follow each other)`);
    s.start = t;
    if (!(s.end > s.start)) errors.push(`SHOT ${s.n} ends before it starts`);
    t = s.end;
    if (!['none', 'zoom-in', 'zoom-out', 'slide-in'].includes(s.anim)) errors.push(`SHOT ${s.n}: unknown anim "${s.anim}"`);
  }
  if (errors.length) throw new Error('shot list problems:\n- ' + errors.join('\n- '));
  return plan;
}
