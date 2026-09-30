# Campaign journal historical assets

Downloaded unchanged on 2026-09-29. Historical source images are unchanged. The map is rotated at display time; the Bening folio is now retained only as research material.

## Simon Bening, Book of Hours, ca. 1530–35

- File: `met-bening-book-of-hours-original.jpg`
- Size: 4000 × 2250 pixels; 2,594,173 bytes.
- Collection: The Metropolitan Museum of Art, The Cloisters Collection, 2015; object 2015.706.
- Image: Folios 8v–9r, The Annunciation (Matins) / full-page border.
- Source: https://www.metmuseum.org/art/collection/search/684184
- Original download: https://images.metmuseum.org/CRDImages/cl/original/DP-634-007.jpg
- License: Public domain, CC0 through The Met Open Access. Object API reports `isPublicDomain: true`.
- Policy: https://www.metmuseum.org/hubs/open-access
- The 1200 × 675 `met-bening-book-of-hours.jpg` is the museum's unchanged smaller delivery, not a local edit.

Archived v2 placement (removed from the active UI in v3): the right folio provides gold floral borders, blue and red flowers, a bird, and a dragonfly. For CSS-only cropping, approximate source-image regions are: top border x=51.5–78%, y=14–18%; right border x=74–78%, y=15–82%; bottom border x=51.5–78%, y=74–83%. Preserve the original file. Avoid enlarging narrow strips beyond their useful source resolution. The physical book and black surround are visible in the full image.

## Anonymous, Portolan chart of the Mediterranean and connecting seas, ca. 1550

- File: `loc-mediterranean-portolan-1550.jpg`
- Size: 3975 × 8615 pixels; 3,502,729 bytes.
- Collection and suggested credit: Library of Congress, Geography and Map Division.
- Shelf ID: G5672.M4P5 1550 .P6; digital ID g5672m.ct003136.
- Primary catalog: https://www.loc.gov/item/2010588182/
- Download/source page: https://commons.wikimedia.org/wiki/File:Portolan_chart_of_the_Mediterranean_and_connecting_seas._LOC_2010588182.jpg
- Original download: https://upload.wikimedia.org/wikipedia/commons/f/ff/Portolan_chart_of_the_Mediterranean_and_connecting_seas._LOC_2010588182.jpg
- License: Public domain (PD-old-100-expired / faithful reproduction of public-domain art), Public Domain Mark 1.0 on Commons. LOC describes the collection as free to use and reuse unless an item Rights Advisory states otherwise; no restricting advisory appears on this item.
- License reference: https://creativecommons.org/publicdomain/mark/1.0/

Visual placement: parchment with red/black place names, compass roses, and rhumb lines. Original scan is vertical, with north to the right. A CSS rotation of -90deg yields a wide north-up map (about 2.17:1). The scan includes a pale mount; crop that at display time if desired. It works particularly well as an expedition-route background, with Sicily near its center. Preserve legibility by using a solid parchment backing for editable text over the map.

## Packaged filenames and original supporting illustrations

- Met original → `dist/assets/illumination.jpg`.
- LOC chart original → `dist/assets/portolan.jpg`.
- `dist/assets/inventory-pouch.png` and `dist/assets/inventory-coffer.png`: original AI-generated supporting illustrations, created 2026-09-29 using built-in ImageGen. These are not museum reproductions or authenticated period artifacts. Exact prompts are recorded in `generated-illustration-prompts.txt`. Both files are 1254 × 1254 with alpha transparency.


## Complete original illuminations · 2026-09-30

- `dist/assets/architecture-niche-v3.png`: 1086 × 1448, RGBA, 2,112,079 bytes. Complete Gothic architectural display niche with scribe and grotesque.
- `dist/assets/atlas-frame-v3.png`: 1448 × 1086, RGBA, 1,849,043 bytes. Complete map surround with scholar, dragon, birds and foliage.
- `dist/assets/journal-leaf-v3.png`: 1086 × 1448, RGBA, 3,338,005 bytes. Complete illuminated blank folio with winged rabbit marginal creature.

Generated for this project using built-in ImageGen, one request per image; originals preserved unchanged. Displayed whole at their original aspect ratios, not sliced. These are AI-generated illustrations, not public-domain museum artifacts or copied game assets. The project permits reuse of its generated supporting images under the repository MIT terms to the extent rights exist. Historical source materials retain the separate status stated above.

Exact prompts: [illumination-v3-prompts.md](illumination-v3-prompts.md). Measured aperture and transparency report: [illumination-v3-asset-qa.md](illumination-v3-asset-qa.md).


## Painted ground and divider · 2026-09-30

- `dist/assets/gilt-millefleur-ground-v4.png`: 1254 × 1254, RGB, 3,818,444 bytes. Gold-ground small-scale flowers, foliage and birds. Not a verified seamless tile; inspect repeat edges at larger sizes.
- `dist/assets/acanthus-divider-v4.png`: 724 × 2172, RGBA, 851,161 bytes. Complete vertical golden branch with colored acanthus, two birds and a small human-faced dragon head. Displayed whole, without slicing.

Both are original supporting illustrations generated using built-in ImageGen, one request each, no variants or retries; copied unchanged. They share the generated-asset reuse terms stated above and are not museum objects. [Exact prompts](illumination-v4-prompts.md) and [measured QA](illumination-v4-asset-qa.md).

Additional visual research: [Getty, Decorated Text Page, Ms. Ludwig IX 19, fol. 312](https://www.getty.edu/art/collection/object/107SG2), about 1525–1530. The reference image was viewed, not downloaded or included in the application.
