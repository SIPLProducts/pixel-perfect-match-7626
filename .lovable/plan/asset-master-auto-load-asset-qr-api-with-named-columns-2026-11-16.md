# Asset Master: auto-load ASSET QR API with named columns

All changes stay inside the existing Asset Master screen file. No new files, no new imports from other files, no changes to SAP API Settings, the server, the database or other screens. Layout and styling stay the same.

## What changes
1. **Picks the ASSET QR API automatically.** When the screen opens, it selects the active endpoint saved in SAP API Settings whose name is "ASSET QR API" (any capitalisation) or whose path contains `/asset/qr/report`. If there is no match, it uses the first active API, as it does now. The dropdown still works for switching.
2. **Loads data when the screen opens.** The API is called once as soon as the screen opens and the endpoint is known, so no button press is needed. A loading message shows while SAP responds (this can take about a minute). The existing Fetch button stays as **Refresh**. Switching APIs in the dropdown loads the new one automatically.
3. **Uses the document's names as column headers.** The table header shows the description from the PDF, with the SAP key in small text under it. For example, "Main Asset Number" with "ANLN1" under it, and "Plant" with "WERKS" under it. The columns follow the order of the sample response:
   ANLN1 Main Asset Number, ANLN2 Asset Sub-number, ANLKL Asset Classification, TXT50 Asset Description, MENGE Asset Quantity, AKTIV Capitalization Date, BUCHWERT Closing Book Value, LIFNR Supplier Account Number, KOSTL Cost Center, WERKS Plant, KUMAFA Cumulative Special Depreciation, MEINS Base Unit of Measurement, STORT Asset Location, POSNR WBS Element, DAUER Useful Life, BUKRS Company Code, GSBER Business Area, KTANSW Balance Sheet Account – Acquisition and Production Costs, ZZACCQ Acquisition Value, ZZTRANS_OUT Transfer Out, ZZTRANS_IN Transfer In, ZZSCARP Scrap Value, KANSW Cumulative Acquisition Value, ZZSALES Sales Value, ZZDADDITION Depreciation Addition, ZZDTRANS_OUT Depreciation Transfer Out, WAERS Currency, ZZDTRANS_IN Depreciation Transfer In, ZZDSCARP Depreciation Scrap, ZZDSALES Depreciation Sales, AFASL Depreciation Key, AFABG Depreciation Start Date.
   Other keys listed in the document (KNAFA, KSAFA, KAAFA, KAUFA, NAFAP, SAFAP, AAFAP, AUFAP) also get their names if SAP returns them. Any key SAP returns that isn't in the document is still shown, with the raw key as its header, so no data is hidden.
4. Search and paging (100 rows per page) work as they do now. Search also matches the column names.

## Notes
- The document lists KTANSW twice and BUCHWERT twice, each time with a different meaning. One column can't have two names, so KTANSW will show "Balance Sheet Account – Acquisition and Production Costs" and BUCHWERT will show "Closing Book Value". Tell me if you want different names for these.
- The BTR1–BTR24 rows in the document aren't in the sample response, so they only appear if SAP returns them.
- The SAP login details in the PDF are not added to the code. The screen uses the credentials already saved in SAP API Settings.
- The call still goes through the existing middleware or direct connection, so the middleware and ngrok must be running. The live site gets this change only after publishing.

## Technical details
- File: `src/components/asset360/sap-api/asset-master.tsx` only.
- Add an inline `FIELD_LABELS` map and an `ORDER` array. Columns become the ordered known keys present in the data, followed by any unknown keys.
- Default endpoint selection: name or path match.
- Add a `useEffect` keyed on `chosen` that calls the existing `fetch` handler once per endpoint, with a ref guard to avoid duplicate calls in StrictMode or on re-render.
