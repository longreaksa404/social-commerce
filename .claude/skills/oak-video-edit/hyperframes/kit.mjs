// The building blocks of an Oak Order HyperFrames film (see ../SKILL.md). make.mjs hands them to a video's
// film.mjs, which returns its scenes; nothing here knows a particular story.
// Rules they follow (HyperFrames' own): every frame is a function of the timeline (seeded randomness, no
// clock), titles land word by word and hold still, sounds peak one frame after their picture.

export const FPS = 30, FR = 1 / FPS;
export const r3 = x => +(+x).toFixed(3);

// ---------- the voice's timing (timing.json from timing.mjs) ----------
// phrase i of a voice block (start, or end) if the voice split into the planned n phrases, else even spacing
export function voiceTiming(T) {
  const ph = (name, i, n, end = false) => {
    const b = T.blocks[name];
    if (b.phrases.length === n) return b.start + b.phrases[i][end ? 1 : 0];
    return b.start + b.len * (i + (end ? 1 : 0)) / n;
  };
  const span = (name, i, n) => ph(name, i, n, true) - ph(name, i, n);
  return { ph, span };
}

// seeded random numbers, so every render places things the same way
export function rng(seed) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
}

// ---------- sound effects ----------
// name: [peak offset in the file, base volume, file length], measured with `hf.mjs <folder> audio <file> --json`.
// hf-* are HyperFrames' bundled sounds (Pixabay licence), mx-* the Mixkit ones in "Sound effects\".
// A new file needs its row here before a film can cue it.
export const SFX = {
  'hf-click': [0.073, 1.6, 0.366], 'mx-tap': [0, 0.55, 0.199], 'hf-pop': [0.12, 0.85, 0.72], 'mx-pop': [0.01, 0.3, 0.168],
  'hf-whoosh': [0.162, 0.5, 0.575], 'mx-swoosh': [0.235, 0.55, 0.72], 'mx-whoosh': [0.721, 0.5, 1.757],
  'hf-riser': [3.472, 0.28, 4.4], 'hf-impact-bass-1': [0.073, 0.22, 2.116],
  'mx-typing': [0.128, 0.45, 1.3], // keys every ~0.25 s; only its first 1.3 s (the file runs 4.5 s)
};
// repeated kinds rotate takes (the same whoosh on every cut is the commonest tell)
export const TAKES = { click: ['hf-click', 'mx-tap'], pop: ['hf-pop', 'mx-pop'], whoosh: ['hf-whoosh', 'mx-swoosh', 'mx-whoosh'] };
// cue(at, kind or name, gain): the sound's peak lands one frame after `at`; nothing past the film's end
export function sounds(END) {
  const turn = {}, cues = [];
  const cue = (at, kind, gain = 1) => {
    const name = TAKES[kind] ? TAKES[kind][(turn[kind] = (turn[kind] ?? -1) + 1) % TAKES[kind].length] : kind;
    const [peak, vol, len] = SFX[name];
    const start = at + FR - peak;
    if (start >= 0 && start < END) cues.push({ start: r3(start), name, vol: r3(vol * gain), dur: r3(Math.min(len, END - start)) });
  };
  return { cue, cues };
}

// ---------- scenes, titles, the cursor ----------
export const FONTS = `@font-face { font-family: "Oak Khmer"; src: url("assets/fonts/NotoSansKhmer-Bold.ttf"); font-weight: 700; }
    @font-face { font-family: "Oak Khmer"; src: url("assets/fonts/NotoSansKhmer-Regular.ttf"); font-weight: 400; }`;
export const KH = `"Oak Khmer", Inter, sans-serif`; // Khmer, with Inter for the Latin (Noto Sans Khmer has none)
// a title: one span per word (class w); the scene script lands them
export const words = (id, text, style) => `<div id="${id}" class="ttl" style="${style}">${text.split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ')}</div>`;
export const CURSOR = id => `<div id="${id}" class="cur"><svg class="cur-a" width="78" height="110" viewBox="0 0 28 40"><path d="M2.2 2 L2.2 31 L9.4 24.2 L14 35 L18.6 33 L14.1 22.4 L23.4 22.4 Z" fill="#fff" stroke="#0b0b0b" stroke-width="1.9" stroke-linejoin="round"/></svg></div>`;
const CUR_CSS = `.cur { position:absolute; left:0; top:0; width:78px; height:110px; z-index:50; }
    .cur-a { display:block; transform-origin:6px 5px; filter:drop-shadow(0 8px 12px rgba(0,0,0,.4)); }`;
export const TIP = [6, 5]; // the arrow's tip inside its box
// a scene file: <template> with fonts, title and cursor styles, and a paused timeline with these helpers:
// land(sel, at, step) words in; leave(sel, at) words out; move(cursor, x, y, at, d); press(cursor, at)
export const scene = (id, css, body, js) => `<template>
  <style>
    ${FONTS}
    #root { position:absolute; inset:0; overflow:hidden; font-family:${KH}; }
    .ttl { position:absolute; left:40px; right:40px; text-align:center; font-weight:700; white-space:nowrap; }
    .ttl .w { display:inline-block; }
    ${CUR_CSS}
    ${css}
  </style>
  <div id="root" data-composition-id="${id}" data-width="1080" data-height="1920">
${body}
  </div>
  <script>
    (function () {
      const tl = gsap.timeline({ paused: true });
      const land = (sel, at, step = 0.067) => tl.fromTo(sel, { opacity: 0, filter: "blur(6px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.13, ease: "power2.out", stagger: step }, at);
      const leave = (sel, at) => tl.to(sel, { opacity: 0, filter: "blur(8px)", duration: 0.18, ease: "power2.in", stagger: 0.04 }, at);
      const move = (cur, x, y, at, d = 0.5) => tl.to(cur, { x: x - ${TIP[0]}, y: y - ${TIP[1]}, duration: d, ease: "power2.inOut" }, at);
      const press = (cur, at) => { tl.to(cur + " .cur-a", { scale: 0.85, duration: 0.066, ease: "power2.in" }, at - 0.066); tl.to(cur + " .cur-a", { scale: 1, duration: 0.1, ease: "power2.out" }, at); };
${js}
      window.__timelines["${id}"] = tl;
    })();
  </script>
</template>
`;

// ---------- the app's screens and the iPhone ----------
export const IMG = n => `assets/screens/${n}.png`; // a shots.py picture (Khmer), copied in by make.mjs
// A current iPhone Pro (Cosmic Orange) showing the app straight on: a 390 × (50 + 844) point screen, a status
// bar over the app's screenshots. `id` prefixes every element (e.g. "a2").
export function iphone({ id, K = 1.28, top = 430 }) {
  const SW = 390 * K, SH = 894 * K, BZ = 11, FRM = 8;
  const PW = SW + 2 * (BZ + FRM), PH = SH + 2 * (BZ + FRM), PL = 540 - PW / 2, PT = top;
  const SL = PL + BZ + FRM, ST = PT + BZ + FRM, VT = ST + 50 * K, RAD = 62 * K;
  const at = (x, y) => [r3(SL + x * K), r3(VT + y * K)]; // an app point on the stage
  const crop = (cid, n, x, y, w, hh, extra = '') => `<div id="${cid}" style="position:absolute;left:${r3(x * K)}px;top:${r3(y * K)}px;width:${r3(w * K)}px;height:${r3(hh * K)}px;background:url(${IMG(n)}) ${r3(-x * K)}px ${r3(-y * K)}px / ${r3(SW)}px auto no-repeat;${extra}"></div>`;
  const shot = (sid, n, extra = '') => `<img id="${sid}" src="${IMG(n)}" style="position:absolute;left:0;top:0;width:${r3(SW)}px;${extra}">`;
  const btn = (side, t, len) => `<div class="ph-btn" style="${side}:-5px;top:${r3(t * K)}px;height:${r3(len * K)}px"></div>`;
  const css = `#${id}-phone { position:absolute; left:${r3(PL)}px; top:${PT}px; width:${r3(PW)}px; height:${r3(PH)}px; border-radius:${r3(RAD + BZ + FRM)}px;
      background:linear-gradient(140deg,#ffb27a 0%,#e2662b 22%,#ff9a5c 48%,#e2662b 70%,#b9471b 100%); box-shadow:0 40px 80px rgba(0,0,0,.45), inset 0 0 0 1.5px rgba(255,255,255,.35); }
    .ph-btn { position:absolute; width:7px; border-radius:3px; background:linear-gradient(90deg,#b9471b,#ffb27a,#b9471b); }
    #${id}-bezel { position:absolute; inset:${FRM}px; border-radius:${r3(RAD + BZ)}px; background:#050505; }
    #${id}-screen { position:absolute; inset:${BZ}px; border-radius:${r3(RAD)}px; overflow:hidden; background:#fff; }
    #${id}-status { position:absolute; left:0; top:0; width:${r3(SW)}px; height:${r3(50 * K)}px; display:flex; align-items:center; justify-content:space-between; padding:${r3(4 * K)}px ${r3(34 * K)}px 0 ${r3(44 * K)}px; font:600 28px Inter, sans-serif; color:#000; z-index:5; }
    #${id}-island { position:absolute; left:${r3(SW / 2 - 62 * K)}px; top:${r3(11 * K)}px; width:${r3(124 * K)}px; height:${r3(36 * K)}px; border-radius:${r3(18 * K)}px; background:#000; z-index:9; }
    #${id}-view { position:absolute; left:0; top:${r3(50 * K)}px; width:${r3(SW)}px; height:${r3(844 * K)}px; overflow:hidden; }`;
  // view: the screenshots and crops inside the app area; overlay: things over the whole screen (an alert)
  const html = ({ view, overlay = '' }) => `<div id="${id}-phone">
        ${btn('left', 196, 32)}${btn('left', 266, 62)}${btn('left', 340, 62)}${btn('right', 290, 98)}${btn('right', 610, 58)}
        <div id="${id}-bezel"><div id="${id}-screen">
          <div id="${id}-status"><span>9:41</span><span style="display:flex;gap:9px;align-items:center"><svg width="23" height="15" viewBox="0 0 18 12"><rect x="0" y="8" width="3.2" height="4" rx="1"/><rect x="4.8" y="5.5" width="3.2" height="6.5" rx="1"/><rect x="9.6" y="3" width="3.2" height="9" rx="1"/><rect x="14.4" y="0" width="3.2" height="12" rx="1"/></svg><svg width="23" height="17" viewBox="0 0 18 13" fill="none" stroke="#000" stroke-width="2.2" stroke-linecap="round"><path d="M2 4.6a10 10 0 0 1 14 0"/><path d="M4.8 7.6a6 6 0 0 1 8.4 0"/><circle cx="9" cy="11" r="1.5" fill="#000" stroke="none"/></svg><span style="display:inline-block;width:35px;height:17px;border:2px solid rgba(0,0,0,.45);border-radius:5px;position:relative"><span style="position:absolute;left:2px;top:2px;bottom:2px;width:72%;background:#000;border-radius:2px"></span></span></span></div>
          <div id="${id}-view">
${view}
          </div>
${overlay}
          <div id="${id}-island"></div>
        </div></div>
      </div>`;
  // a piece of a screen that lifts out to `to` (its middle, stage px) at `sc` × and goes back at tOut
  const lift = (lid, r, to, sc, tIn, tOut) => {
    const [x0, y0] = at(r[0], r[1]), w = r[2] * K, hh = r[3] * K;
    const tx = r3(to[0] - w * sc / 2), ty = r3(to[1] - hh * sc / 2);
    return `      tl.fromTo("#${lid}", { x: ${x0}, y: ${y0}, scale: 1, opacity: 0 }, { opacity: 1, duration: 0.05, ease: "none" }, ${tIn});
      tl.to("#${lid}", { x: ${tx}, y: ${ty}, scale: ${sc}, duration: ${r3(Math.min(0.45, tOut - tIn - 0.02))}, ease: "expo.out" }, ${tIn});
      tl.to("#${lid}", { x: ${x0}, y: ${y0}, scale: 1, duration: 0.25, ease: "power3.in" }, ${tOut});
      tl.to("#${lid}", { opacity: 0, duration: 0.05, ease: "none" }, ${r3(tOut + 0.25)});\n`;
  };
  const liftBox = (lid, n, r) => `      <div id="${lid}" class="lift" style="width:${r3(r[2] * K)}px;height:${r3(r[3] * K)}px;opacity:0;background-image:url(${IMG(n)});background-size:${r3(SW)}px auto;background-position:${r3(-r[0] * K)}px ${r3(-r[1] * K)}px"></div>`;
  const LIFT_CSS = `.lift { position:absolute; left:0; top:0; transform-origin:0 0; border-radius:14px; background-repeat:no-repeat; background-color:#fff; box-shadow:0 18px 40px rgba(0,0,0,.4); z-index:20; }`;
  return { K, SW, SH, BZ, FRM, PW, PH, PL, PT, SL, ST, VT, RAD, at, crop, shot, css, html, lift, liftBox, LIFT_CSS };
}

// ---------- the shop link's preview card (the picture card a link gets in Facebook and Telegram) ----------
export const LINK_ICON = '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#12a37a" stroke-width="2.4" stroke-linecap="round"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3.2-3.2a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3.2 3.2a4.5 4.5 0 0 0 6.4 6.4l1-1"/></svg>';
export function linkCard({ w = 860, h = 447, title = 'Oak Phone · Oak Order', url = 'order.oaksolve.com/shop/zdpb5d', cover = '01_shop' } = {}) {
  const html = top => `<div class="lp" style="top:${top}px"><div class="lp-img"></div><div class="lp-b"><div class="lp-t">${title}</div><div class="lp-u">${LINK_ICON}${url}</div></div></div>`;
  const css = `.lp { position:absolute; left:0; width:${w}px; height:${h}px; background:#fff; border-radius:30px; overflow:hidden; box-shadow:0 30px 70px rgba(0,0,0,.4); }
    .lp-img { height:287px; background:url(${IMG(cover)}) 0px -123px / 860px auto no-repeat; }
    .lp-b { padding:24px 34px; }
    .lp-t { font:700 42px/1.25 Inter, sans-serif; color:#16130b; }
    .lp-u { margin-top:10px; display:flex; gap:14px; align-items:center; font:500 32px Inter, sans-serif; color:#5b6470; }`;
  return { w, h, html, css };
}

export const TELEGRAM_ICON = (fill = 'currentColor', size = 62) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><path d="M21.5 3.6 2.9 10.8c-1 .4-1 1.8.1 2.1l4.6 1.5 1.8 5.6c.3.9 1.4 1.1 2 .4l2.6-2.6 4.6 3.4c.8.6 1.9.1 2.1-.9l3.1-15.3c.2-1.1-.9-1.9-2.1-1.4zM9.5 14.1l8.6-6.3-6.9 7.6-.4 3.3z" fill="${fill}"/></svg>`;

// ---------- the root composition: ground, scenes, voice, music, sounds ----------
// scenes: [{ id, start, duration, html }]; ground: { from, to, at, why } (a colour flood) or a plain colour;
// music: { file, mediaStart, points: [{ t, v }] } (a volume envelope); voices: [{ name, file, start, len }]
// (every <audio> gets its length: without one the browser preview may not play a voice block)
export function rootIndex({ END, T, scenes, ground, music, voices, cues, generator }) {
  const lanes = [];
  const sfxTags = [...cues].sort((a, b) => a.start - b.start).map((q, i) => {
    let lane = lanes.findIndex(e => e <= q.start); if (lane < 0) { lanes.push(0); lane = lanes.length - 1; } lanes[lane] = q.start + q.dur + 0.01;
    return `    <audio id="sfx-${String(i + 1).padStart(2, '0')}" class="clip" src="assets/sfx/${q.name}.mp3" data-start="${q.start}" data-duration="${q.dur}" data-volume="${q.vol}" data-track-index="${30 + lane}"></audio>`;
  });
  const g0 = typeof ground === 'string' ? ground : ground.from;
  return `<!doctype html>
<html lang="km" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1080px; height: 1920px; overflow: hidden; background: ${g0}; }
      #root { width: 100%; height: 100%; position: relative; }
      #ground { position: absolute; inset: 0; background: ${g0}; }
      #grain { position: absolute; inset: 0; z-index: 40; opacity: .05; mix-blend-mode: overlay; pointer-events: none;
        background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>"); }
    </style>
  </head>
  <body>
    <!-- generated by ${generator} from ../timing.json${T.estimated ? ' (ESTIMATED voice timing: no voice yet)' : ''} -->
    <div id="root" data-composition-id="main" data-motion-blur="on" data-start="0" data-duration="${END}" data-width="1080" data-height="1920">
      <div id="ground"></div>
${scenes.map((sc, i) => `      <div id="${sc.id}" data-composition-id="${sc.id}" data-composition-src="compositions/${sc.id}.html" data-start="${r3(sc.start)}" data-duration="${r3(sc.duration)}" data-track-index="${i + 1}" data-track-kind="graphics" data-width="1080" data-height="1920" style="z-index:${i + 1}"></div>`).join('\n')}
      <div id="grain"></div>
${voices.map((v, i) => `      <audio id="vo-${v.name}" class="clip" src="assets/audio/${v.file}" data-start="${r3(v.start)}"${v.len ? ` data-duration="${r3(v.len)}"` : ''} data-volume="1" data-track-index="${10 + i}"></audio>`).join('\n')}
${music ? `      <audio id="music" class="clip" src="assets/audio/${music.file}" data-start="0" data-duration="${END}" data-media-start="${r3(music.mediaStart)}" data-volume="1" data-fade-out="1.2" data-automation='${JSON.stringify({ version: 1, lanes: [{ target: 'volume', points: music.points }] })}' data-track-index="20"></audio>` : ''}
${sfxTags.join('\n')}
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
${typeof ground === 'string' ? '' : `      // colour flood: ${ground.why}
      tl.fromTo("#ground", { backgroundColor: "${ground.from}" }, { backgroundColor: "${ground.to}", duration: 0.4, ease: "power2.inOut" }, ${r3(ground.at)});
`}      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;
}
