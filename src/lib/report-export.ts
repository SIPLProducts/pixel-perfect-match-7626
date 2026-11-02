import type { ReportTable } from "./report-builders";

export type ReportMeta = { organization: string; generatedAt: string; filters: string[] };

export function reportHeaderRows(meta: ReportMeta, title: string) {
  return [["HBL Asset360 — " + title], ["Organization", meta.organization], ["Generated", meta.generatedAt], ["Applied filters", meta.filters.join(" | ") || "None"]];
}

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export function exportReportCsv(table: ReportTable, meta: ReportMeta, filename: string) {
  const lines = [...reportHeaderRows(meta, table.title), [], table.headings, ...table.rows];
  save(new Blob([`\uFEFF${lines.map((r) => r.map(csvCell).join(",")).join("\n")}`], { type: "text/csv;charset=utf-8" }), `${filename}.csv`);
}

export async function exportReportXlsx(tables: ReportTable[], meta: ReportMeta, filename: string) {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  for (const table of tables) {
    const sheet = workbook.addWorksheet(table.title.slice(0, 31).replace(/[\\/?*[\]:]/g, " "));
    reportHeaderRows(meta, table.title).forEach((row, i) => { const r = sheet.addRow(row); if (i === 0) r.font = { bold: true, size: 14 }; else r.getCell(1).font = { bold: true }; });
    sheet.addRow([]);
    const head = sheet.addRow(table.headings);
    head.font = { bold: true, color: { argb: "FFFFFFFF" } };
    head.eachCell((cell) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } }; });
    sheet.views = [{ state: "frozen", ySplit: head.number }];
    table.rows.forEach((row) => sheet.addRow(row.map((v) => v ?? "")));
    table.headings.forEach((h, i) => { const width = Math.max(h.length, ...table.rows.slice(0, 200).map((r) => String(r[i] ?? "").length)); sheet.getColumn(i + 1).width = Math.min(48, Math.max(10, width + 2)); });
  }
  const buffer = await workbook.xlsx.writeBuffer();
  save(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${filename}.xlsx`);
}
