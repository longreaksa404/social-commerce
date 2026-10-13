"""Oak's mark, the oak leaf cut out of a hexagon, for link-preview pictures.

Pillow can't draw the SVG's curves, so the shape comes as two masks drawn
from it (frontend/src/components/OakMark.tsx, public/favicon.svg): the mark
itself (oak_mark_shape.png) and the hexagon without the leaf cut out
(oak_mark_outline.png), 255 inside. Both have room around the shape for the
badge's ring. Redraw them if the mark changes.
"""

from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageFilter

NAVY = (31, 51, 80)  # #1f3350, the brand colour

_HERE = Path(__file__).parent


@lru_cache(maxsize=2)
def _source(name: str) -> Image.Image:
    with Image.open(_HERE / f"oak_mark_{name}.png") as image:
        return image.convert("L")


def _mask(name: str, height: int) -> Image.Image:
    source = _source(name)
    width = max(1, round(source.width * height / source.height))
    return source.resize((width, height), Image.Resampling.LANCZOS)


@lru_cache(maxsize=8)
def badge(size: int) -> Image.Image:
    """Our mark as a badge for a corner, `size` px tall: the navy hexagon
    with its white leaf, in a thin white ring, transparent around."""
    shape = _mask("shape", size)
    ring = max(1, round(size * 0.035))
    outline = _mask("outline", size).filter(ImageFilter.MaxFilter(2 * ring + 1))
    image = Image.new("RGBA", shape.size, (255, 255, 255, 0))
    image.putalpha(outline)
    image.paste(Image.new("RGBA", shape.size, (*NAVY, 255)), (0, 0), shape)
    return image
