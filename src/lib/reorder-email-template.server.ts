type ReorderRow = {
  item_code: string;
  item_description: string;
  available_stock: number;
  reorder_level: number;
  reorder_quantity: number;
  supplier_name: string;
  supplier_email: string;
};

const NAVY = "#123A5C";
const TEAL = "#0E7C7B";
const RED = "#C62828";

export function buildReorderEmailHtml(row: ReorderRow): string {
  const line = (label: string, value: string | number) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e6ebf0;font-size:13px;color:#5a6b7b;width:190px;">${label}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e6ebf0;font-size:13px;color:#12212e;font-weight:600;">${value}</td>
    </tr>`;

  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f4f7fa;font-family:Segoe UI,Arial,sans-serif;">
  <table role="presentation" width="100%" style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e0e7ee;">
    <tr>
      <td style="background:${NAVY};padding:20px 24px;color:#ffffff;">
        <div style="font-size:18px;font-weight:700;">Good Practice (GP) Surgery <span style="color:${RED};">&#10084;</span></div>
        <div style="font-size:12px;opacity:0.85;margin-top:2px;">Quality Care. Close to Home.</div>
      </td>
    </tr>
    <tr>
      <td style="padding:24px;">
        <div style="display:inline-block;background:#fdecec;color:${RED};font-size:12px;font-weight:700;padding:5px 10px;border-radius:4px;">REORDER REQUIRED</div>
        <h1 style="font-size:19px;color:${NAVY};margin:16px 0 6px;">${row.item_code} ${row.item_description}</h1>
        <p style="font-size:14px;color:#4a5b6b;margin:0 0 18px;">
          Available stock for this item has reached its reorder level. Please raise a purchase order with the supplier below.
        </p>
        <table role="presentation" width="100%" style="border:1px solid #e6ebf0;border-radius:8px;border-collapse:separate;">
          ${line("Item Code", row.item_code)}
          ${line("Item Description", row.item_description)}
          ${line("Available Stock", row.available_stock)}
          ${line("Reorder Level", row.reorder_level)}
          ${line("Reorder Quantity", row.reorder_quantity)}
          ${line("Supplier Name", row.supplier_name)}
          ${line("Supplier Email", row.supplier_email)}
        </table>
        <p style="font-size:12px;color:#7b8a99;margin:18px 0 0;">
          Sent automatically by the Good Practice GP Surgery Administration System.
        </p>
      </td>
    </tr>
    <tr><td style="background:${TEAL};height:5px;"></td></tr>
  </table>
</body></html>`;
}

export function buildReorderEmailText(row: ReorderRow): string {
  return [
    "Good Practice (GP) Surgery - Quality Care. Close to Home.",
    "",
    "REORDER REQUIRED",
    `${row.item_code} ${row.item_description}`,
    "",
    "Available stock for this item has reached its reorder level.",
    "Please raise a purchase order with the supplier below.",
    "",
    `Item Code: ${row.item_code}`,
    `Item Description: ${row.item_description}`,
    `Available Stock: ${row.available_stock}`,
    `Reorder Level: ${row.reorder_level}`,
    `Reorder Quantity: ${row.reorder_quantity}`,
    `Supplier Name: ${row.supplier_name}`,
    `Supplier Email: ${row.supplier_email}`,
    "",
    "Sent automatically by the Good Practice GP Surgery Administration System.",
  ].join("\n");
}
