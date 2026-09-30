# Expedition Journal v4 asset QA

Exactly two distinct built-in image_gen requests, generated concurrently. One result per asset; no variants or retries. Images copied unchanged. No image editing, slicing, resizing, cleanup, or project/Sites changes.

## Deliverables

| Asset | Actual size | Bytes | Mode |
| --- | --- | ---: | --- |
| gilt-millefleur-ground-v4.png | 1254 × 1254 | 3,818,444 | RGB |
| acanthus-divider-v4.png | 724 × 2172 | 851,161 | RGBA |

Final assets are in `dist/assets/`.

## Visual inspection

Ground: full-bleed bright warm gold-leaf field with numerous small ink stems, blue/red/green flowers and leaves, several small painted birds, no dominant figure or framing. Flat illuminated-manuscript appearance, no text. Strong visual color match with the v3 architecture, atlas surround and folio. An approximate warm-gold color threshold covers 69.35% of pixels; this is a color measurement, not exact semantic segmentation, but supports the requested majority-gold appearance.

Divider: one continuous narrow golden stem with lapis, vermilion and green curled leaves, two small birds and one small human-faced dragon head. Both top tip and bottom foot are fully visible, no crop. Whole ornament occupies about 40.19% of the canvas width (alpha>20 visible bounds x=33.29–73.48%, y=1.57–97.74%), comfortably below the requested 65% maximum. Canvas ratio exactly 1:3. Display whole with contain; the transparent margins are part of the file.

## Transparency

Ground is RGB and completely opaque (equivalent alpha 255 throughout).

Divider alpha ranges from 0 to 255:
- 80.186% of all pixels are exactly zero alpha.
- 84.939% are alpha ≤5.
- Entire top and bottom outer 15-pixel margins are alpha 0.
- Outer left and right 15% strips have maximum alpha 1, so these are visually transparent but not every pixel is mathematically zero.
- Branch gaps are visibly transparent. Painted artwork is largely slightly translucent, as with the v3 assets.

## Tiling limitation

The ground was explicitly prompted for a seamless repeat, but exact opposite-edge matching was not achieved and seamless tiling must not be claimed as verified.

RGB mean absolute pixel difference at wrap boundaries:
- left/right seam: 34.40 (ordinary internal horizontal adjacency: 19.24)
- top/bottom seam: 27.06 (ordinary internal vertical adjacency: 18.86)

This suggests the vertical repeat seam may be more noticeable than internal texture. Small-scale use in narrow margins may still work visually; inspect the composed page. No corrective edit or retry was performed, per the two-request limit.

## Exact generation prompts

`illumination-v4-prompts.md` records both complete prompts and transparent_background settings.

