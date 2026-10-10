import { z } from "zod";
import { assetSchema } from "./asset-form-schema";

export const importAssetsSchema = z.object({ rows: z.array(assetSchema).min(1).max(500) });
export const importColumns = ["Asset name", "Category", "Serial number", "Manufacturer", "Model", "Plant", "Company code", "Location", "Department", "Custodian code", "Status", "Condition", "Acquisition value", "Book value", "Installation date", "Warranty end", "Remarks"];
type Master = { id: string; name: string };
export type ImportMasters = { categories: Master[]; locations: Master[]; departments: Master[]; employees: { id: string; employee_code: string }[]; assets: { serial_number: string | null }[] };
export type ImportRow = { row: number; name: string; category: string; serial: string; errors: string[]; data?: z.infer<typeof assetSchema> };
const normalize = (value: string) => value.trim().toLowerCase();

export function validateImportRows(rows: string[][], masters: ImportMasters): ImportRow[] {
  const headers = rows[0]?.map(normalize) ?? [];
  if (!headers.includes("asset name") || !headers.includes("category")) throw new Error("The first row must include Asset name and Category columns");
  const unknown = headers.filter(value => value && !importColumns.some(column => normalize(column) === value));
  if (unknown.length) throw new Error(`Unknown columns: ${unknown.join(", ")}. Use the Excel template.`);
  if (new Set(headers.filter(Boolean)).size !== headers.filter(Boolean).length) throw new Error("Duplicate column headings are not allowed");
  const nonempty = rows.slice(1).map((cells, index) => ({ cells, row: index + 2 })).filter(item => item.cells.some(cell => cell.trim()));
  if (!nonempty.length || nonempty.length > 500) throw new Error("Upload between 1 and 500 asset rows");
  const serials = new Set(masters.assets.map(asset => normalize(asset.serial_number ?? "")).filter(Boolean));
  return nonempty.map(({ cells, row }) => {
    const errors: string[] = [];
    const get = (label: string) => (cells[headers.indexOf(normalize(label))] ?? "").trim();
    const lookup = (label: string, records: Master[], required = false) => {
      const value = get(label); if (!value && !required) return undefined;
      const matches = records.filter(item => normalize(item.name) === normalize(value));
      if (matches.length !== 1) { errors.push(`${label}: select an existing, unambiguous name`); return undefined; }
      return matches[0]?.id;
    };
    const employee = get("Custodian code");
    const employeeId = employee ? masters.employees.find(item => normalize(item.employee_code) === normalize(employee))?.id : undefined;
    if (employee && !employeeId) errors.push("Custodian code: employee not found");
    const serial = get("Serial number");
    if (serial && serials.has(normalize(serial))) errors.push("Serial number already exists or is repeated in this file");
    if (serial) serials.add(normalize(serial));
    const parsed = assetSchema.safeParse({
      name: get("Asset name"), categoryId: lookup("Category", masters.categories, true),
      serialNumber: serial, manufacturer: get("Manufacturer"), model: get("Model"), plant: get("Plant"), companyCode: get("Company code"),
      locationId: lookup("Location", masters.locations), departmentId: lookup("Department", masters.departments), employeeId,
      status: normalize(get("Status") || "active").replaceAll(" ", "_"), condition: normalize(get("Condition") || "good"),
      purchaseValue: get("Acquisition value") ? Number(get("Acquisition value")) : undefined,
      currentValue: get("Book value") ? Number(get("Book value")) : undefined,
      installationDate: get("Installation date") || undefined, warrantyEnd: get("Warranty end") || undefined, remarks: get("Remarks"),
    });
    if (!parsed.success) errors.push(...parsed.error.issues.map(issue => `${String(issue.path[0])}: ${issue.message}`));
    const result: ImportRow = { row, name: get("Asset name"), category: get("Category"), serial, errors };
    if (parsed.success && !errors.length) result.data = parsed.data;
    return result;
  });
}

export async function readAssetWorkbook(file: File): Promise<string[][]> {
  if (!/\.xlsx$/i.test(file.name)) throw new Error("Choose an Excel .xlsx file");
  if (file.size > 20 * 1024 * 1024) throw new Error("The Excel file must be smaller than 20 MB");
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.getWorksheet("Assets") ?? workbook.worksheets[0];
  if (!sheet) throw new Error("This workbook has no asset sheet");
  if (sheet.rowCount > 1000 || sheet.columnCount > 50) throw new Error("Use the template with no more than 500 asset rows");
  const rows: string[][] = [];
  sheet.eachRow({ includeEmpty: true }, row => {
    const cells: string[] = [];
    for (let column = 1; column <= sheet.columnCount; column++) {
      const cell = row.getCell(column); const value = cell.value;
      if (value && typeof value === "object" && ("formula" in value || "sharedFormula" in value)) throw new Error("Formula cells are not accepted; paste values only");
      cells.push(value instanceof Date ? value.toISOString().slice(0, 10) : cell.text);
    }
    rows.push(cells);
  });
  return rows;
}

export async function downloadAssetTemplate(masters: ImportMasters) {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet("Assets");
  sheet.addRow(importColumns);
  sheet.columns = importColumns.map(header => ({ width: header.includes("date") ? 22 : 24 }));
  sheet.getRow(1).font = { name: "Arial", bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = "A1:Q1";
  const reference = workbook.addWorksheet("Reference");
  reference.addRow(["Category", "Location", "Department", "Custodian code"]);
  const length = Math.max(masters.categories.length, masters.locations.length, masters.departments.length, masters.employees.length);
  for (let i = 0; i < length; i++) reference.addRow([masters.categories[i]?.name ?? "", masters.locations[i]?.name ?? "", masters.departments[i]?.name ?? "", masters.employees[i]?.employee_code ?? ""]);
  reference.columns.forEach(column => { column.width = 30; });
  reference.getRow(1).font = { name: "Arial", bold: true };
  const notes = workbook.addWorksheet("Notes");
  ["Asset name and Category are required. Category, Location and Department must match the Reference sheet.", "Custodian code must match an existing employee code. Blank optional fields remain empty.", "Dates: YYYY-MM-DD or Excel date cells. Amounts: numbers in INR without currency symbols.", "Status: active, in_stock, assigned, under_maintenance, under_repair, missing, damaged, retired, disposed. Default: active.", "Condition: new, good, average, poor, damaged. Default: good.", "Maximum 500 assets per file, 20 MB. Paste values only; formulas are not accepted.", "New assets only. Existing asset IDs and QR labels are never overwritten. Duplicate serial numbers are rejected."].forEach(note => notes.addRow([note]));
  notes.getColumn(1).width = 120;
  notes.eachRow(row => { row.font = { name: "Arial", size: 11 }; row.alignment = { wrapText: true }; row.height = 32; });
  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([new Uint8Array(buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const link = document.createElement("a"); link.href = url; link.download = "Sharvi-Asset360-Import-Template.xlsx"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}