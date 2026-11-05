# Direct QR label printing — TVS LP 443 Gold via QZ Tray

Investigation and plan only. No code, deployment or workstation changes until this final plan is reviewed and approved.

## 0. Confirmed rules (from review)

1. **Resolution:** TVS-E and reseller listings say 300 DPI (12 dots/mm). The TVS LP 443 Gold might ship in more than one version, so the build hard-codes neither 203 nor 300. The value is read from the installed driver (QZ `printers.details`) and confirmed against the real printer's self-test or config page before sign-off.
2. **Honest status:** a Windows queue existing does not mean the printer is connected. If the driver reports no physical status, the badge says exactly "Queue found — status not reported by driver". It never says Ready.
3. **Unknown status:** printing stays available, with a visible warning, only when the queue exists. The badge is amber, not green, and the message never says the hardware is confirmed ready. Offline, error or paper-out, when reported, turns printing off.
4. **Signing:** the QZ private key lives only in server secrets (Lovable Cloud and the HBL server's PM2 environment). It is never bundled, served, logged or returned. The signing server function needs a valid session and an active workspace membership whose role already allows QR label output. Anyone else gets a refusal. It returns only the signature.
5. **Unchanged:** A4 PDF, PNG, browser print, QR generation and tokens, scanning, and the print-history ledger. Direct print only adds one more "print" entry through the existing ledger.
6. **No TSPL or other undocumented protocols.** Printing goes only through the Windows driver with a PDF, unless official TVS documentation establishes another supported method. Any other method would need a separate, reviewed assessment.
8. **Deployment details (checked):** in this project's code, the QR label origin is still `https://qrmyassets.siplproducts.com` (`src/lib/asset-labels.ts`, and the fallback in `src/lib/user-management.functions.ts`). The address `http://10.10.4.165:8085`, PM2 process `qrmyassets` (Nitro on 127.0.0.1:3005 behind Nginx 8085) and the `qr_q_*` backend are known only from server output your team shared in this chat. None of it is in this project, and none of it can be checked from here. Before deployment, client IT must confirm in writing the Asset360 Quality URL, the PM2 process name and its environment file, and the HTTPS plan. Nothing from the MIS application (ports, containers, Nginx, environment) is reused or touched. Secrets go only into the confirmed Asset360 process environment.
9. **QZ certificate and licence: deployment prerequisite.** Direct print is not enabled in any environment until all of these are true:
   - Client IT/security has approved, in writing, the QZ Tray licence or the self-signed certificate approach.
   - They have approved who generates and holds the key pair, and how it is stored and rotated.
   - They have approved installing QZ Tray and the certificate on named workstations.
   - They have approved the allowed site address.

   No test, demo or unapproved certificate is used. The private key is never committed, shared in chat, or placed on workstations. Until approval, the Direct print button stays hidden. Existing printing is unaffected.
7. **Label size is configurable.** The existing presets (50x30, 70x40, 100x60 mm) stay. The direct-print page size follows whichever size the user picks. No roll size is assumed. Driver stock size must match the chosen size.

## 1. What exists today (verified in code)

- **How the QR is made:** `labelQr()` in `src/lib/asset-labels.ts` makes a 600x600 PNG from the asset's existing QR token and the standard origin.
- **How labels are laid out:** `buildLabelsPdf()` uses jsPDF to make an **A4 PDF** with the labels in a grid (10 mm margin, 3 mm gap, thin border). Sizes: Compact 50x30, Standard 70x40, Large 100x60 mm. Each label has the QR on the left, then Asset ID (bold), organization, name, plant, company code and capitalization year.
- **How printing works:** `label-dialog.tsx` opens the PDF in a new tab and the browser print dialog appears. Downloads use the same PDF. Each print, PDF or PNG is recorded once per asset by `recordQrPrints` through `deliverTrackedLabels`. That record is the QR print count.
- **Nothing exists yet** for QZ Tray, printer detection or silent printing.

**Main finding:** labels are tiled on an A4 page. A roll printer like the LP 443 Gold needs **one label per page, sized to the label**. Sending the A4 PDF would print a 297 mm page of labels on the roll. The label itself (content, positions, fonts, QR size) can stay exactly the same. Only the page it sits on changes, from an A4 sheet to a single label-sized page.

## 2. Answers to the eight questions

1. **Format:** a PNG QR placed into a jsPDF vector PDF.
2. **Keeping the layout:** yes. Move the code that draws one label into a shared function, used unchanged by both the A4 sheet and a new single-label page (width x height mm, no tiling margin). The A4 output stays byte-for-byte the same. Tests will compare the drawing commands for both.
3. **Secure connection to QZ Tray:** use the official `qz-tray` npm package over the local secure WebSocket (wss://localhost:8181). QZ requires signed requests to avoid an "Allow" popup on every print:
   - Generate a company certificate and private key.
   - The certificate is public and served to the browser.
   - The **private key stays on the server only** (a secret), used by an authenticated server function that signs each QZ request. Only signed-in workspace members with print rights can get a signature.
   - Each workstation's QZ Tray trusts that certificate, through a QZ site licence or the `override.crt` method.
   - Without signing, QZ still works, but shows a confirmation popup every time ("untrusted").
4. **Listing printers:** `qz.printers.find()` and `qz.printers.details()`. Remember the chosen printer per workstation (in local storage, not the database). Pre-select a queue whose name or driver contains "LP 443" or "TVS", and let the user change it.
5. **Honest availability status:** a Windows queue being present does not mean the printer is switched on. Planned statuses:
   - "QZ Tray not running"
   - "Printer not found"
   - "Offline / error" (from `qz.printers.startListening` status events such as OFFLINE, PAPER_OUT, ERROR, where the driver reports them)
   - "Ready"
   - "Status unknown" when the driver reports nothing.

   We will **never show Ready based only on the queue existing.** Ready needs QZ to be connected, the queue to exist, and an online status event from the driver. Whether the TVS driver sends these events has to be confirmed on the real printer. If it does not, the badge will say "Queue found — status not reported by driver" and printing stays allowed, with an amber warning, never as Ready.
6. **No print dialog:** `qz.print(config, [{ type: "pixel", format: "pdf", flavor: "base64", data }])`, with page size set to the label size in mm and scaling turned off. The job goes straight to the Windows spooler.
7. **Driver or native commands:** use the **Windows driver with the PDF** (pixel printing). This needs no TSPL and no undocumented assumptions. Raw TSPL is out of scope until TVS documentation confirms the command set. That would be a separate assessment, as would WebUSB and Web Serial.
8. **Setup on each workstation:**
   - Install the TVS LP 443 Gold Windows driver.
   - In the driver, set the stock size to match the label, set media type (direct thermal or thermal transfer) and darkness, and run calibration.
   - Install QZ Tray (Java bundled) and set it to start with Windows.
   - Install the company certificate into QZ Tray.
   - Allow wss://localhost:8181. The browser must reach the app over HTTPS, or localhost or an allowed origin. **Note:** the HBL server runs on plain http://10.10.4.165:8085. QZ allows insecure-WebSocket fallback (ws://localhost:8182), but HTTPS on the server is recommended.

## 3. Screen behaviour (inside the existing QR label dialog)

- A "Direct print" area with a printer picker, a status badge (Ready / Offline / Not found / QZ not running / Unknown) and a Refresh button.
- **"Print to label printer"** is turned off unless the status allows printing. The existing Print (browser) and PDF/PNG buttons are unchanged.
- Clear error messages: QZ not installed or not running (with a download link), certificate rejected, printer offline, paper out, job failed (with the spooler message).
- Each successful direct print is recorded through the existing `recordQrPrints` as action "print", once per asset. Print counts and history stay accurate.

## 4. Technical details

**New dependency:** `qz-tray` (loaded only when the dialog opens, browser-only, never during server rendering).

**Files likely to change**
- `src/lib/asset-labels.ts`: move the single-label drawing into a shared function and add `buildSingleLabelPdf()`. The QR, text and A4 output stay the same.
- `src/lib/label-printer.ts` (new): QZ connect, list printers, status listener, print. Browser-only.
- `src/lib/qz-signing.functions.ts` (new): authenticated `createServerFn` that signs QZ requests with the server-only private key (using WebCrypto, which works on both the Worker and the Node runtime).
- `src/components/asset360/label-dialog.tsx`: add the Direct print area. Existing buttons stay as they are.
- `public/qz-cert.pem` or an environment variable for the public certificate.
- Tests: `asset-labels.test.ts` (identical drawing commands on A4 vs single label, correct page size) and `label-printer.test.ts` (status mapping with QZ mocked).

**Secrets:** `QZ_PRIVATE_KEY` (Lovable Cloud and the HBL server's PM2 environment), plus the public certificate.

**Not touched:** QR generation and tokens, scanning, asset records, database schema, RLS, tenant isolation, SAP, car labels.

## 5. Risks

- The TVS driver may not report status. If so, the badge says "unknown" rather than claiming Ready.
- If the driver's stock size differs from the label, labels get cut or misaligned. Setup per size is needed.
- The printed QR and small text must be checked at the confirmed resolution. Thin text below 5 pt may be faint.
- Over plain HTTP (10.10.4.165), browsers may block secure WebSocket on mixed content. Use the QZ insecure port or enable HTTPS.
- QZ Tray licensing: free with the confirmation popup. Silent trusted printing needs a company certificate (a QZ licence, or self-signed with `override.crt`).
- If the private key leaks, anyone could sign print jobs. Keep it server-only and rotatable.

## 6. Testing

**Can be checked without the printer**
- Unit tests: the A4 output is unchanged, single-label page sizes are right, status mapping works, printing is blocked when not Ready.
- With QZ Tray installed and a virtual printer (Microsoft Print to PDF): connect, list printers, signed requests with no popup, a silent job reaching the queue, error messages (QZ stopped, printer removed), and print count going up by 1 per asset.
- Signing function refuses signed-out users and non-members.

**Needs the actual TVS LP 443 Gold**
- Whether the driver reports online, offline or paper-out, and whether "Ready" is accurate when the printer is unplugged or powered off.
- Physical print quality and alignment for each label size, scan test of the printed QR on phones, darkness and calibration.
- Multi-label jobs: feeding and gap detection between labels.

## 7. Phases

1. Shared single-label layout and tests (A4 unchanged).
2. QZ connection, signing function and certificate, with a virtual printer.
3. Status badge and Direct print button in the dialog, with print tracking.
4. On-site check with the LP 443 Gold, then write the workstation setup guide.

## Open questions before building
- Label stock on the roll (which of 50x30, 70x40, 100x60, or another size) and the media type.
- Whether you will buy a QZ Tray licence or use a self-signed certificate.
- Whether the HBL server can be moved to HTTPS.
