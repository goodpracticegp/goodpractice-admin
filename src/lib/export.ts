import * as XLSX from "xlsx";

export type ExportColumn<T> = { header: string; value: (row: T) => string | number };

function toRows<T>(rows: T[], columns: ExportColumn<T>[]) {
  return rows.map((row) => {
    const out: Record<string, string | number> = {};
    for (const col of columns) out[col.header] = col.value(row);
    return out;
  });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportCsv<T>(rows: T[], columns: ExportColumn<T>[], filename: string) {
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    columns.map((c) => escape(c.header)).join(","),
    ...rows.map((row) => columns.map((c) => escape(c.value(row))).join(",")),
  ];
  triggerDownload(new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" }), filename);
}

export function exportXlsx<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  filename: string,
  sheetName = "Export",
) {
  const worksheet = XLSX.utils.json_to_sheet(toRows(rows, columns), {
    header: columns.map((c) => c.header),
  });
  worksheet["!cols"] = columns.map((c) => ({ wch: Math.max(12, Math.min(46, c.header.length + 8)) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  triggerDownload(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename,
  );
}
