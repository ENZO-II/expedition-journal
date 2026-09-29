# Campaign journal historical assets

Downloaded unchanged on 2026-09-29. Historical source images are unchanged. UI display crops and rotates them without modifying the files.

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

Visual placement: the right folio provides gold floral borders, blue and red flowers, a bird, and a dragonfly. For CSS-only cropping, approximate source-image regions are: top border x=51.5–78%, y=14–18%; right border x=74–78%, y=15–82%; bottom border x=51.5–78%, y=74–83%. Preserve the original file. Avoid enlarging narrow strips beyond their useful source resolution. The physical book and black surround are visible in the full image.

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
