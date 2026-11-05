// Film template "teaser" (video 003, "One order. Five apps."; the launch run's teasers 003-005). A new video
// copies this file into its folder as film.mjs and changes the words, the windows and the beats; make.mjs runs it.
// No app screens: a teaser saves the product for later. It expects four voice blocks named hook, pain, fix, cta
// with 2, 6, 2 and 3 phrases (timing.json).
//   act 1 (0 → the drop): crimson. Frame 0 is the thumbnail: the hook over a pile of five app windows. The pile
//                    sweeps off and is rebuilt one window a step: the cursor's click in one app opens the next
//                    (comment → chat → notebook → bank → the driver's chat, typing). On "every order" more
//                    piles crowd in and it shakes; on the drop everything falls.
//   act 2 (the drop → cta): bright teal. "There's an easier way" lands; the cursor clicks the centre and the
//                    acorn fills up; "coming" + the date (or "soon").
//   act 3 (cta → end): the acorn stays while navy floods in and it becomes a profile picture beside a Follow
//                    button the cursor clicks; the first-sellers offer; a Telegram button whose click floods the
//                    ground light grey for the end card: navy acorn, the date line, the offer, t.me/longreaksa.
//                    No wordmark: the name is revealed in video 005.
// See hf/SPEC.md in video 003 for the numbers behind the look and the motion.
export default function film(k) {
  const { T, r3, ph, span, sounds, words, CURSOR, TIP, scene, TELEGRAM_ICON, KH } = k;

  // The launch date, on screen only (the voice says "soon"), so it can change without a new voice.
  // null until the founder picks it; then e.g. 'ថ្ងៃទី ១២ វិច្ឆិកា', make.mjs and render again.
  const DATE = null;
  const WHEN = DATE ?? 'ឆាប់ៗនេះ';

  const PAIN = T.blocks.pain.start, CTA = T.blocks.cta.start;
  const h = [0, 1].map(i => ph('hook', i, 2));
  const p = [0, 1, 2, 3, 4, 5].map(i => ph('pain', i, 6)), pl = [0, 1, 2, 3, 4, 5].map(i => span('pain', i, 6));
  const f = [0, 1].map(i => ph('fix', i, 2)), fl = [0, 1].map(i => span('fix', i, 2));
  const c = [0, 1, 2].map(i => ph('cta', i, 3)), cl = [0, 1, 2].map(i => span('cta', i, 3));
  const END = r3(T.voiceEnd + 3.0); // the end card: acorn, date line, offer, button and link held 2 s+
  const DROP = r3(f[0]); // the fix's first word: the ground floods teal and the music drops here
  const { cue, cues } = sounds(END);

  // =============================== act 1: one order, five apps (0 → DROP) ===============================
  const W = 540, H = 720; // an app window
  const SLOTS = [ // where each window sits in the pile (top-left, stage px) and its tilt
    { x: 70, y: 600, rot: -5 }, { x: 400, y: 640, rot: 4 }, { x: 130, y: 720, rot: -2 }, { x: 400, y: 770, rot: 3 }, { x: 250, y: 830, rot: -1 },
  ];
  // a point inside window k (card px) on the stage, with its tilt
  const pt = (k, ex, ey) => {
    const s = SLOTS[k], a = s.rot * Math.PI / 180, dx = ex - W / 2, dy = ey - H / 2;
    return [r3(s.x + W / 2 + dx * Math.cos(a) - dy * Math.sin(a)), r3(s.y + H / 2 + dx * Math.sin(a) + dy * Math.cos(a))];
  };
  const ICON = {
    comment: '<svg width="52" height="52" viewBox="0 0 24 24" fill="#fff"><path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/></svg>',
    chat: '<svg width="52" height="52" viewBox="0 0 24 24" fill="#fff"><path d="M3 5h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H8l-4 3v-3a2 2 0 0 1-1-2V7a2 2 0 0 1 2-2z"/><path d="M19 9h1a2 2 0 0 1 2 2v6a2 2 0 0 1-1 2v3l-4-3h-5a2 2 0 0 1-2-2v-1h6a3 3 0 0 0 3-3z" opacity=".75"/></svg>',
    note: '<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
    bank: '<svg width="52" height="52" viewBox="0 0 24 24" fill="#fff"><path d="M12 2 2 7v2h20V7z"/><path d="M4 10h3v7H4zM10.5 10h3v7h-3zM17 10h3v7h-3zM2 18h20v3H2z"/></svg>',
    driver: '<svg width="52" height="52" viewBox="0 0 24 24" fill="#fff"><path d="M2 6h11v9H2z"/><path d="M13 9h4.5l3.5 3.5V15h-8z"/><circle cx="6" cy="17.5" r="2.2"/><circle cx="17" cy="17.5" r="2.2"/></svg>',
  };
  const NUM = ['១', '២', '៣', '៤', '៥'];
  // the five windows: header colour, icon, the name of the app (Khmer), and its body (card px, absolute)
  const bubble = (side, top, text, cls = '') => `<div class="bb ${side} ${cls}" style="top:${top}px">${text}</div>`;
  const WIN = [
    { key: 'comment', col: '#3b5bdb', name: 'ខមិន', body: `
          <div class="post-who"><div class="pav"></div><div class="pnm">ហាងលក់ទូរស័ព្ទ</div></div>
          <div class="post-tx">iPhone 15 Pro មួយទឹក ស្អាត</div>
          <div class="post-img"><svg width="120" height="170" viewBox="0 0 60 86"><rect x="3" y="2" width="54" height="82" rx="11" fill="#e2662b"/><rect x="9" y="8" width="42" height="70" rx="6" fill="#ffd5bd"/><circle cx="20" cy="20" r="6" fill="#b9471b"/></svg></div>
          <div class="cm1"><div class="cav" style="background:#e8590c">S</div><div class="cbx"><div class="cnm">Sokha</div><div class="ctx">តម្លៃប៉ុន្មាន? ខ្ញុំយក 1</div></div></div>
          <div class="reply">ឆ្លើយតប</div>
          <div class="cm2"><div class="cav" style="background:#2b8a3e">D</div><div class="cbx"><div class="cnm">Dara</div><div class="ctx">នៅមានទេ?</div></div></div>` },
    { key: 'chat', col: '#2b8a3e', name: 'ឆាត · Sokha', body: `
          ${bubble('me', 130, 'អាសយដ្ឋាននៅណាបង?')}
          ${bubble('them', 250, 'ផ្ទះ 25 ផ្លូវ 271<br>ទួលទំពូង', 'addr')}
          ${bubble('them', 418, '012 345 678')}
          ${bubble('me', 528, 'អរគុណបង')}` },
    { key: 'note', col: '#c85a00', name: 'កត់ត្រា', body: `
          <div class="paper"></div>
          <div class="ink" style="top:124px">Sokha · 012 345 678</div>
          <div class="ink" style="top:184px">iPhone 15 Pro · $650</div>
          <div class="ink" style="top:244px">ផ្ទះ 25 ផ្លូវ 271</div>
          <div class="ink" style="top:304px">ទួលទំពូង</div>
          <div class="ink paid" style="top:376px"><span class="box"></span>បង់ហើយ?</div>` },
    { key: 'bank', col: '#343a40', name: 'ធនាគារ', body: `
          <div class="bal-l">សមតុល្យ</div>
          <div class="bal">$1,240.50</div>
          <div class="today">ថ្ងៃនេះ</div>
          <div class="row r1"><span class="amt">+ $650.00</span><span class="who">SOKHA ?</span></div>
          <div class="row" style="top:410px"><span class="amt">+ $25.00</span><span class="who">DARA</span></div>
          <div class="row" style="top:506px"><span class="amt out">− $12.00</span><span class="who">VANNA</span></div>` },
    { key: 'driver', col: '#c2255c', name: 'អ្នកដឹក · Dara', body: `
          ${bubble('them', 130, 'ផ្ញើអាសយដ្ឋានមកបង')}
          <div class="bb me typ" style="top:250px"><span class="t">ផ្ទះ</span> <span class="t">25</span> <span class="t">ផ្លូវ</span> <span class="t">271</span><br><span class="t">ទួលទំពូង</span> <span class="t">·</span> <span class="t">012</span> <span class="t">345</span> <span class="t">678</span><br><span class="t">យកលុយ</span> <span class="t">$650</span><span class="caret"></span></div>
          <div class="inbar">វាយសារ...</div>` },
  ];
  // the highlight on each click target (what the cursor presses): window, then card px x, y, w, h
  const HITS = [[0, 100, 568, 160, 58], [1, 28, 346, 330, 142], [2, 84, 470, 260, 60], [3, 16, 336, 508, 88]];
  const hitHtml = i => HITS.map(([wi, x, y, w, hh], n) => wi === i ? `<div class="hit hit${n + 1}" style="left:${x}px;top:${y}px;width:${w}px;height:${hh}px"></div>` : '').join('');
  // each window covers the one under it on purpose (a pile), so it may hide their text
  const windowHtml = (w, i) => `      <div id="a1-w${i + 1}" class="wnd" data-layout-allow-occlusion style="left:${SLOTS[i].x}px;top:${SLOTS[i].y}px;z-index:${10 + i}">
        <div class="win">${hitHtml(i)}<div class="wh" style="background:${w.col}">${ICON[w.key]}<span>${w.name}</span></div><div class="wb">${w.body}
        </div></div>
        <div class="badge">${NUM[i]}</div>
      </div>`;
  // more piles on "every order": plain cards with the same headers, behind the pile
  const GHOSTS = [{ x: -250, y: 700, rot: -9, from: -700 }, { x: 790, y: 760, rot: 8, from: 700 }];
  const ghostHtml = GHOSTS.map((g, j) => `      <div id="a1-g${j + 1}" class="ghost" style="left:${g.x}px;top:${g.y}px">
${WIN.map((w, i) => `        <div class="gw" style="left:${i * 18}px;top:${i * 34}px"><div class="wh" style="background:${w.col}">${ICON[w.key]}</div><div class="gl"></div><div class="gl" style="width:60%"></div><div class="gl" style="width:75%"></div></div>`).join('\n')}
      </div>`).join('\n');

  // the clicks that open the next app: (window it's in, card px)
  // (the middles of HITS below: Reply, the address bubble, "paid?", the $650 row)
  const CLICKS = [[0, 180, 597], [1, 193, 417], [2, 214, 500], [3, 270, 380]];
  const SWEEP = r3(PAIN - 0.35), FALL = r3(DROP - 0.2), POP1 = r3(p[0] + 0.3); // window 1 pops on "ខមិន"
  let a1js = '';
  // frame 0: the whole pile is there, the hook over it. Each window's slot is its CSS left/top; GSAP only
  // offsets and tilts it (a fromTo renders its start at once, so frame 0 has the tilts; a set at 0 would not)
  SLOTS.forEach((s, i) => { a1js += `      tl.fromTo("#a1-w${i + 1}", { x: 0, y: 0, rotation: ${s.rot}, scale: 1, opacity: 1 }, { rotation: ${s.rot}, duration: 0.01, ease: "none" }, 0);\n`; });
  // "five apps": the pile rattles on the word
  a1js += `      tl.to("#a1-pile", { keyframes: [{ x: -14, duration: 0.05 }, { x: 12, duration: 0.05 }, { x: -8, duration: 0.05 }, { x: 0, duration: 0.06 }], ease: "none" }, ${r3(h[1] + 0.05)});\n`;
  cue(h[1] + 0.05, 'pop', 0.9);
  // the pain starts: the pile sweeps off and the hook leaves
  SLOTS.forEach((s, i) => { a1js += `      tl.to("#a1-w${i + 1}", { y: 1500, rotation: ${s.rot + (i % 2 ? 22 : -22)}, duration: 0.36, ease: "power3.in" }, ${r3(SWEEP + i * 0.03)});\n`; });
  a1js += `      leave("#a1-hook1 .w, #a1-hook2 .w", ${r3(Math.max(SWEEP, T.blocks.hook.len - 0.05))});\n`;
  cue(SWEEP + 0.25, 'whoosh', 0.7);
  // the rebuild: window k pops in on its phrase; from the second on, the cursor's click in the window before
  // opens it on the same frame. The step's number and app land at the top.
  const popIn = (i, at) => {
    const s = SLOTS[i];
    a1js += `      tl.fromTo("#a1-w${i + 1}", { x: 0, y: 40, rotation: ${s.rot * 2}, scale: 0.55, opacity: 0 }, { y: 0, rotation: ${s.rot}, scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.3)", immediateRender: false }, ${r3(at)});\n`;
    cue(at + 0.06, 'pop', 1);
  };
  popIn(0, POP1);
  a1js += `      land("#a1-s1 .w", ${r3(POP1 + 0.05)});\n`;
  const [e0x, e0y] = pt(...CLICKS[0]);
  a1js += `      tl.fromTo("#a1-cur", { x: 1160, y: 1500 }, { x: ${r3(e0x - TIP[0])}, y: ${r3(e0y - TIP[1])}, duration: 0.55, ease: "power2.out" }, ${r3(p[1] - 0.6)});\n`;
  CLICKS.forEach(([wi, ex, ey], n) => {
    const at = p[n + 1], [x, y] = pt(wi, ex, ey);
    if (n > 0) a1js += `      move("#a1-cur", ${x}, ${y}, ${r3(at - 0.47)}, 0.45);\n`;
    a1js += `      press("#a1-cur", ${r3(at)});\n      tl.fromTo("#a1-w${wi + 1} .hit${n + 1}", { opacity: 0 }, { opacity: 1, duration: 0.06, ease: "none" }, ${r3(at - 0.03)});\n`;
    cue(at, 'click');
    popIn(n + 1, at);
    // one title out (0.18 s + a word's stagger) before the next lands in the same place
    a1js += `      leave("#a1-s${n + 1} .w", ${r3(at - 0.15)});\n      land("#a1-s${n + 2} .w", ${r3(at + 0.1)});\n`;
  });
  // the driver's message types itself out, word by word
  // (typed out in frame 0's pile; cleared while the window is off screen, then typed again)
  const TYPE = r3(p[4] + 0.4), TYPEDUR = r3(Math.min(1.25, pl[4] - 0.2));
  a1js += `      tl.set("#a1-w5 .typ .t", { opacity: 0 }, ${r3(SWEEP + 0.5)});
      tl.fromTo("#a1-w5 .typ .t", { opacity: 0 }, { opacity: 1, duration: 0.01, ease: "none", stagger: ${r3(TYPEDUR / 11)}, immediateRender: false }, ${TYPE});
      tl.fromTo("#a1-w5 .caret", { opacity: 0 }, { opacity: 1, duration: 0.01, ease: "none" }, ${TYPE});\n`;
  cue(TYPE, 'mx-typing', 1);
  a1js += `      tl.to("#a1-cur", { x: 1160, y: 1650, duration: 0.45, ease: "power3.in" }, ${r3(p[4] + 0.5)});\n`;
  // "every order": more piles crowd in from the sides and the pile shakes
  a1js += `      leave("#a1-s5 .w", ${r3(p[5] - 0.22)});
      land("#a1-every .w", ${r3(p[5] + 0.02)}, 0.1);\n`;
  GHOSTS.forEach((g, j) => { a1js += `      tl.fromTo("#a1-g${j + 1}", { x: ${g.from}, rotation: ${g.rot}, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: "expo.out" }, ${r3(p[5] + j * 0.1)});\n`; });
  cue(p[5] + 0.05, 'whoosh', 0.55);
  a1js += `      tl.to("#a1-pile", { keyframes: [{ x: -16, duration: 0.05 }, { x: 14, duration: 0.05 }, { x: -10, duration: 0.05 }, { x: 6, duration: 0.05 }, { x: 0, duration: 0.06 }], ease: "none" }, ${r3(p[5] + 0.3)});\n`;
  cue(p[5] + 0.32, 'pop', 0.7);
  // the drop: everything falls
  SLOTS.forEach((s, i) => { a1js += `      tl.to("#a1-w${i + 1}", { y: 1600, rotation: ${s.rot + (i % 2 ? 30 : -30)}, duration: 0.42, ease: "power3.in" }, ${r3(FALL + i * 0.03)});\n`; });
  GHOSTS.forEach((g, j) => { a1js += `      tl.to("#a1-g${j + 1}", { y: 1600, rotation: ${g.rot * 3}, duration: 0.42, ease: "power3.in" }, ${r3(FALL + 0.05)});\n`; });
  a1js += `      leave("#a1-every .w", ${FALL});\n`;
  cue(FALL + 0.2, 'whoosh', 0.8);
  cue(DROP, 'hf-riser'); cue(DROP, 'hf-impact-bass-1');

  const act1 = scene('act1', `
    #a1-light { position:absolute; inset:0; background:radial-gradient(ellipse 90% 45% at 50% 0%, rgba(255,90,60,.30), rgba(0,0,0,0) 70%); }
    #a1-pile { position:absolute; inset:0; }
    .wnd { position:absolute; width:${W}px; height:${H}px; }
    .win { position:absolute; inset:0; border-radius:36px; overflow:hidden; background:#fff; box-shadow:0 30px 70px rgba(0,0,0,.5); }
    .wh { height:96px; display:flex; align-items:center; gap:18px; padding:0 30px; color:#fff; font:700 38px/1 ${KH}; }
    .wb { position:absolute; left:0; right:0; top:96px; bottom:0; }
    .wb > div { position:absolute; }
    .badge { position:absolute; left:-26px; top:-26px; width:88px; height:88px; border-radius:50%; background:#ffb23e; color:#420c12; display:grid; place-items:center; font:700 52px/1 ${KH}; box-shadow:0 10px 24px rgba(0,0,0,.4); }
    .post-who { left:28px; top:22px; display:flex; gap:16px; align-items:center; }
    .pav { width:60px; height:60px; border-radius:50%; background:#dee2e6; }
    .pnm { font:700 30px/1.3 ${KH}; color:#1c1e21; }
    .post-tx { left:28px; top:96px; font:400 32px/1.4 ${KH}; color:#1c1e21; }
    .post-img { left:28px; top:150px; width:484px; height:190px; border-radius:18px; background:linear-gradient(135deg,#fff1e6,#ffd8bf); display:grid; place-items:center; }
    .cm1 { left:28px; top:362px; display:flex; gap:14px; }
    .cm2 { left:28px; top:540px; display:flex; gap:14px; opacity:.55; }
    .cav { width:60px; height:60px; border-radius:50%; flex:none; display:grid; place-items:center; font:700 30px/1 Inter, sans-serif; color:#fff; }
    .cbx { background:#f1f3f5; border-radius:26px; padding:10px 24px 14px; }
    .cnm { font:700 28px/1.3 Inter, sans-serif; color:#1c1e21; }
    .ctx { font:400 34px/1.45 ${KH}; color:#1c1e21; white-space:nowrap; }
    .reply { left:110px; top:476px; font:700 30px/1.3 ${KH}; color:#3b5bdb; padding:4px 12px; border-radius:10px; }
    .bb { max-width:420px; padding:14px 26px 18px; border-radius:30px; font:400 34px/1.45 ${KH}; white-space:nowrap; }
    .bb.me { right:28px; background:#228be6; color:#fff; border-bottom-right-radius:8px; }
    .bb.them { left:28px; background:#f1f3f5; color:#1c1e21; border-bottom-left-radius:8px; }
    .paper { left:0; top:0; right:0; bottom:0; background-color:#fffdf2; background-image:repeating-linear-gradient(#fffdf2 0 59px, #c5d4ec 59px 61px), linear-gradient(90deg, rgba(0,0,0,0) 74px, #ef8f8f 74px 77px, rgba(0,0,0,0) 77px); background-size:100% 60px, 100% 100%; background-position:0 6px, 0 0; }
    .ink { left:96px; font:400 36px/1.4 ${KH}; color:#1d2b53; white-space:nowrap; }
    .ink.paid { color:#c92a2a; font-weight:700; display:flex; gap:16px; align-items:center; padding:2px 12px; border-radius:10px; }
    .ink .box { width:34px; height:34px; border:4px solid #c92a2a; border-radius:6px; }
    .bal-l { left:30px; top:26px; font:400 30px/1.4 ${KH}; color:#5f666d; }
    .bal { left:30px; top:68px; font:700 70px/1.2 Inter, sans-serif; color:#212529; }
    .today { left:30px; top:186px; font:700 30px/1.4 ${KH}; color:#495057; }
    .row { left:16px; right:16px; height:88px; top:240px; padding:0 18px; display:flex; align-items:center; justify-content:space-between; border-bottom:2px solid #f1f3f5; font:700 36px Inter, sans-serif; border-radius:14px; }
    .row .amt { color:#2b8a3e; } .row .amt.out { color:#495057; } .row .who { font-weight:600; font-size:30px; color:#495057; }
    .caret { display:inline-block; width:4px; height:40px; margin-left:6px; background:#fff; vertical-align:-6px; opacity:0; }
    .inbar { left:24px; right:24px; bottom:24px; height:76px; border-radius:38px; background:#f1f3f5; padding:0 30px; display:flex; align-items:center; font:400 30px/1 ${KH}; color:#5f666d; }
    .hit { position:absolute; z-index:5; border-radius:14px; background:rgba(59,91,219,.16); opacity:0; }
    .ghost { position:absolute; width:${W}px; height:${H}px; opacity:0; }
    .gw { position:absolute; width:${W}px; height:${H}px; border-radius:36px; overflow:hidden; background:#fff; box-shadow:0 24px 50px rgba(0,0,0,.45); }
    .gl { height:26px; margin:34px 30px 0; border-radius:13px; background:#e9ecef; }
    #a1-hook1 { top:180px; font-size:110px; line-height:1.4; color:#fff6ec; z-index:30; }
    #a1-hook2 { top:330px; font-size:150px; line-height:1.3; color:#fff6ec; z-index:30; }
    .hl { color:#ffb23e; }
    .step { top:300px; font-size:130px; line-height:1.3; color:#fff6ec; z-index:30; }
    .step .num { color:#ffb23e; }
    #a1-every { top:290px; font-size:140px; line-height:1.3; color:#fff6ec; z-index:30; }`,
`    <div id="a1-light"></div>
    <div id="a1-pile" data-motion-blur="off" data-layout-allow-overlap>
${ghostHtml}
${WIN.map(windowHtml).join('\n')}
    </div>
    <div id="a1-hook1" class="ttl"><span class="w">Order</span> <span class="w">មួយ។</span></div>
    <div id="a1-hook2" class="ttl"><span class="w">App</span> <span class="w hl">ប្រាំ។</span></div>
${WIN.map((w, i) => `    <div id="a1-s${i + 1}" class="ttl step"><span class="w num">${NUM[i]}</span> <span class="w">${w.name.split(' · ')[0]}</span></div>`).join('\n')}
    <div id="a1-every" class="ttl"><span class="w hl">រាល់</span> <span class="w">Order</span></div>
    ${CURSOR('a1-cur')}`,
  a1js);
  // =============================== act 2: an easier way (DROP → CTA) ===============================
  const S2 = r3(DROP - 0.2), s = t => r3(t - S2);
  const a2js = `      land("#a2-way1 .w", ${s(f[0] + 0.02)});
      land("#a2-way2 .w", ${s(f[0] + fl[0] * 0.42)}, 0.1);
      leave("#a2-way1 .w, #a2-way2 .w", ${s(CTA - 0.12)});
`;
  const act2 = scene('act2', `
    #a2-light { position:absolute; inset:0; background:radial-gradient(ellipse 90% 45% at 50% 0%, rgba(255,255,255,.12), rgba(0,0,0,0) 70%); }
    .ttl { color:#ffffff; }
    #a2-way1 { top:420px; font-size:110px; line-height:1.4; }
    #a2-way2 { top:570px; font-size:150px; line-height:1.3; color:#ffe45c; }`,
`    <div id="a2-light"></div>
    ${words('a2-way1', 'មានវិធី', '')}
    ${words('a2-way2', 'ងាយជាងនេះ', '')}`,
  a2js);

  // ============ act 3: coming soon, follow, first sellers, the end card (just before "soon" → END) ============
  // It starts on teal for "coming soon" (the acorn and the date line live here from their first frame), then
  // from the reference IMG_4465 (Prodigis): claims in white on Oak navy, then the brand in navy on light grey.
  const A3 = r3(f[1] - 0.6), u = t => r3(t - A3), NAVY = u(CTA);
  const ACORN = { left: 380, top: 800, size: 320 }, MARK = [540, 960]; // the acorn's middle
  const AV = { cx: 290, cy: 720, size: 150 }; // the acorn as a profile picture
  const BTN = { left: 420, top: 660, w: 400, h: 120 }; // Follow
  const tapFollow = r3(u(c[0]) + Math.min(1.25, cl[0] * 0.85));
  const tapTg = r3(u(c[2]) + cl[2] * 0.6), endAt = u(T.voiceEnd + 0.05), markClick = r3(endAt + 0.15);
  const a3js = `      // "coming soon": the cursor clicks the empty centre and the acorn fills up from the bottom
      tl.fromTo("#a3-cur", { x: 1160, y: 1600 }, { x: ${MARK[0] - TIP[0]}, y: ${MARK[1] - TIP[1]}, duration: 0.5, ease: "power2.out" }, ${r3(u(f[1]) - 0.52)});
      press("#a3-cur", ${u(f[1])});
      tl.fromTo("#a3-acorn", { clipPath: "inset(100% 0% 0% 0%)", scale: 0.9 }, { clipPath: "inset(0% 0% 0% 0%)", scale: 1, duration: 0.45, ease: "power2.out" }, ${u(f[1])});
      tl.to("#a3-cur", { x: 1200, y: 1650, duration: 0.35, ease: "power3.in" }, ${u(f[1] + 0.25)});
      land("#a3-when .w", ${u(f[1] + 0.02)}, 0.1);
      // the acorn stays while the ground floods navy, then becomes the profile picture beside Follow; the
      // yellow date line is gone before the navy is in (navy never next to yellow)
      leave("#a3-when .w", ${r3(NAVY + 0.05)});
      tl.fromTo("#a3-navy", { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power2.inOut" }, ${NAVY});
      tl.fromTo("#a3-acorn", { x: 0, y: 0 }, { x: ${AV.cx - MARK[0]}, y: ${AV.cy - MARK[1]}, scale: ${r3(AV.size / ACORN.size * 0.78)}, duration: 0.5, ease: "power2.inOut", immediateRender: false }, ${r3(NAVY + 0.05)});
      tl.fromTo("#a3-ring", { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.3, ease: "expo.out" }, ${r3(NAVY + 0.4)});
      tl.fromTo("#a3-follow", { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.4)" }, ${r3(NAVY + 0.45)});
      land("#a3-f1 .w", ${r3(u(c[0]) + 0.1)});
      land("#a3-f2 .w", ${r3(u(c[0]) + cl[0] * 0.45)}, 0.1);
      tl.to("#a3-cur", { x: ${BTN.left + 210 - TIP[0]}, y: ${BTN.top + 66 - TIP[1]}, duration: 0.5, ease: "power2.out" }, ${r3(tapFollow - 0.5)});
      press("#a3-cur", ${tapFollow});
      tl.to("#a3-follow", { scale: 0.96, duration: 0.066, ease: "power2.in" }, ${r3(tapFollow - 0.066)});
      tl.to("#a3-follow", { scale: 1, duration: 0.12, ease: "power2.out" }, ${tapFollow});
      tl.fromTo("#a3-follow", { backgroundColor: "rgba(255,255,255,1)" }, { backgroundColor: "rgba(255,255,255,0)", duration: 0.2, ease: "power2.out", immediateRender: false }, ${tapFollow});
      tl.fromTo("#a3-follow .l1", { opacity: 1 }, { opacity: 0, duration: 0.1, ease: "none", immediateRender: false }, ${tapFollow});
      tl.fromTo("#a3-follow .l2", { opacity: 0 }, { opacity: 1, duration: 0.15, ease: "none" }, ${r3(tapFollow + 0.05)});
      tl.to("#a3-cur", { x: 1160, y: 1500, duration: 0.4, ease: "power3.in" }, ${r3(tapFollow + 0.25)});
      // first sellers
      leave("#a3-f1 .w, #a3-f2 .w", ${r3(u(c[1]) - 0.15)});
      tl.to("#a3-acorn, #a3-ring, #a3-follow", { opacity: 0, filter: "blur(8px)", duration: 0.18, ease: "power2.in" }, ${r3(u(c[1]) - 0.15)});
      land("#a3-first .w", ${r3(u(c[1]) + 0.05)});
      land("#a3-help1 .w", ${r3(u(c[1]) + cl[1] * 0.35)}, 0.08);
      land("#a3-help2 .w", ${r3(u(c[1]) + cl[1] * 0.35 + 0.25)}, 0.08);
      tl.fromTo("#a3-free", { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.4)" }, ${r3(u(c[1]) + cl[1] * 0.7)});
      // the Telegram button; its click floods the ground light grey for the end card
      tl.fromTo("#a3-btn", { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.4)" }, ${u(c[2])});
      tl.to("#a3-cur", { x: ${700 - TIP[0]}, y: ${1105 - TIP[1]}, duration: 0.5, ease: "power2.out" }, ${r3(tapTg - 0.5)});
      press("#a3-cur", ${tapTg});
      tl.to("#a3-btn", { scale: 0.96, duration: 0.066, ease: "power2.in" }, ${r3(tapTg - 0.066)});
      tl.to("#a3-btn", { scale: 1, duration: 0.12, ease: "power2.out" }, ${tapTg});
      leave("#a3-first .w, #a3-help1 .w, #a3-help2 .w", ${tapTg});
      tl.to("#a3-free", { opacity: 0, filter: "blur(8px)", duration: 0.18, ease: "power2.in" }, ${tapTg});
      tl.fromTo("#a3-lightground", { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power2.inOut" }, ${tapTg});
      tl.fromTo("#a3-btn", { backgroundColor: "#ffffff", color: "#1f3350" }, { backgroundColor: "#0088cc", color: "#ffffff", duration: 0.35, ease: "power2.inOut", immediateRender: false }, ${tapTg});
      tl.fromTo("#a3-btn .ic", { color: "#0088cc" }, { color: "#ffffff", duration: 0.35, ease: "power2.inOut" }, ${tapTg});
      land("#a3-tme .w", ${r3(tapTg + 0.25)});
      // end card: the cursor clicks the centre, the navy acorn fills up, the date and the offer land
      move("#a3-cur", ${548}, ${500}, ${r3(markClick - 0.4)}, 0.4);
      press("#a3-cur", ${markClick});
      tl.fromTo("#a3-mark", { clipPath: "inset(100% 0% 0% 0%)", scale: 0.9 }, { clipPath: "inset(0% 0% 0% 0%)", scale: 1, duration: 0.45, ease: "power2.out" }, ${markClick});
      tl.to("#a3-cur", { x: 1200, y: 1500, duration: 0.3, ease: "power3.in" }, ${r3(markClick + 0.2)});
      land("#a3-date .w", ${r3(markClick + 0.3)}, 0.1);
      land("#a3-offer .w", ${r3(markClick + 0.42)}, 0.06);
`;
  cue(f[1], 'click'); cue(f[1] + 0.1, 'pop', 0.9);
  cue(CTA + 0.1, 'whoosh', 0.7); cue(CTA + 0.55, 'pop', 0.8); cue(A3 + tapFollow, 'click'); cue(A3 + tapFollow + 0.08, 'pop', 0.8);
  cue(c[1] + cl[1] * 0.7 + 0.1, 'pop', 1); cue(c[2] + 0.1, 'pop', 0.8);
  cue(A3 + tapTg, 'click'); cue(A3 + tapTg + 0.15, 'whoosh', 0.45);
  cue(A3 + markClick, 'click'); cue(A3 + markClick + 0.2, 'pop', 0.9);
  const act3 = scene('act3', `
    #a3-navy { position:absolute; inset:0; background:#1f3350; }
    #a3-glow { position:absolute; inset:0; background:radial-gradient(ellipse 90% 45% at 50% 0%, rgba(159,183,217,.20), rgba(159,183,217,0) 70%); }
    #a3-lightground { position:absolute; inset:0; background-color:#f3f5f7;
      background-image:radial-gradient(ellipse 80% 40% at 50% 34%, rgba(159,183,217,.28), rgba(159,183,217,0) 70%), radial-gradient(rgba(31,51,80,.09) 1.6px, rgba(0,0,0,0) 1.8px);
      background-size:100% 100%, 30px 30px; }
    .ttl { color:#ffffff; }
    #a3-when { top:1140px; font-size:90px; line-height:1.4; z-index:3; }
    #a3-when .hl { color:#ffe45c; }
    #a3-acorn { position:absolute; left:${ACORN.left}px; top:${ACORN.top}px; width:${ACORN.size}px; height:${ACORN.size}px; z-index:3; }
    #a3-ring { position:absolute; left:${AV.cx - AV.size / 2 - 8}px; top:${AV.cy - AV.size / 2 - 8}px; width:${AV.size + 16}px; height:${AV.size + 16}px; border-radius:50%; border:6px solid #ffffff; background:rgba(255,255,255,.08); z-index:2; }
    #a3-follow { position:absolute; left:${BTN.left}px; top:${BTN.top}px; width:${BTN.w}px; height:${BTN.h}px; border-radius:28px; border:5px solid #ffffff; background:#ffffff; z-index:4; }
    #a3-follow span { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font:700 54px/1 ${KH}; }
    #a3-follow .l1 { color:#1f3350; } #a3-follow .l2 { color:#ffffff; opacity:0; }
    #a3-f1 { top:300px; font-size:110px; line-height:1.4; }
    #a3-f2 { top:440px; font-size:90px; line-height:1.4; }
    #a3-first { top:300px; font-size:110px; line-height:1.4; }
    #a3-help1 { top:500px; font-size:64px; line-height:1.4; font-weight:400; color:#c9d6ea; }
    #a3-help2 { top:600px; font-size:64px; line-height:1.4; font-weight:400; color:#c9d6ea; }
    #a3-free { position:absolute; left:0; right:0; top:720px; text-align:center; font:700 140px/1.3 ${KH}; color:#ffffff; }
    #a3-btn { position:absolute; left:240px; top:1040px; width:600px; height:120px; border-radius:28px; background:#ffffff; color:#1f3350; display:flex; align-items:center; justify-content:center; gap:22px; font:700 54px/1 ${KH}; box-shadow:0 18px 40px rgba(10,20,40,.30); z-index:5; }
    #a3-btn .ic { display:flex; color:#0088cc; }
    #a3-tme { top:1180px; font:600 44px/1.3 Inter, sans-serif; color:#1f3350; }
    #a3-mark { position:absolute; left:${540 - 120}px; top:360px; width:240px; height:240px; }
    #a3-date { top:640px; font-size:84px; line-height:1.4; color:#1f3350; }
    #a3-offer { top:780px; font-size:48px; line-height:1.4; font-weight:400; color:#1f3350; }`,
`    <div id="a3-navy"><div id="a3-glow"></div></div>
    <div id="a3-lightground"></div>
    <div id="a3-ring"></div>
    <div id="a3-when" class="ttl"><span class="w">មកដល់</span> <span class="w hl">${WHEN}</span></div>
    <img id="a3-acorn" src="assets/brand/white_oak-acorn-1024.png">
    <div id="a3-follow"><span class="l1">+ តាមដាន</span><span class="l2">✓ បានតាមដាន</span></div>
    ${words('a3-f1', 'តាមដានទុក', '')}
    ${words('a3-f2', 'កុំឲ្យខកខាន', '')}
    ${words('a3-first', 'អ្នកលក់ដំបូងៗ', '')}
    ${words('a3-help1', 'យើងជួយបញ្ចូលទំនិញ', '')}
    ${words('a3-help2', 'និងបង្រៀនប្រើ', '')}
    <div id="a3-free">ឥតគិតថ្លៃ</div>
    <img id="a3-mark" src="assets/brand/navy_oak-acorn-1024.png">
    <div id="a3-date" class="ttl"><span class="w">មកដល់</span> <span class="w">${WHEN}</span></div>
    ${words('a3-offer', 'អ្នកលក់ដំបូងៗ៖ យើងជួយបញ្ចូលទំនិញ ឥតគិតថ្លៃ', '')}
    <div id="a3-btn"><span class="ic">${TELEGRAM_ICON()}</span>ឆាតមកយើង</div>
    ${words('a3-tme', 't.me/longreaksa', '')}
    ${CURSOR('a3-cur')}`,
  a3js);

  return {
    END,
    scenes: [
      { id: 'act1', start: 0, duration: r3(DROP + 0.45), html: act1 },
      { id: 'act2', start: S2, duration: r3(CTA + 0.3 - S2), html: act2 }, // its titles leave as navy floods in
      { id: 'act3', start: A3, duration: r3(END - A3), html: act3 },
    ],
    ground: { from: '#420c12', to: '#0c8063', at: r3(DROP - 0.05), why: 'on the drop: crimson pain → bright teal fix' },
    // Ramp It Up's drop (16.14 s in the track, 120 BPM) lands on the fix's first word; its quiet intro plays under
    // the hook and the pain; 0.16 under the voice after the drop; up on the end card once the voice stops
    music: { file: 'ramp-it-up.mp3', mediaStart: r3(16.14 - DROP), points: [{ t: 0, v: 0.3 }, { t: r3(DROP - 0.1), v: 0.3 }, { t: DROP, v: 0.16 }, { t: r3(T.voiceEnd), v: 0.16 }, { t: r3(T.voiceEnd + 0.4), v: 0.42 }, { t: END, v: 0.42 }] },
    cues,
    summary: `${WIN.length} windows, date ${DATE ? DATE : 'not set (soon)'}`,
  };
}
