# Fix sticker printing: QR missing and blank prints

## Cause found in the print code
1. The print window opens as soon as the hidden print page loads, without waiting for the QR pictures to finish loading. So sometimes the QR shows and sometimes it doesn't.
2. The hidden print page is removed 1 second after the print window opens. On Chrome/Edge the print window stays open while you choose settings, so the page behind it gets removed and the printer receives an empty page. This causes the blank stickers.

## Fix
- Draw the QR code directly as solid black squares (vector) inside the sticker, not as a picture. Nothing needs to load, so it always appears, prints sharp, and prints dark on thermal printers.
- Open the print window only after the sticker page and fonts are fully ready (wait for two screen refreshes).
- Keep the hidden print page until printing has actually finished (using the browser's "print finished" signal), with a safety removal after 60 seconds.
- Keep the current alignment: page exactly the sticker size, 5px padding, QR and text centered, portrait.
- Download PDF and PNG stay unchanged.

## Your printer settings (one time)
In the print window: paper size = your sticker size (e.g. 50 x 30 mm), Margins = None, Scale = 100%. In the TVSE printer preferences, set media to "Label with gaps" and run calibration.

## Technical details
- `src/lib/asset-labels.ts`: add `labelQrSvg()` using `QRCode.toString(url, { type: "svg", margin: 2, errorCorrectionLevel: "M", color: { dark: "#000", light: "#fff" } })`, embed inline SVG in `buildLabelsPrintDocument` with `shape-rendering: crispEdges`.
- `printLabelsInFrame`: on load, await `document.fonts.ready`, decode any images, double `requestAnimationFrame`, then `print()`; remove the frame on `afterprint` (fallback 60 s), not 1 s.
- Add a small test that the print document contains an `<svg>` QR for each asset and no data-URL images.
