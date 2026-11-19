# Bring back the earlier sticker printing

## What changes
Sticker printing goes back to the version from 18 Nov, before today's four print changes. That is the version that printed the QR code and text every time.

- QR codes are made the way they were before (a picture, not drawn shapes).
- The print page layout is the earlier sheet layout.
- Printing starts the same way it did before.
- Download PDF, Download PNG, the print count and the print history stay as they are.
- Nothing else changes: SAP sync, the dashboard, users and asset data are not touched.

## Please note
- The earlier version had the alignment problem on the TVSE sticker printer. That problem will come back. In the printer window, choose your sticker paper size, set margins to None, and set scale to 100% / Actual size.
- The change appears in the preview first. The live site and your own servers (Quality and Production) only get it when you publish or rebuild. Nothing will be published automatically.

## Technical details
- Restore `src/lib/asset-labels.ts` to its content at commit 090ade5 (data-URL PNG QR, A4 grid print document, original `printLabelsInFrame`).
- Delete `src/lib/asset-labels-print.test.ts`, which checks the SVG and millimetre behaviour that is being removed.
- Keep `label-dialog.tsx` unchanged. Its only change since then was `randomId()`, which is unrelated to printing.
- Run `src/lib/asset-labels.test.ts` to confirm the label URL rules still pass, and make one Chromium print-preview screenshot to confirm the QR shows.
