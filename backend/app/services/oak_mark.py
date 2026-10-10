"""Oak's mark, the oak leaf, drawn with Pillow for link-preview pictures.

The same shape as frontend/src/components/OakLeaf.tsx and
frontend/public/favicon.svg (their viewBox is 28 6 144 250); change all
three together.
"""

from functools import lru_cache

from PIL import Image, ImageChops, ImageDraw

NAVY = (31, 51, 80)  # #1f3350, the brand colour

VIEW_X, VIEW_Y, VIEW_W, VIEW_H = 28, 6, 144, 250
# The leaf's lobes: (cx, cy, rx, ry, turn in degrees as in the SVG).
LOBES = (
    (100, 118, 19, 92, 0),
    (100, 42, 23, 30, 0),
    (134, 90, 36, 17, -28),
    (66, 90, 36, 17, 28),
    (132, 136, 33, 16, -24),
    (68, 136, 33, 16, 24),
    (124, 174, 25, 13, -20),
    (76, 174, 25, 13, 20),
)
VEIN = (97.5, 50, 5, 138, 2.5)  # x, y, width, height, corner radius; cut out
STEM = (95.5, 194, 9, 56, 4.5)
# Drawn this many times larger, then shrunk, for smooth edges.
SUPERSAMPLE = 4


def leaf_mask(height: int) -> Image.Image:
    """The leaf as an "L" mask `height` px tall: 255 is leaf, 0 is not."""
    scale = height * SUPERSAMPLE / VIEW_H
    size = (round(VIEW_W * scale), round(VIEW_H * scale))

    def box(x: float, y: float, w: float, h: float) -> list[float]:
        return [
            (x - VIEW_X) * scale,
            (y - VIEW_Y) * scale,
            (x - VIEW_X + w) * scale,
            (y - VIEW_Y + h) * scale,
        ]

    mask = Image.new("L", size, 0)
    for cx, cy, rx, ry, turn in LOBES:
        lobe = Image.new("L", size, 0)
        ImageDraw.Draw(lobe).ellipse(box(cx - rx, cy - ry, 2 * rx, 2 * ry), fill=255)
        if turn:
            # The SVG turns clockwise for a positive angle; Pillow the other way.
            centre = ((cx - VIEW_X) * scale, (cy - VIEW_Y) * scale)
            lobe = lobe.rotate(-turn, resample=Image.Resampling.BICUBIC, center=centre)
        mask = ImageChops.lighter(mask, lobe)
    draw = ImageDraw.Draw(mask)
    x, y, w, h, r = VEIN
    draw.rounded_rectangle(box(x, y, w, h), radius=r * scale, fill=0)
    x, y, w, h, r = STEM
    draw.rounded_rectangle(box(x, y, w, h), radius=r * scale, fill=255)
    width = max(1, round(size[0] / SUPERSAMPLE))
    return mask.resize((width, height), Image.Resampling.LANCZOS)


@lru_cache(maxsize=8)
def badge(size: int) -> Image.Image:
    """Our mark as a badge for a corner: the white leaf on a navy rounded
    square with a thin white ring, `size` px square, transparent around."""
    big = size * SUPERSAMPLE
    ring = max(1, round(size * 0.06)) * SUPERSAMPLE
    image = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle([0, 0, big - 1, big - 1], radius=big * 0.26, fill=(255, 255, 255, 255))
    inner = [ring, ring, big - 1 - ring, big - 1 - ring]
    draw.rounded_rectangle(inner, radius=(big - 2 * ring) * 0.24, fill=(*NAVY, 255))
    image = image.resize((size, size), Image.Resampling.LANCZOS)

    leaf = leaf_mask(round(size * 0.6))
    white = Image.new("RGBA", leaf.size, (255, 255, 255, 255))
    image.paste(white, ((size - leaf.width) // 2, (size - leaf.height) // 2), leaf)
    return image
