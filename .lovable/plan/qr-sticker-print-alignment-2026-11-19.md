# QR sticker print alignment

## Problem
The print layout is an A4 sheet (10 mm margin, grid of labels). On the TVSE DT 46 label printer the A4 page is cropped onto one sticker, so the QR and text shift to the top-left and the bottom of the QR is cut off.

## Fix (print only, PDF A4 sheets unchanged)
- Print page size = selected sticker size (e.g. `@page { size: 70mm 40mm; margin: 0 }`), one sticker per page.
- Each sticker: 5px padding on all sides, no outer border (it caused the cut-off box).
- QR + details block centered horizontally and vertically in the sticker; QR size = sticker height minus padding.
- Text stays left-aligned beside the QR, auto-truncated so it never overflows.

## Technical details
- Edit only `buildLabelsPrintDocument` in `src/lib/asset-labels.ts`; QR tokens, print ledger counting and PDF/PNG exports untouched.
- Update `asset-labels.test.ts` to assert page size equals the sticker size and padding is 5px.

## Printer tip
In the print dialog choose the paper size matching the sticker (e.g. 70 × 40 mm), scale 100%, margins None.
