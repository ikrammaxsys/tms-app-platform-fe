export type CsvColumn<T> = {
  header: string
  value: (row: T) => string | number | null | undefined
  cellStyle?: (row: T) => string | undefined
}

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return ""
  const str = String(value)
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return ""
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function buildCsv<T>(columns: CsvColumn<T>[], rows: T[]): string {
  const header = columns.map((column) => escapeCsvCell(column.header)).join(",")
  const body = rows
    .map((row) => columns.map((column) => escapeCsvCell(column.value(row))).join(","))
    .join("\n")
  return `${header}\n${body}`
}

function buildSpreadsheetHtml<T>(columns: CsvColumn<T>[], rows: T[]): string {
  const headerRow = columns
    .map((column) => `<th>${escapeHtml(column.header)}</th>`)
    .join("")
  const bodyRows = rows
    .map((row) => {
      const cells = columns
        .map((column) => {
          const value = column.value(row)
          const style = column.cellStyle?.(row)
          const styleAttr = style ? ` style="${style}"` : ""
          return `<td${styleAttr}>${escapeHtml(value)}</td>`
        })
        .join("")
      return `<tr>${cells}</tr>`
    })
    .join("")

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head>
<meta charset="utf-8">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Report</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>
  table { border-collapse: collapse; }
  th, td { border: 1px solid #d1d5db; padding: 4px 8px; white-space: nowrap; }
  th { background-color: #f8fafc; font-weight: 700; }
</style>
</head>
<body>
<table>
<thead><tr>${headerRow}</tr></thead>
<tbody>${bodyRows}</tbody>
</table>
</body>
</html>`
}

export function downloadCsv<T>(filename: string, columns: CsvColumn<T>[], rows: T[]): void {
  const csv = buildCsv(columns, rows)
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function downloadSpreadsheet<T>(
  filename: string,
  columns: CsvColumn<T>[],
  rows: T[],
): void {
  const html = buildSpreadsheetHtml(columns, rows)
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename.endsWith(".xls") ? filename : `${filename}.xls`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function hasStyledColumns<T>(columns: CsvColumn<T>[]): boolean {
  return columns.some((column) => Boolean(column.cellStyle))
}
