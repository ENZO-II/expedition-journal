# Expedition Journal v3 asset QA

Generated with built-in image_gen in exactly three distinct requests, one per image, concurrently. No variants or retries. Outputs copied byte-for-byte from generated_images; no image processing, cropping, alpha cleanup, or slicing.

## Files

| File | Pixels | Bytes | Mode |
| --- | --- | ---: | --- |
| architecture-niche-v3.png | 1086 × 1448 | 2,112,079 | RGBA |
| atlas-frame-v3.png | 1448 × 1086 | 1,849,043 | RGBA |
| journal-leaf-v3.png | 1086 × 1448 | 3,338,005 | RGBA |

Final illustrations are in `dist/assets/`; exact prompts are in `docs/illumination-v3-prompts.md`.

## Visual inspection

All three form a coherent set: applied gold along Gothic architectural structure, lapis blue fields, vermilion, emerald green, fine ink and tempera-like handwork. Complete compositions, no strips or sliced corners, no text, no game asset reproduction. The aedicule has connected cusped canopy, columns, two lateral blue empty tracery niches, a base platform, a lower-left scribe and lower-right human-headed grotesque. The atlas surround has the requested scholar, dragon, birds and foliage. The folio has a clean light ivory central writing area and small winged rabbit creature.

The generated apertures are smaller than requested. This needs layout adaptation; do not assume the prompt coordinates were obeyed.

## Actual alpha and placement

- Architecture: alpha range 0–255; 52.456% pixels exactly alpha 0. Most painted pixels alpha 252–253. The center sample is alpha 0; interior x30–70%, y40–75% has alpha 0–1 only. Largest rectangle with alpha ≤5 is x26.98–72.74%, y31.01–75.90%. Use about x30–70%, y40–75% as the conservative interactive object area. The central opening follows the arch at the top and is narrower than requested x18–82%.
- Atlas: alpha range 0–255; 57.624% pixels exactly alpha 0. Most painted pixels alpha 251–253. Interior x30–70%, y40–75% is alpha 0–4 only. Largest rectangle with alpha ≤5 is x16.30–86.46%, y20.90–74.95%. A bottom-center gold pinnacle rises into the broader lower aperture; scholar and corner foliage also occupy some lower-left space. Use this safe rectangle if the map must never sit behind ornaments. If a larger map sits beneath the whole frame, keep controls away from the decorative margins and bottom-center pinnacle.
- Journal: alpha range 0–255; only 0.04% of pixels exactly alpha 0 because the vellum fills nearly the whole canvas. Vellum is near opaque rather than completely opaque: writing region x20–80%, y26–82% has alpha 247–252, mean 249.713. This region is visually blank light ivory without writing or lines. Place actual text in that region over a light ivory backing if full visual opacity is wanted. The top architectural arc extends below requested y15%, so text must begin about y26%.

Transparency is real RGBA, not a painted checkerboard. However, there are isolated barely visible alpha 1–4 pixels in transparent holes and artwork is mostly slightly translucent; do not describe these as mathematically perfect zero-alpha apertures. No postprocessing was performed.

The generated originals are preserved unchanged as the final PNG files. Exact final prompts are recorded in `illumination-v3-prompts.md`.
