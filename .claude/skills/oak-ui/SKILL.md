---
name: oak-ui
description: Oak Order's design rules and the founder's way of picking designs. Use this for any change to how something in frontend/ looks or works: a new page or screen, a redesign, a new button, form, setting or sheet, colours, layout, empty states, mockups, or "make it look better". Use it even for small UI tweaks, and use it together with (and ahead of) the general frontend-design skill, because Oak's calm look overrides that skill's push for bold colours and fonts.
---

# Oak Order UI

Who it's for: small sellers in Cambodia running their shop from a phone, and
their customers, who arrive from a Facebook or TikTok link. Khmer is the default
language. Most screens are seen at about 390 px wide, often on a slow
connection.

The code-level rules (tokens, components, dark mode, shop colours, touch
targets) are written down in `docs/CODEBASE.md` §8 under "Shared components and
helpers", "i18n" and "Tailwind conventions". Read those before writing UI code.
This skill covers the founder's taste and how they decide.

## The founder's taste

- **Calm.** One quiet colour (navy) on white and grey. The product photos carry
  the colour. No extra accent colours, gradients or decorative fonts. Kantumruy
  Pro is the only font. If the general frontend-design skill suggests a bold
  palette or a display font, this rule wins.
- **Emerald means success only:** paid, delivered, saved, in stock.
- **Red and amber go on words only.** No tinted boxes, pills, borders or icon
  circles. "Payment failed" is red text on a plain card.
- **Write the shop's colour, not navy.** A seller picks their shop's colour,
  and the dashboard and shop follow it. So use `navy-*` / `bg-accent` with
  `text-on-accent`, which follow that colour. Use `text-oak` only for Oak's own
  mark.
- **Nothing changes until Save.** Picking a swatch, toggling a setting or
  choosing a photo goes into the page's form. The seller sees the change only
  after Save (`useUnsavedChanges` guards leaving). Don't build "saved at once"
  controls without asking.
- **"Redesign" includes UX.** Count the taps to the goal, remove duplicated
  information, and bring hidden actions forward. A visual pass on its own isn't
  what they mean.

## How the founder decides

For anything where taste is involved (a new screen, a redesign, a new visible
control), **show options before building**:

1. Publish an options page (an Artifact) split into numbered sections, one per
   decision.
2. Each section shows 2–3 **live** options side by side, labelled A/B/C.
   - Mark one as **Recommended**, with a one-line reason.
   - Show it in the real place: a phone frame at ~390 px, real-looking Khmer
     and English text, a real product photo or a placeholder.
   - Show light and dark if colour is involved.
   - Make motion interactive.
3. Explain each option with a concrete seller or customer moment. For example:
   "Dara gets 30 orders on Friday night: with B she marks each paid in one tap
   from the list."
4. The founder replies like `1A 2B 3A`. Build exactly that.

If they like a direction but not the details ("more options"), make a second
round of 5–6 variations within that direction.

For a small tweak or a bug fix, skip the options page. Make the change and
describe it in one or two lines.

Anything that adds a feature outside the MVP docs gets flagged separately,
under project rule 4 in CLAUDE.md. Don't slip it in with the design.

## Building it

Follow `docs/CODEBASE.md` §10 "Adding a page". The rules that get missed most:

- Every text has `{ en, km }` in `src/i18n/messages/<area>.ts`. Make the Khmer
  natural, not word-for-word. Khmer runs longer, so check that it fits.
- Write classes for light mode only. Use `bg-surface`, never `bg-white`.
- Use `cardClass` and `buttonClass` and the parts in `components/ui.tsx`. Don't
  build one-off buttons.
- Touch targets are at least `min-h-11`. Inputs are 16 px, so iOS doesn't zoom.
- Fixed bars use safe-area insets.
- Show `Skeleton` while loading, `ErrorState` with retry on error, and
  `EmptyState` when there's nothing.

Then look at it before calling it done: at 390 px in Khmer, in light and dark
(use the `run` skill to open it). Fix anything that wraps badly or looks loud.
