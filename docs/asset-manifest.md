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


## Real parchment leaf · 2026-10-01

- File: `dist/assets/walters-w183-126v.jpg`, 613,501 bytes. The downloaded JPEG is unchanged.
- Object: Book of Hours (Use of Rome), Walters Art Museum, **W.183, fol. 126v**. Bruges, ca. 1460–1470, circle of Willem Vrelant.
- Support: light-weight calf parchment with a satiny finish. The catalog explicitly identifies fols. 126–131 as blank leaves at the end of the medieval codex; this is not a modern replacement flyleaf.
- Catalog: https://www.thedigitalwalters.org/Data/WaltersManuscripts/html/W183/description.html
- Image: https://www.thedigitalwalters.org/Data/WaltersManuscripts/W183/data/W.183/sap/W183_000258_sap.jpg
- Current license: **CC0**, https://www.thedigitalwalters.org/01_ACCESS_WALTERS_MANUSCRIPTS.html
- Acquired and license checked: 2026-10-01. Credit: The Walters Art Museum, Baltimore.
- Display adaptation only: CSS crops the surrounding photographic support, scales the leaf to the page or scroll, and applies a warm translucent color plus luminosity blending. The original photograph's fibers and faint ruling remain visible. This is a designed reading surface, not a color-faithful facsimile. The scroll rollers and unfolding motion are interface graphics, not part of the historical photograph.
- Used on left journal leaves, both inventory leaves, and in-map scrolls. The map itself occupies the entire right leaf without a decorative UI frame; the chart's own historical outline remains part of its source image.


## Structural marginalia · 2026-10-01

- `dist/assets/rubric-junction-v7.png`: 2172 × 724, RGBA, true alpha transparency, original generated output unchanged. One complete horizontal red/gold painted rule joining a seated scribe, a winged dragon and ivy stems descending at both ends. It is aligned to the gold field's lower boundary and shown whole, without slicing. The figures cross the structural boundary of the reading page.
- Generated with built-in ImageGen in one call, using the user's self-made medieval character sheet as a visual style reference. The user's reference image is not included in this repository. The new asset is original supporting illustration, not a historical folio or game asset; generated-art reuse terms above apply. [Exact prompt](illumination-v7-prompt.md).
- `dist/assets/manuscript-diaper.svg` and `dist/assets/gold-stipple.svg`: code-native interface ornament, created for this project (MIT), not scanned gold leaf. Repeating lozenge whitework and a stippled gold-color field support responsive layout without stretching raster borders.
- The real page ground remains Walters W.183 fol.126v (CC0). Its separate source status is unchanged.


## Historiated navigation, varied page scenes and writing desk · 2026-10-01

- `dist/assets/initial-m-v8.png`: 1254 × 1254, RGBA, 2,849,154 bytes. Original generated output, unchanged.
- `dist/assets/initial-d-v8.png`: 1254 × 1254, RGBA, 2,879,520 bytes. Original generated output, unchanged.
- `dist/assets/initial-s-v8.png`: 1254 × 1254, RGBA, 2,812,547 bytes. Original generated output, unchanged.
- `dist/assets/catalog-junction-v8.png`: 2172 × 724, RGBA, 873,088 bytes. Original generated output, unchanged.
- `dist/assets/satchel-junction-v8.png`: 2172 × 724, RGBA, 834,585 bytes. Original generated output, unchanged.
- `dist/assets/vault-junction-v8.png`: 2172 × 724, RGBA, 1,071,445 bytes. Original generated output, unchanged.
- `dist/assets/scribes-desk-v8.png`: 1536 × 1024, RGB, 2,622,315 bytes. Original generated output, unchanged.

Created with built-in ImageGen; the six illuminations retain genuine alpha and are displayed whole. The naturalistic desk is a designed setting, not a photograph of an authenticated medieval object. Generated-asset reuse terms stated above apply. [Exact prompts and output provenance](illumination-v8-prompts.md); [measured image checks](illumination-v8-asset-qa.json).

`quatrefoil-v8.svg` and `penwork-frieze-v8.svg` are code-native responsive ornament under MIT, following the user’s reference emphasis on colored rails, small corner flowers and gold penwork. The supplied manuscript/game screenshots are visual references only and are not published. Existing W.183 parchment retains its separate CC0 source status.


## Painted materials and small actions · v9 · 2026-10-02

- `painted-desk-v9.png`: generated edit of the v8 desk, with the room removed and plank grain treated as a painted surface. Replaces the naturalistic v8 setting.
- `vellum-v9.png`: generated material adaptation of Walters W.183 fol. 126v, with warm ivory color, faint skin structure and scraping marks. Replaces the direct scan as the active ground of leaves, scrolls and dialogs. The CC0 original scan is still packaged unchanged for provenance; the v9 texture is not a historical scan.
- `wax-seal-v9.png`: generated vermilion wax seal, true alpha, used behind live editing/marking controls. No text is baked into the asset.
- `ink-flourish-v9.svg` and `compass-action-v9.svg`: native SVG ornament created for the application, MIT; not museum or game extracts.

All three raster outputs are preserved unchanged. Generated-asset reuse terms above apply. [Exact prompts and references](illumination-v9-prompts.md); [dimensions, hashes and transparency](illumination-v9-asset-qa.json). User-uploaded avatars are runtime data and are not part of the public asset collection.


## Ink-outlined painted rails · v10 · 2026-10-02

Five code-native SVG ornaments, created for this project under MIT:

- `lapis-edge-v10.svg`: a continuous blue horizontal band, bordered on both sides by gold and dark ink; slightly wavering paths, small penwork and varied gold highlights.
- `vermilion-edge-v10.svg`: the corresponding red vertical band.
- `gilt-rule-h-v10.svg` and `gilt-rule-v-v10.svg`: thin gold strips enclosed by dark ink for independently framing the title panels.
- `rail-junction-v10.svg`: a small square gold/blue floral corner joining the page rails.

These are responsive interface drawings inspired by the user-provided manuscript references, not crops of those images or historical artifacts. Tiles repeat at their intrinsic aspect ratio; they are not stretched across an entire page. No new raster generation or third-party download was used. The existing page illuminations remain whole.


## Plain upper corners and circular lower medallions · v11 · 2026-10-03

- `rail-cap-v11.svg`: retains the v10 gold square and blue field, removing only the flower and its centre. Used at the two upper corners of each framed leaf.
- `square-roundel-v11.svg`: a square gold/ink frame enclosing a continuous red and gold circular medallion on blue, with a small curling leaf and slightly uneven drawn contours. Used only at the two lower corners.

The circular corner structure and red/blue/gold palette were studied in the British Library's [Yates Thompson MS 10, Apocalypse, c. 1370–1390](https://searcharchives.bl.uk/catalog/040-002354398), specifically fol. 5v, whose lower miniature contains the four beasts in corner roundels. [Digital facsimile](https://iiif.bl.uk/uv/#?manifest=https://bl.digirati.io/iiif/ark:/81055/vdc_100165174828.0x000001). The interface's square housing and simplified curling leaf are an original adaptation for a small junction, not a copy of the manuscript's beasts or a historical seal. Both SVGs are code-native project artwork under MIT; the reference scan is not redistributed.

The masthead ornaments are unchanged. The map leaf remains unframed.


## v12 新增

`dist/assets/dip-pen.svg`：项目原创的代码绘制 SVG，木笔杆、金属笔尖与蘸水墨瓶，用作地图绘图入口和光标；采用项目 MIT 许可。无新增第三方图片，用户上传内容不属于源码素材，也不进入仓库。

## v13 · 手绘线与扩展小页

八份项目原创 SVG，采用 MIT；没有新增游戏图片或馆藏裁切：`lapis-edge-v13.svg`、`vermilion-edge-v13.svg`、`gilt-rule-h-v13.svg`、`gilt-rule-v-v13.svg` 延续已有彩带，改成平涂金色、勾墨短笔与轻微颜料粒纹；`ink-rule-v13.svg` 为金墨分隔线，`painted-panel-v13.svg` 为微有起伏的包金题栏，`pigment-grain-v13.svg` 为低对比颜料纹，`owlbear-book-v13.svg` 为枭熊安装清单与弹出页的彩饰书本图标。现有完整人物、藤枝、纸纹与书桌素材不改动。

`dist/vendor/obr-sdk.js` 为官方 `@owlbear-rodeo/sdk` 3.1.0 的打包版本，含其运行依赖。版本固定在 package-lock.json；SDK 及依赖许可全文在 `dist/vendor/NOTICE.txt`。打包工具 esbuild 为开发依赖，采用 MIT，不是运行时素材。运行时玩家图片与实际房间数据不属于公开素材。
