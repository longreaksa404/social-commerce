/** A parcel slip as one picture (founder's pick 4A, 2026-10-25): 576 px
 * wide, the width of an 80 mm receipt printer (it fits 58 mm ones scaled
 * down), black on white. The same picture is shown, saved, shared to a
 * Bluetooth printer's app or to the customer, and printed. */

export type ReceiptLine =
  | { kind: 'title' | 'text' | 'strong' | 'small' | 'center'; text: string }
  | { kind: 'pair'; left: string; right: string; strong?: boolean }
  | { kind: 'rule' }
  | { kind: 'box'; text: string }

const WIDTH = 576
const PAD = 28
const INNER = WIDTH - PAD * 2

const STYLE: Record<'title' | 'text' | 'strong' | 'small' | 'center' | 'box', { size: number; weight: number }> = {
  title: { size: 36, weight: 700 },
  text: { size: 26, weight: 400 },
  strong: { size: 28, weight: 700 },
  small: { size: 22, weight: 400 },
  center: { size: 24, weight: 400 },
  box: { size: 30, weight: 800 },
}

/** The app's own font stack, Khmer included, so names read as typed. */
function fontStack(): string {
  return getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif'
}

/** `text` broken into lines no wider than `max`, at word gaps (or
 * anywhere, for Khmer with no spaces). */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const out: string[] = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const piece of paragraph.split(/(\s+)/)) {
      const next = line + piece
      if (ctx.measureText(next).width <= max || !line.trim()) {
        line = next
        // A single piece wider than the line (Khmer): cut it by letters.
        while (ctx.measureText(line).width > max && line.length > 1) {
          let cut = line.length - 1
          while (cut > 1 && ctx.measureText(line.slice(0, cut)).width > max) cut--
          out.push(line.slice(0, cut))
          line = line.slice(cut)
        }
      } else {
        out.push(line.trimEnd())
        line = piece.trimStart()
      }
    }
    out.push(line.trimEnd())
  }
  return out
}

export async function drawReceipt(lines: ReceiptLine[]): Promise<{ canvas: HTMLCanvasElement; url: string }> {
  await document.fonts?.ready
  const font = fontStack()
  // First pass measures, second draws.
  const measure = document.createElement('canvas').getContext('2d')!
  const setFont = (ctx: CanvasRenderingContext2D, size: number, weight: number) => {
    ctx.font = `${weight} ${size}px ${font}`
  }
  type Drawn = { height: number; draw: (ctx: CanvasRenderingContext2D, y: number) => void }
  const blocks: Drawn[] = lines.map((line) => {
    if (line.kind === 'rule') {
      return {
        height: 26,
        draw: (ctx, y) => {
          ctx.setLineDash([10, 8])
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(PAD, y + 13)
          ctx.lineTo(WIDTH - PAD, y + 13)
          ctx.stroke()
          ctx.setLineDash([])
        },
      }
    }
    if (line.kind === 'pair') {
      const style = line.strong ? STYLE.strong : STYLE.text
      setFont(measure, style.size, style.weight)
      const rightWidth = measure.measureText(line.right).width
      const leftLines = wrap(measure, line.left, INNER - rightWidth - 16)
      const lh = style.size * 1.35
      return {
        height: leftLines.length * lh,
        draw: (ctx, y) => {
          setFont(ctx, style.size, style.weight)
          leftLines.forEach((text, i) => ctx.fillText(text, PAD, y + style.size + i * lh))
          ctx.textAlign = 'right'
          ctx.fillText(line.right, WIDTH - PAD, y + style.size)
          ctx.textAlign = 'left'
        },
      }
    }
    if (line.kind === 'box') {
      const style = STYLE.box
      setFont(measure, style.size, style.weight)
      const boxLines = wrap(measure, line.text, INNER - 32)
      const lh = style.size * 1.3
      const height = boxLines.length * lh + 28
      return {
        height: height + 10,
        draw: (ctx, y) => {
          ctx.lineWidth = 4
          ctx.strokeRect(PAD + 2, y + 5, INNER - 4, height)
          setFont(ctx, style.size, style.weight)
          ctx.textAlign = 'center'
          boxLines.forEach((text, i) => ctx.fillText(text, WIDTH / 2, y + 5 + 14 + style.size + i * lh))
          ctx.textAlign = 'left'
        },
      }
    }
    const style = STYLE[line.kind]
    setFont(measure, style.size, style.weight)
    const wrapped = wrap(measure, line.text, INNER)
    const lh = style.size * 1.35
    const centered = line.kind === 'title' || line.kind === 'center'
    return {
      height: wrapped.length * lh,
      draw: (ctx, y) => {
        setFont(ctx, style.size, style.weight)
        ctx.textAlign = centered ? 'center' : 'left'
        wrapped.forEach((text, i) => ctx.fillText(text, centered ? WIDTH / 2 : PAD, y + style.size + i * lh))
        ctx.textAlign = 'left'
      },
    }
  })

  const gap = 6
  const height = PAD * 2 + blocks.reduce((sum, block) => sum + block.height + gap, 0)
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = Math.ceil(height)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#000000'
  ctx.strokeStyle = '#000000'
  let y = PAD
  for (const block of blocks) {
    block.draw(ctx, y)
    y += block.height + gap
  }
  return { canvas, url: canvas.toDataURL('image/png') }
}
