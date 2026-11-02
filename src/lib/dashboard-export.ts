export type DashboardReport = {
  organization: string;
  generatedAt: string;
  filters: string[];
  metrics: Array<[string, string]>;
  ageProfile: Array<[string, number]>;
  statusProfile: Array<[string, number]>;
  attention: Array<[string, number]>;
  assets: Array<[string, string, string, string, string, string, string, string, string, string]>;
};

const csvCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
const csvRows = (rows: Array<Array<string | number>>) => rows.map((row) => row.map(csvCell).join(",")).join("\n");
const saveBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export function exportDashboardCsv(report: DashboardReport) {
  const content = [
    csvRows([["HBL Asset360 Dashboard Report"], ["Organization", report.organization], ["Generated", report.generatedAt], ["Applied filters", report.filters.join(" | ")]]),
    csvRows([["Dashboard figures"], ["Metric", "Value"], ...report.metrics]),
    csvRows([["Equipment life profile"], ["Age band", "Assets"], ...report.ageProfile]),
    csvRows([["Current status"], ["Status", "Assets"], ...report.statusProfile]),
    csvRows([["Needs attention"], ["Item", "Assets"], ...report.attention]),
    csvRows([["Filtered asset list"], ["Asset ID", "Name", "Category", "Location", "Custodian", "Installed", "Age", "Status", "Purchase cost", "Current value"], ...report.assets]),
  ].join("\n\n");
  saveBlob(new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8" }), "HBL-Asset360-Dashboard.csv");
}

export async function exportDashboardPdf(report: DashboardReport) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(25, 85, 116);
  doc.rect(0, 0, pageWidth, 29, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.text("HBL Asset360", 14, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Filtered dashboard report", 14, 20);
  doc.text(`${report.organization}  |  ${report.generatedAt}`, pageWidth - 14, 13, { align: "right" });
  doc.text(`Filters: ${report.filters.join(" | ")}`, pageWidth - 14, 20, { align: "right", maxWidth: 155 });

  autoTable(doc, {
    startY: 35,
    head: [["Dashboard figure", "Value"]],
    body: report.metrics,
    margin: { left: 14, right: 194 },
    theme: "grid",
    styles: { font: "helvetica", fontSize: 8, cellPadding: 2.2 },
    headStyles: { fillColor: [25, 85, 116] },
  });
  autoTable(doc, {
    startY: 35,
    head: [["Equipment life", "Assets"]],
    body: report.ageProfile,
    margin: { left: 108, right: 100 },
    theme: "grid",
    styles: { font: "helvetica", fontSize: 8, cellPadding: 2.2 },
    headStyles: { fillColor: [48, 132, 114] },
  });
  autoTable(doc, {
    startY: 35,
    head: [["Status / attention", "Assets"]],
    body: [...report.statusProfile, ...report.attention],
    margin: { left: 202, right: 14 },
    theme: "grid",
    styles: { font: "helvetica", fontSize: 8, cellPadding: 2.2 },
    headStyles: { fillColor: [194, 112, 47] },
  });
  autoTable(doc, {
    startY: 91,
    head: [["Asset ID", "Asset", "Category", "Location", "Custodian", "Installed", "Age", "Status", "Purchase cost", "Current value"]],
    body: report.assets,
    margin: { left: 14, right: 14, bottom: 15 },
    theme: "striped",
    styles: { font: "helvetica", fontSize: 7, cellPadding: 1.8, overflow: "linebreak" },
    headStyles: { fillColor: [25, 85, 116], fontSize: 7 },
    columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 33 }, 2: { cellWidth: 27 }, 3: { cellWidth: 25 }, 4: { cellWidth: 28 }, 5: { cellWidth: 21 }, 6: { cellWidth: 18 }, 7: { cellWidth: 22 }, 8: { cellWidth: 25 }, 9: { cellWidth: 25 } },
    didDrawPage: ({ pageNumber }) => {
      doc.setTextColor(90, 100, 112);
      doc.setFontSize(7);
      doc.text(`HBL Asset360  |  Page ${pageNumber}`, pageWidth - 14, doc.internal.pageSize.getHeight() - 7, { align: "right" });
    },
  });
  doc.save("HBL-Asset360-Dashboard.pdf");
}
export async function exportDashboardXlsx(report: DashboardReport) {
  const { exportReportXlsx } = await import("./report-export");
  const meta = { organization: report.organization, generatedAt: report.generatedAt, filters: report.filters };
  await exportReportXlsx([
    { title: "Dashboard figures", headings: ["Metric", "Value"], rows: report.metrics },
    { title: "Equipment life profile", headings: ["Age band", "Assets"], rows: report.ageProfile },
    { title: "Current status", headings: ["Status", "Assets"], rows: report.statusProfile },
    { title: "Needs attention", headings: ["Item", "Count"], rows: report.attention },
    { title: "Filtered assets", headings: ["Asset ID", "Name", "Category", "Location", "Custodian", "Installed", "Age", "Status", "Purchase cost", "Current value"], rows: report.assets },
  ], meta, "HBL-Asset360-Dashboard");
}
