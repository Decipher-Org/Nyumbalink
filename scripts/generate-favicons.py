#!/usr/bin/env python3
"""Regenerate the favicon set in public/ from the source logo.

Run after replacing src/assets/nyumbalink-logo.png:

    python3 scripts/generate-favicons.py

Requires Pillow (pip install Pillow). The generated PNGs are committed, so this
only needs to run when the logo itself changes — it is not part of the build.
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src" / "assets" / "nyumbalink-logo.png"
OUT = ROOT / "public"

# Page background. iOS composites touch icons onto black, so those need an
# opaque ground rather than the transparency the tab favicons use.
CREAM = (251, 249, 245, 255)


def load_mark() -> Image.Image:
    """Crop the source to the mark's visible bounds.

    A plain getbbox() would include the faint glow halo baked into the source
    (alpha 1-8), adding ~340px of invisible padding that shrinks the mark to
    illegibility at 16px. Thresholding at 8 finds the real edges.
    """
    im = Image.open(SRC).convert("RGBA")
    bbox = im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    return im.crop(bbox)


def square(img: Image.Image, size: int, pad_ratio: float = 0.06, bg=None) -> Image.Image:
    """Fit the mark into a square canvas, centred, with even padding."""
    inner = round(size * (1 - 2 * pad_ratio))
    scale = min(inner / img.width, inner / img.height)
    w, h = max(1, round(img.width * scale)), max(1, round(img.height * scale))
    canvas = Image.new("RGBA", (size, size), bg or (0, 0, 0, 0))
    resized = img.resize((w, h), Image.LANCZOS)
    canvas.paste(resized, ((size - w) // 2, (size - h) // 2), resized)
    return canvas


def main() -> None:
    mark = load_mark()
    OUT.mkdir(exist_ok=True)

    # Tab favicons stay transparent so they read on light and dark tab bars.
    for size in (16, 32, 48, 96):
        square(mark, size).save(OUT / f"favicon-{size}x{size}.png", optimize=True)
    square(mark, 32).save(OUT / "favicon.png", optimize=True)

    square(mark, 180, pad_ratio=0.14, bg=CREAM).convert("RGB").save(
        OUT / "apple-touch-icon.png", optimize=True
    )
    for size in (192, 512):
        square(mark, size, pad_ratio=0.12, bg=CREAM).convert("RGB").save(
            OUT / f"icon-{size}.png", optimize=True
        )

    mark.resize((512, round(mark.height * 512 / mark.width)), Image.LANCZOS).save(
        OUT / "logo.png", optimize=True
    )
    print(f"Regenerated favicons in {OUT} from {SRC.name} (mark {mark.width}x{mark.height})")


if __name__ == "__main__":
    main()
