# Fix: QR code missing on printed stickers

## What the screenshot shows
The print preview comes from the live site (qrmyassets.siplproducts.com). The sticker shows the asset number and text, but there is no QR code and no empty space where it should be. That means the QR picture never loaded before the print window opened.

The live site is still running the older sticker code, which loaded the QR as a picture. The newer code that draws the QR straight onto the sticker exists only in the editor preview so far. It hasn't been published yet, and it hasn't been copied to your Quality or Production servers.

## New screenshot
With "Fit to printable area" turned on, the QR does print, but it is tiny and sits in the corner of a large USER page. With the other settings it disappears. So the QR is being created, and the problem is that its size is worked out from a calculation the printer driver doesn't follow. Fixing the QR to an exact size in millimetres (step 1) solves this.

## Steps
1. **Make the QR impossible to miss**
   - Keep drawing the QR as solid black squares inside the sticker itself, so nothing has to load first.
   - Give the QR a fixed size in millimetres (for example 22 mm on a 50x30 sticker) instead of a calculated size. Some label printer drivers drop drawings whose size they can't work out.
   - Before the print window opens, check that the QR is really on the sticker. If it isn't, show "QR could not be drawn, use Download PDF" instead of printing a sticker without a QR.
2. **Fix the page direction**
   - Size the sticker page so Chrome picks the right direction (Portrait or Landscape) for the sticker. Then no part of the sticker gets cut off.
3. **Check it before you get it back**
   - Add a small automatic test that builds a sticker and confirms the QR is present, at the expected size, and points to the correct public address.
   - Open the sticker print page in a test browser and take a screenshot to confirm the QR shows next to the text.
4. **Get it to your live sites**
   - Publish button in the editor: updates qrmyassets.siplproducts.com. I won't publish on my own.
   - Quality (QR_QTY) and Production (QR_PRD) servers: rebuild with the new code and restart. Until then they keep the old behaviour.

## Printer settings (TVSE DT 46) to use once
- Paper size: your sticker size. Margins: None. Scale: 100%.
- Printer preferences: Media type "Label with gaps", then press Calibrate once.

## Technical details
- File: src/lib/asset-labels.ts (buildLabelsPrintDocument, labelQrSvg, printLabelsInFrame).
- Add explicit width/height attributes in mm on the inline svg. Remove the calc() based size, and compute the QR size in mm from labelSizes.
- In printLabelsInFrame, after load, assert that every .label has an svg with non-zero getBoundingClientRect. Otherwise reject with a clear message.
- Put the long side of the sticker first in @page size so orientation matches.
- Add a vitest next to the existing tests: the generated HTML has one svg per asset, the svg size matches the label size, and the encoded URL uses ASSET_PUBLIC_ORIGIN.
- Downloaded PDFs and other flows stay as they are.
