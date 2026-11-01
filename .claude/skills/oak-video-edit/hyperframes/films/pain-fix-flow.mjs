// Film template "pain → fix flow" (video 002 v2, "Stop answering 'How much?'"). A new video copies this file
// into its folder as film.mjs and changes the words, the screens and the beats; make.mjs runs it.
// It expects four voice blocks named hook, pain, fix, cta with 3, 5, 5 and 2 phrases (timing.json).
//   act 1 (0 → fix): Facebook-style comments flood a crimson ground; the hook line is on screen at frame 0;
//                    on "customers leave" they fall away and the last question becomes the shop's link card.
//   act 2 (fix → cta): bright teal; the cursor clicks the link card, it grows into an iPhone with the shop;
//                    tap a product, price / sizes / stock lift out as they're named, pick a size, Buy now,
//                    "Thank you"; whip to the seller's list, the order row lifts out, the Telegram alert drops in.
//   act 3 (cta → end): from the reference IMG_4465 (Prodigis): the offer in white on Oak navy, a Telegram
//                    button; its click floods the ground to light grey; the navy acorn and wordmark land.
// See hf/SPEC.md in video 002 for the numbers behind the look and the motion.
export default function film(k) {
  const { T, r3, ph, span, sounds, rng, words, CURSOR, TIP, scene, iphone, IMG, linkCard, TELEGRAM_ICON, KH } = k;

  const PAIN = T.blocks.pain.start, FIX = T.blocks.fix.start, CTA = T.blocks.cta.start;
  const h = [0, 1, 2].map(i => ph('hook', i, 3)), p = [0, 1, 2, 3, 4].map(i => ph('pain', i, 5));
  const f = [0, 1, 2, 3, 4].map(i => ph('fix', i, 5)), fl = [0, 1, 2, 3, 4].map(i => span('fix', i, 5));
  const c = [0, 1].map(i => ph('cta', i, 2)), cl = [0, 1].map(i => span('cta', i, 2));
  const END = r3(T.voiceEnd + 3.0); // the end card: lockup, offer line, button and link held 2 s+
  const BEAT = 60 / 92.5, HAT = BEAT / 2; // the music's tempo (Trap Electro Vibes)
  const { cue, cues } = sounds(END);

  const PILL_Y = 1000; // the link card's middle: where the phone's screen will be
  const LC = linkCard();
  const CARD = { w: LC.w, h: LC.h, left: 110, top: PILL_Y - 223 };

  // =============================== act 1: the comment flood (0 → FIX) ===============================
  const NAMES = ['Sokha', 'Dara', 'Srey Pich', 'Vanna', 'Lina', 'Rithy', 'Bopha', 'Kimheng', 'Chenda', 'Pisey', 'Sophea', 'Nary', 'Visal', 'Malis', 'Ratana', 'Sreyleak'];
  const ASKS = ['តម្លៃប៉ុន្មាន?', 'ប៉ុន្មានដែរបង?', 'Price?', 'តម្លៃ?', 'មានទំហំ 38 អត់?', 'នៅមានទេបង?', 'ថ្លៃដឹកប៉ុន្មាន?', 'ប៉ុន្មាន?', 'មានពណ៌សអត់?', 'inbox ផង', 'ទំហំ 37 នៅទេ?', 'តម្លៃប៉ុន្មានបង?', 'អស់ហើយឬនៅ?', 'ចង់បាន 1'];
  const AVC = ['#e8590c', '#1c7ed6', '#2b8a3e', '#ae3ec9', '#c76a00', '#0b7285', '#c2255c', '#5c940d', '#d9480f', '#3b5bdb'];
  const rnd = rng(7);
  // comments land on the hi-hat grid counted back from the drop: every other hat before 0, every hat on screen,
  // two a hat in the pain
  const spawns = [];
  for (let n = 1; ; n++) { const t = FIX - n * HAT / 2; if (t < -4.6) break; if (t > p[4] - 0.25) continue; if (t < PAIN && n % 2 && t < 0) continue; spawns.push(r3(t)); }
  spawns.sort((a, b) => a - b);
  // depth from size and fade only: blur on dozens of elements makes renders capture black frames (lint)
  const LAYER = { far: { s: 0.55, o: 0.32 }, mid: { s: 0.82, o: 0.78 }, near: { s: 1.08, o: 1 } };
  const comments = spawns.map((t, i) => {
    const r = rnd(), layer = r < 0.35 ? 'far' : r < 0.68 ? 'mid' : 'near';
    const y = layer === 'far' ? 690 + rnd() * 1060 : 720 + rnd() * 940; // the title block above stays clear
    return { id: `a1-c${String(i + 1).padStart(2, '0')}`, t, layer, x: Math.round(-40 + rnd() * 800), y: Math.round(y), text: ASKS[Math.floor(rnd() * ASKS.length)], name: NAMES[i % NAMES.length], col: AVC[i % AVC.length], fall: r3(p[4] + 0.02 + rnd() * 0.4), spin: Math.round((rnd() - 0.5) * 40) };
  });
  const BIG = [['a1-q1', 'តម្លៃប៉ុន្មាន?', 90, 820, p[1]], ['a1-q2', 'មានទំហំអត់?', 330, 1000, p[2]], ['a1-q3', 'នៅមានទេ?', 150, 1180, p[3]]];
  const cm = (id, name, col, text, cls, style) => `    <div id="${id}" class="cm ${cls}" style="${style}"${cls.includes('big') ? '' : ' data-layout-ignore'}><div class="cm-in"><div class="av" style="background:${col}">${name[0]}</div><div class="bx"><div class="nm">${name}</div><div class="tx">${text}</div></div></div></div>`;
  let a1js = '';
  let lastPop = -1;
  for (const m of comments) {
    if (m.t > 0) { a1js += `      tl.fromTo("#${m.id}", { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.32, ease: "back.out(1.4)" }, ${m.t});\n`; if (m.layer !== 'far' && m.t - lastPop >= 0.3) { cue(m.t + 0.05, 'pop', m.t < PAIN ? 0.8 : 0.55); lastPop = m.t; } }
    a1js += `      tl.fromTo("#${m.id}", { y: 0, rotation: 0, opacity: 1 }, { y: 900, rotation: ${m.spin}, opacity: 0, duration: 0.5, ease: "power3.in", immediateRender: false }, ${m.fall});\n`;
  }
  for (const [id] of BIG.slice(1)) a1js += `      tl.fromTo("#${id}", { y: 0, rotation: 0, opacity: 1 }, { y: 900, rotation: -14, opacity: 0, duration: 0.5, ease: "power3.in", immediateRender: false }, ${r3(p[4] + 0.15)});\n`;
  BIG.forEach(([id, , , , t]) => { a1js += `      tl.fromTo("#${id}", { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.36, ease: "back.out(1.4)" }, ${r3(t)});\n`; cue(t + 0.06, 'pop', 1.1); });
  cue(p[4] + 0.2, 'whoosh', 0.8);
  // the last question moves to the middle and becomes the shop link on the drop
  const MORPH = r3(FIX - 0.22);
  a1js += `      tl.to("#a1-q1", { x: 185, y: ${PILL_Y - 65 - 820}, duration: 0.35, ease: "power2.inOut" }, ${r3(FIX - 0.62)});
      tl.to("#a1-q1", { opacity: 0, duration: 0.02, ease: "none" }, ${MORPH});
      tl.fromTo("#a1-pill", { opacity: 0 }, { opacity: 1, duration: 0.02, ease: "none" }, ${MORPH});
      tl.fromTo("#a1-pill", { clipPath: "inset(158px 215px 159px 215px round 30px)" }, { clipPath: "inset(0px 0px 0px 0px round 30px)", duration: 0.3, ease: "power3.out" }, ${MORPH});
      tl.fromTo("#a1-pill .lp-b, #a1-pill .lp-img", { opacity: 0, filter: "blur(10px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.25, ease: "power3.out" }, ${r3(MORPH + 0.05)});
      // the counter runs up while the questions pile in
      const n = { v: 12 }, ct = document.querySelector("#a1-badge .ct");
      tl.fromTo(n, { v: 12 }, { v: 99, duration: ${r3(p[3] + 0.3)}, ease: "power1.in", onUpdate: () => { ct.textContent = n.v >= 99 ? "99+" : String(Math.round(n.v)); } }, 0);
      tl.to("#a1-badge", { opacity: 0, y: 40, duration: 0.3, ease: "power3.in" }, ${r3(p[4] + 0.1)});
      tl.fromTo("#a1-feed", { y: 0 }, { y: -320, duration: ${r3(p[4])}, ease: "none" }, 0);
      // titles: the hook is on screen at frame 0 (the thumbnail); the rest land on their words
      land("#a1-one .w", ${r3(h[2])});
      leave("#a1-stop .w, #a1-how .w, #a1-one .w", ${r3(Math.max(p[0] + 0.15, h[2] + 1.3))});
      land("#a1-same .w", ${r3(Math.max(p[0] + 0.3, h[2] + 1.45))}, 0.1);
      leave("#a1-same .w", ${r3(p[4] - 0.2)});
      land("#a1-leave1 .w", ${r3(p[4] + 0.05)});
      land("#a1-leave2 .w", ${r3(p[4] + 0.35)});
      leave("#a1-leave1 .w, #a1-leave2 .w", ${r3(FIX - 0.12)});
`;
  cue(FIX, 'hf-riser'); cue(FIX, 'hf-impact-bass-1');
  const act1 = scene('act1', `
    #a1-light { position:absolute; inset:0; background:radial-gradient(ellipse 90% 45% at 50% 0%, rgba(255,90,60,.30), rgba(0,0,0,0) 70%); }
    #a1-feed { position:absolute; inset:0; }
    .cm { position:absolute; left:0; top:0; transform-origin:0 50%; }
    .cm-in { display:flex; gap:18px; align-items:flex-start; }
    .cm .av { width:76px; height:76px; border-radius:50%; flex:none; display:grid; place-items:center; font:700 34px Inter, sans-serif; color:#fff; }
    .cm .bx { background:#fff; color:#0b0b0b; border-radius:30px; padding:14px 28px 18px; box-shadow:0 18px 40px rgba(0,0,0,.45); }
    .cm .nm { font:700 28px Inter, sans-serif; color:#1c1e21; margin-bottom:2px; }
    .cm .tx { font:400 40px/1.45 ${KH}; white-space:nowrap; }
    .cm.big .tx { font-weight:700; font-size:56px; }
    .cm.big .bx { box-shadow:0 0 0 5px #ffb23e, 0 24px 60px rgba(0,0,0,.55); }
    .far .cm-in { transform:scale(${LAYER.far.s}); opacity:${LAYER.far.o}; }
    .mid .cm-in { transform:scale(${LAYER.mid.s}); opacity:${LAYER.mid.o}; }
    .near .cm-in { transform:scale(${LAYER.near.s}); }
    #a1-badge { position:absolute; left:800px; top:720px; width:150px; height:150px; border-radius:50%; background:#fff; display:grid; place-items:center; box-shadow:0 20px 50px rgba(0,0,0,.5); z-index:3; }
    #a1-badge .ct { position:absolute; left:92px; top:-26px; min-width:96px; height:70px; padding:0 18px; border-radius:35px; background:#ff3040; color:#fff; font:800 44px/70px Inter, sans-serif; text-align:center; }
    .big { z-index:4; }
    #a1-pill { position:absolute; left:${CARD.left}px; top:${CARD.top}px; width:${CARD.w}px; height:${CARD.h}px; z-index:6; }
    ${LC.css}
    #a1-stop, #a1-one, #a1-same, #a1-leave1, #a1-leave2 { font-size:96px; line-height:1.4; color:#fff6ec; z-index:8; }
    #a1-how { font-size:150px; line-height:1.3; color:#ffb23e; z-index:8; }
    #a1-same, #a1-leave1, #a1-leave2 { font-size:84px; }`,
`    <div id="a1-light"></div>
    <div id="a1-feed">
${comments.map(m => cm(m.id, m.name, m.col, m.text, m.layer, `left:${m.x}px;top:${m.y}px;z-index:${m.layer === 'near' ? 2 : 1}`)).join('\n')}
    </div>
${BIG.map(([id, text, x, y], i) => cm(id, NAMES[(i * 5 + 3) % NAMES.length], AVC[(i * 3 + 1) % AVC.length], text, 'big near', `left:${x}px;top:${y}px`)).join('\n')}
    <div id="a1-badge"><svg width="84" height="84" viewBox="0 0 24 24"><path d="M12 3C6.5 3 2 6.9 2 11.7c0 2.6 1.3 4.9 3.4 6.5L4.6 22l4-2.2c1.1.3 2.2.5 3.4.5 5.5 0 10-3.9 10-8.6S17.5 3 12 3z" fill="#1f2937"/><circle cx="7.6" cy="11.7" r="1.4" fill="#fff"/><circle cx="12" cy="11.7" r="1.4" fill="#fff"/><circle cx="16.4" cy="11.7" r="1.4" fill="#fff"/></svg><div class="ct">12</div></div>
    <div id="a1-pill">${LC.html(0)}</div>
    ${words('a1-stop', 'ឈប់ឆ្លើយ', 'top:170px')}
    ${words('a1-how', '“តម្លៃប៉ុន្មាន?”', 'top:295px')}
    ${words('a1-one', 'ម្ដងមួយៗទៅ!', 'top:500px')}
    ${words('a1-same', 'ភ្ញៀវរាប់សិបនាក់ សួរដដែលៗ', 'top:300px')}
    ${words('a1-leave1', 'ឆ្លើយមិនទាន់...', 'top:240px')}
    ${words('a1-leave2', 'ភ្ញៀវក៏ទៅបាត់', 'top:380px')}`,
  a1js);

  // =============================== act 2: the link, the phone, the order (FIX → CTA) ===============================
  const s = t => r3(t - FIX);
  const P = iphone({ id: 'a2' });
  const { K, SW, SH, ST, RAD, at } = P;
  const PILLBOX = { left: 110, top: ST, w: 860, h: SH }; // the link card grows inside this box into the screen
  const pillInsetStart = `inset(${r3(CARD.top - ST)}px 0px ${r3(ST + SH - CARD.top - CARD.h)}px 0px round 30px)`;
  const pillInsetEnd = `inset(0px ${r3((860 - SW) / 2)}px 0px ${r3((860 - SW) / 2)}px round ${r3(RAD)}px)`;
  const clickPill = s(f[1] + 0.15), phoneOn = r3(clickPill + 0.65);
  const tapProd = r3(Math.max(s(f[2]) - 0.2, phoneOn + 0.35)), scrollAt = r3(Math.max(s(f[2]) + 0.25, tapProd + 0.3));
  const lifts = [ // region of 04_option (app points), where its middle goes, its time
    { id: 'a2-l-price', r: [12, 276, 96, 40], to: [330, 760], t: s(f[2] + fl[2] * 0.25) },
    { id: 'a2-l-sizes', r: [10, 380, 332, 54], to: [540, 1150], t: s(f[2] + fl[2] * 0.5) },
    { id: 'a2-l-stock', r: [8, 312, 140, 32], to: [770, 820], t: s(f[2] + fl[2] * 0.8) },
  ];
  const tap38 = s(f[3] + 0.1), camIn = r3(s(f[3]) + 0.75), tapBuy = r3(Math.max(camIn + 0.6, s(f[3] + fl[3] * 0.62))), camOut = r3(tapBuy + 0.25);
  const whip = r3(Math.max(s(f[4]) + 0.05, tapBuy + 0.55)), rowT = s(f[4] + fl[4] * 0.3), alertT = s(f[4] + fl[4] * 0.62), clickAlert = s(CTA - 0.12);
  const ROW = { r: [0, 226, 390, 92], scale: 1.75, to: [540, 700] };
  const P38 = at(160, 407), PBUY = at(288, 808), PPROD = at(100, 560), ALERT = [540, r3(ST + 52 * K + 62)];
  let a2js = `      land("#a2-with .w", 0.05, 0.12);
      leave("#a2-with .w", ${r3(s(f[1]) - 0.18)});
      land("#a2-link .w", ${s(f[1])});
      leave("#a2-link .w", ${r3(Math.max(s(f[2]) - 0.2, tapProd - 0.1))});
      // the cursor comes in and clicks the link; the card grows into the phone's screen
      tl.fromTo("#a2-cur", { x: 1160, y: 1500 }, { x: ${640 - TIP[0]}, y: ${CARD.top + 395 - TIP[1]}, duration: 0.55, ease: "power2.out" }, ${r3(clickPill - 0.55)});
      press("#a2-cur", ${clickPill});
      tl.fromTo("#a2-pill", { clipPath: "${pillInsetStart}" }, { clipPath: "${pillInsetEnd}", duration: 0.65, ease: "power2.inOut" }, ${clickPill});
      tl.to("#a2-pill .lp", { opacity: 0, duration: 0.18, ease: "none" }, ${clickPill});
      tl.fromTo("#a2-pill-shot", { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power2.out" }, ${r3(clickPill + 0.15)});
      tl.fromTo("#a2-phone", { opacity: 0, scale: 1.03 }, { opacity: 1, scale: 1, duration: 0.3, ease: "expo.out" }, ${phoneOn});
      tl.to("#a2-pill", { opacity: 0, duration: 0.05, ease: "none" }, ${r3(phoneOn + 0.12)});
      // tap the first shoe: the product page comes in slightly large and settles
      move("#a2-cur", ${PPROD[0]}, ${PPROD[1]}, ${r3(tapProd - 0.45)}, 0.45);
      press("#a2-cur", ${tapProd});
      tl.to("#a2-shop", { opacity: 0, duration: 0.05, ease: "none" }, ${tapProd});
      tl.fromTo("#a2-product", { opacity: 0, scale: 1.04 }, { opacity: 1, scale: 1, duration: 0.25, ease: "expo.out" }, ${tapProd});
      tl.fromTo("#a2-header, #a2-footer", { opacity: 0 }, { opacity: 1, duration: 0.05, ease: "none" }, ${tapProd});
      move("#a2-cur", 150, 1420, ${r3(tapProd + 0.2)}, 0.4);
      // the page scrolls to the sizes; price, sizes and stock lift out one at a time
      tl.to("#a2-product", { y: ${r3(-226 * K)}, opacity: 0, duration: 0.5, ease: "power2.inOut" }, ${scrollAt});
      tl.fromTo("#a2-option, #a2-patch38", { y: ${r3(226 * K)}, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power2.inOut" }, ${scrollAt});
`;
  lifts.forEach((L, i) => {
    const out = i < lifts.length - 1 ? r3(lifts[i + 1].t - 0.08) : r3(s(f[3]) - 0.05);
    a2js += P.lift(L.id, L.r, L.to, 2, L.t, out);
    cue(FIX + L.t + 0.12, 'pop', 0.9);
  });
  a2js += `      land("#a2-see .w1", ${lifts[0].t}); land("#a2-see .d1", ${r3(lifts[0].t + 0.1)}); land("#a2-see .w2", ${lifts[1].t}); land("#a2-see .d2", ${r3(lifts[1].t + 0.1)}); land("#a2-see .w3", ${lifts[2].t});
      leave("#a2-see .w", ${r3(s(f[3]) - 0.18)});
      // pick 38 (it selects on the click), punch in, tap Buy now, "Thank you" as the camera pulls back
      land("#a2-pick .w", ${s(f[3])});
      move("#a2-cur", ${P38[0]}, ${P38[1]}, ${r3(tap38 - 0.45)}, 0.45);
      press("#a2-cur", ${tap38});
      tl.to("#a2-patch38", { opacity: 0, duration: 0.03, ease: "none" }, ${tap38});
      tl.to("#a2-pick", { opacity: 0, duration: 0.12, ease: "none" }, ${r3(camIn + 0.45)}); // carried off the top by the camera
      tl.to("#a2-cam", { scale: 1.15, y: -330, duration: 0.5, ease: "power2.inOut" }, ${camIn});
      move("#a2-cur", ${PBUY[0]}, ${PBUY[1]}, ${r3(tapBuy - 0.5)}, 0.5);
      press("#a2-cur", ${tapBuy});
      tl.to("#a2-option, #a2-header, #a2-footer", { opacity: 0, duration: 0.05, ease: "none" }, ${tapBuy});
      tl.fromTo("#a2-thanks", { opacity: 0, scale: 1.04 }, { opacity: 1, scale: 1, duration: 0.25, ease: "expo.out" }, ${tapBuy});
      tl.to("#a2-cam", { scale: 1, y: 0, duration: 0.5, ease: "power2.inOut" }, ${camOut});
      move("#a2-cur", 900, 1500, ${r3(camOut + 0.1)}, 0.45);
      // whip to the seller: the order is in the list, then the Telegram alert drops in
      tl.to("#a2-thanks", { x: ${r3(-SW)}, filter: "blur(10px)", duration: 0.2, ease: "power3.in" }, ${whip});
      tl.fromTo("#a2-dash", { x: ${r3(SW)}, opacity: 1, filter: "blur(10px)" }, { x: 0, opacity: 1, duration: 0.2, ease: "power3.out" }, ${r3(whip + 0.1)});
      tl.to("#a2-dash", { filter: "blur(0px)", duration: 0.13, ease: "power2.out" }, ${r3(whip + 0.3)});
      land("#a2-inbox .w1", ${r3(s(f[4]) + 0.05)}); land("#a2-inbox .w2", ${rowT}); land("#a2-inbox .w3", ${r3(rowT + 0.25)}); land("#a2-inbox .w4", ${alertT});
${P.lift('a2-l-row', ROW.r, ROW.to, ROW.scale, rowT, r3(alertT - 0.05))}      tl.fromTo("#a2-banner", { y: -240, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "expo.out" }, ${alertT});
      move("#a2-cur", ${ALERT[0] + 120}, ${ALERT[1]}, ${r3(clickAlert - 0.5)}, 0.5);
      press("#a2-cur", ${clickAlert});
      leave("#a2-inbox .w", ${r3(clickAlert)});
`;
  cue(FIX + clickPill, 'click'); cue(FIX + clickPill + 0.33, 'whoosh', 0.8); cue(FIX + tapProd, 'click'); cue(FIX + tap38, 'click');
  cue(FIX + tapBuy, 'click'); cue(FIX + tapBuy + 0.1, 'pop', 0.8); cue(FIX + whip + 0.12, 'whoosh', 0.9); cue(FIX + rowT + 0.1, 'pop', 0.8);
  cue(FIX + alertT + 0.12, 'pop', 0.9); cue(FIX + clickAlert, 'click');
  const view = [
    P.shot('a2-shop', '01_shop'),
    P.shot('a2-product', '03_product', 'opacity:0'),
    P.shot('a2-option', '04_option', 'opacity:0'),
    P.crop('a2-patch38', '03_product', 128, 610, 64, 48, 'opacity:0;margin-top:' + r3(-226 * K) + 'px'),
    P.crop('a2-header', '04_option', 0, 0, 390, 56, 'opacity:0'),
    P.crop('a2-footer', '04_option', 0, 772, 390, 72, 'opacity:0'),
    P.shot('a2-thanks', '06_confirmation', 'opacity:0'),
    P.shot('a2-dash', '07_dashboard', 'opacity:0'),
  ].map(x => '            ' + x).join('\n');
  const banner = `          <div id="a2-banner"><div class="ico"></div><div style="flex:1"><div class="hd"><span>TELEGRAM</span><span>now</span></div><div class="b1">Oak Order</div><div class="b2">ការកុម្ម៉ង់ថ្មី #1007 · $16.50</div></div></div>`;
  const act2 = scene('act2', `
    #a2-light { position:absolute; inset:0; background:radial-gradient(ellipse 90% 45% at 50% 0%, rgba(255,255,255,.10), rgba(0,0,0,0) 70%); }
    .ttl { color:#ffffff; font-size:96px; line-height:1.4; top:210px; z-index:8; }
    .ttl .hl { color:#ffe45c; }
    .ttl .dot { opacity:.75; }
    #a2-cam { position:absolute; inset:0; transform-origin:540px 960px; }
    ${P.css}
    #a2-banner { position:absolute; left:14px; right:14px; top:${r3(52 * K)}px; border-radius:30px; padding:18px 22px; display:flex; gap:16px; align-items:center; background:rgba(245,245,247,.97); box-shadow:0 14px 34px rgba(0,0,0,.25); color:#111; z-index:8; }
    #a2-banner .ico { width:64px; height:64px; border-radius:15px; background:#1f3350 url(assets/brand/oak-acorn-on-navy-1024.png) center/cover; flex:none; }
    #a2-banner .hd { font:600 28px Inter, sans-serif; color:#666; display:flex; justify-content:space-between; }
    #a2-banner .b1 { font:700 30px Inter, sans-serif; }
    #a2-banner .b2 { font:400 28px/1.4 ${KH}; }
    #a2-pill { position:absolute; left:${PILLBOX.left}px; top:${PILLBOX.top}px; width:${PILLBOX.w}px; height:${r3(PILLBOX.h)}px; background:#fff; z-index:6; }
    ${LC.css}
    #a2-pill .lp { box-shadow:none; }
    #a2-pill-shot { position:absolute; left:${r3((860 - SW) / 2)}px; top:0; width:${r3(SW)}px; height:${r3(SH)}px; }
    ${P.LIFT_CSS}`,
`    <div id="a2-light"></div>
    ${words('a2-with', 'ជាមួយ Oak&nbsp;Order', '').replace('<span class="w">Oak&nbsp;Order</span>', '<span class="w hl">Oak&nbsp;Order</span>')}
    ${words('a2-link', 'ផ្ញើ link តែមួយ', '')}
    <div id="a2-see" class="ttl"><span class="w w1">តម្លៃ</span> <span class="w dot d1">·</span> <span class="w w2">ទំហំ</span> <span class="w dot d2">·</span> <span class="w w3">ស្តុក</span></div>
    <div id="a2-inbox" class="ttl"><span class="w w1">ចូល</span> <span class="w w2 hl">បញ្ជី</span> <span class="w w3">និង</span> <span class="w w4 hl">Telegram</span></div>
    <div id="a2-cam">
      ${words('a2-pick', 'រើស ហើយកុម្ម៉ង់', '')}
      ${P.html({ view, overlay: banner })}
      <div id="a2-pill">${LC.html(r3(CARD.top - ST))}
        <div id="a2-pill-shot"><div style="position:absolute;left:0;top:${r3(50 * K)}px;width:${r3(SW)}px;height:${r3(844 * K)}px;background:url(${IMG('01_shop')}) 0 0 / ${r3(SW)}px auto no-repeat"></div></div></div>
${lifts.map(L => P.liftBox(L.id, '04_option', L.r)).join('\n')}
${P.liftBox('a2-l-row', '07_dashboard', ROW.r)}
      ${CURSOR('a2-cur')}
    </div>`,
  a2js);

  // =============================== act 3: the offer and the end card (CTA → END) ===============================
  // From the reference IMG_4465 (Prodigis, @olaf.motion): the claim on a navy screen in white words, then the
  // brand in navy on a light grey ground with a faint dot grid. Navy is Oak's own #1f3350.
  const u = t => r3(t - CTA);
  const tapTg = u(c[1] + cl[1] * 0.55), endAt = u(T.voiceEnd + 0.05), markClick = r3(endAt + 0.4);
  const a3js = `      tl.fromTo("#a3-world", { clipPath: "circle(0px at ${ALERT[0]}px ${ALERT[1]}px)" }, { clipPath: "circle(2300px at ${ALERT[0]}px ${ALERT[1]}px)", duration: 0.22, ease: "power2.in" }, 0);
      land("#a3-free .w", ${r3(u(c[0]) + 0.08)});
      tl.fromTo("#a3-30", { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.4)" }, ${r3(u(c[0]) + cl[0] * 0.35)});
      land("#a3-days .w", ${r3(u(c[0]) + cl[0] * 0.55)});
      land("#a3-nocard .w", ${r3(u(c[0]) + cl[0] * 0.85)}, 0.06);
      // the Telegram button lands on the navy; the cursor clicks it and the ground floods to light grey
      tl.fromTo("#a3-btn", { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.4)" }, ${u(c[1])});
      tl.fromTo("#a3-cur", { x: 1160, y: 1700 }, { x: ${700 - TIP[0]}, y: ${1155 - TIP[1]}, duration: 0.5, ease: "power2.out" }, ${r3(tapTg - 0.5)});
      press("#a3-cur", ${tapTg});
      tl.to("#a3-btn", { scale: 0.96, duration: 0.066, ease: "power2.in" }, ${r3(tapTg - 0.066)});
      tl.to("#a3-btn", { scale: 1, duration: 0.12, ease: "power2.out" }, ${tapTg});
      leave("#a3-free .w, #a3-days .w, #a3-nocard .w", ${tapTg});
      tl.to("#a3-30", { opacity: 0, filter: "blur(8px)", duration: 0.18, ease: "power2.in" }, ${tapTg});
      tl.fromTo("#a3-lightground", { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power2.inOut" }, ${tapTg});
      tl.fromTo("#a3-btn", { backgroundColor: "#ffffff", color: "#1f3350" }, { backgroundColor: "#0088cc", color: "#ffffff", duration: 0.35, ease: "power2.inOut" }, ${tapTg});
      tl.fromTo("#a3-btn .ic", { color: "#0088cc" }, { color: "#ffffff", duration: 0.35, ease: "power2.inOut" }, ${tapTg});
      land("#a3-tme .w", ${r3(tapTg + 0.25)});
      // end card: the cursor clicks the centre, the acorn fills up, the wordmark wipes in, the offer line lands
      move("#a3-cur", 548, 590, ${r3(markClick - 0.4)}, 0.4);
      press("#a3-cur", ${markClick});
      tl.fromTo("#a3-acorn", { clipPath: "inset(100% 0% 0% 0%)", scale: 0.9 }, { clipPath: "inset(0% 0% 0% 0%)", scale: 1, duration: 0.45, ease: "power2.out" }, ${markClick});
      tl.to("#a3-cur", { x: 1200, y: 1500, duration: 0.3, ease: "power3.in" }, ${r3(markClick + 0.2)});
      tl.fromTo("#a3-name", { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.35, ease: "power3.out" }, ${r3(markClick + 0.35)});
      land("#a3-line .w", ${r3(markClick + 0.45)});
`;
  cue(CTA + 0.1, 'whoosh', 0.8); cue(CTA + u(c[0]) + cl[0] * 0.35 + 0.1, 'pop', 1); cue(CTA + u(c[1]) + 0.1, 'pop', 0.8);
  cue(CTA + tapTg, 'click'); cue(CTA + tapTg + 0.15, 'whoosh', 0.45);
  cue(CTA + markClick, 'click'); cue(CTA + markClick + 0.2, 'pop', 0.9); cue(CTA + markClick + 0.4, 'whoosh', 0.5);
  const act3 = scene('act3', `
    #a3-world { position:absolute; inset:0; background:#1f3350; }
    #a3-light { position:absolute; inset:0; background:radial-gradient(ellipse 90% 45% at 50% 0%, rgba(159,183,217,.20), rgba(159,183,217,0) 70%); }
    #a3-lightground { position:absolute; inset:0; background-color:#f3f5f7;
      background-image:radial-gradient(ellipse 80% 40% at 50% 38%, rgba(159,183,217,.28), rgba(159,183,217,0) 70%), radial-gradient(rgba(31,51,80,.09) 1.6px, rgba(0,0,0,0) 1.8px);
      background-size:100% 100%, 30px 30px; }
    .ttl { color:#ffffff; }
    #a3-free { font-size:124px; line-height:1.3; }
    #a3-days { font-size:96px; line-height:1.4; }
    #a3-30 { position:absolute; left:0; right:0; top:470px; text-align:center; font:900 360px/1 Inter, sans-serif; color:#ffffff; letter-spacing:-0.04em; }
    #a3-nocard { font-size:48px; font-weight:400; color:#9fb7d9; }
    #a3-btn { position:absolute; left:240px; top:1090px; width:600px; height:120px; border-radius:28px; background:#ffffff; color:#1f3350; display:flex; align-items:center; justify-content:center; gap:22px; font:700 54px/1 ${KH}; box-shadow:0 18px 40px rgba(10,20,40,.30); z-index:5; }
    #a3-btn .ic { display:flex; color:#0088cc; }
    #a3-tme { top:1225px; font:600 44px/1.3 Inter, sans-serif; color:#1f3350; }
    #a3-acorn { position:absolute; left:${540 - 120}px; top:450px; width:240px; height:240px; }
    #a3-name { position:absolute; left:${540 - 260}px; top:720px; width:520px; }
    #a3-line { top:900px; font-size:60px; color:#1f3350; }`,
`    <div id="a3-world">
      <div id="a3-light"></div>
      <div id="a3-lightground"></div>
      ${words('a3-free', 'ឥតគិតថ្លៃ', 'top:300px')}
      <div id="a3-30">30</div>
      ${words('a3-days', 'ថ្ងៃដំបូង', 'top:830px')}
      ${words('a3-nocard', 'គ្មានកាត · ចាប់ពីថ្ងៃបើកហាង', 'top:975px')}
      <img id="a3-acorn" src="assets/brand/navy_oak-acorn-1024.png">
      <img id="a3-name" src="assets/brand/navy_oak-order-name.png">
      ${words('a3-line', 'ឥតគិតថ្លៃ 30 ថ្ងៃដំបូង', '')}
      <div id="a3-btn"><span class="ic">${TELEGRAM_ICON()}</span>ឆាតមកយើង</div>
      ${words('a3-tme', 't.me/longreaksa', '')}
      ${CURSOR('a3-cur')}
    </div>`,
  a3js);

  return {
    END,
    scenes: [
      { id: 'act1', start: 0, duration: FIX, html: act1 },
      { id: 'act2', start: FIX, duration: CTA - FIX + 0.3, html: act2 }, // runs under act 3's iris
      { id: 'act3', start: CTA, duration: END - CTA, html: act3 },
    ],
    ground: { from: '#420c12', to: '#0c8063', at: FIX - 0.05, why: 'on the drop: crimson pain → bright teal fix' },
    // the track's drop (10.4 s in) lands on the fix; louder under the quiet intro, 0.16 under the voice,
    // up on the end card once the voice stops
    music: { file: 'trap-electro-vibes.mp3', mediaStart: 10.4 - FIX, points: [{ t: 0, v: 0.3 }, { t: r3(FIX - 0.1), v: 0.3 }, { t: r3(FIX), v: 0.16 }, { t: r3(T.voiceEnd), v: 0.16 }, { t: r3(T.voiceEnd + 0.4), v: 0.42 }, { t: END, v: 0.42 }] },
    cues,
    summary: `${comments.length} comments`,
  };
}
