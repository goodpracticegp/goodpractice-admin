import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { logAudit } from "@/lib/audit";
import { todaySydney } from "@/lib/au";

export type SupplyItem = Tables<"medical_supply_items">;
export type StockMovement = Tables<"stock_movements">;
export type Purchase = Tables<"purchases">;
export type ReorderNotification = Tables<"reorder_notifications">;

export async function fetchItems(): Promise<SupplyItem[]> {
  const { data, error } = await supabase
    .from("medical_supply_items")
    .select("*")
    .order("item_code", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchItem(id: string): Promise<SupplyItem> {
  const { data, error } = await supabase
    .from("medical_supply_items")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("This supply item could not be found.");
  return data;
}

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Your session has expired. Please sign in again.");
  return data.user.id;
}

export async function recordPurchase(input: {
  item: SupplyItem;
  quantity: number;
  unitPrice: number;
  supplierName: string;
  supplierEmail: string;
  purchaseDate: string;
}) {
  const userId = await currentUserId();
  const newStock = input.item.available_stock + input.quantity;

  const { error: updateError } = await supabase
    .from("medical_supply_items")
    .update({
      available_stock: newStock,
      purchase_price_aud: input.unitPrice,
      supplier_name: input.supplierName,
      supplier_email: input.supplierEmail,
      last_purchased_date: input.purchaseDate,
    })
    .eq("id", input.item.id);
  if (updateError) throw new Error(updateError.message);

  const { error: purchaseError } = await supabase.from("purchases").insert({
    item_id: input.item.id,
    quantity: input.quantity,
    unit_price_aud: input.unitPrice,
    supplier_name: input.supplierName,
    supplier_email: input.supplierEmail,
    purchase_date: input.purchaseDate,
    recorded_by: userId,
  });
  if (purchaseError) throw new Error(purchaseError.message);

  const { error: movementError } = await supabase.from("stock_movements").insert({
    item_id: input.item.id,
    movement_type: "Purchase Received",
    quantity_change: input.quantity,
    stock_after: newStock,
    notes: `Purchase received from ${input.supplierName} at ${input.unitPrice.toFixed(2)} AUD per unit`,
    performed_by: userId,
  });
  if (movementError) throw new Error(movementError.message);

  await logAudit("Purchase", "medical_supply_items", input.item.id, {
    item_code: input.item.item_code,
    quantity: input.quantity,
    unit_price_aud: input.unitPrice,
    stock_after: newStock,
  });

  return newStock;
}

export async function adjustStock(input: {
  item: SupplyItem;
  change: number;
  reason: string;
}) {
  const userId = await currentUserId();
  const newStock = Math.max(0, input.item.available_stock + input.change);

  const { error: updateError } = await supabase
    .from("medical_supply_items")
    .update({ available_stock: newStock })
    .eq("id", input.item.id);
  if (updateError) throw new Error(updateError.message);

  const { error: movementError } = await supabase.from("stock_movements").insert({
    item_id: input.item.id,
    movement_type: input.change < 0 ? "Usage" : "Stock Adjustment",
    quantity_change: input.change,
    stock_after: newStock,
    notes: input.reason,
    performed_by: userId,
  });
  if (movementError) throw new Error(movementError.message);

  await logAudit("Stock Adjustment", "medical_supply_items", input.item.id, {
    item_code: input.item.item_code,
    quantity_change: input.change,
    stock_after: newStock,
    reason: input.reason,
  });

  return newStock;
}

export async function deleteItem(item: SupplyItem) {
  const { error } = await supabase.from("medical_supply_items").delete().eq("id", item.id);
  if (error) throw new Error(error.message);
  await logAudit("Delete", "medical_supply_items", item.id, {
    item_code: item.item_code,
    item_description: item.item_description,
  });
}

export function defaultPurchaseDate() {
  return todaySydney();
}
