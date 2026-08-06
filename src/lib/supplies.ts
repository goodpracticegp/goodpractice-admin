import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { todaySydney } from "@/lib/au";

export type SupplyItem = Tables<"medical_supply_items">;
export type StockMovement = Tables<"stock_movements">;
export type Purchase = Tables<"purchases">;
export type ReorderNotification = Tables<"reorder_notifications">;

/**
 * All stock changing operations go through database functions so that the item
 * update, the purchase or movement row, the recomputed status, the reorder
 * latch and the audit entry either all commit or none of them do.
 */

export async function fetchItems(): Promise<SupplyItem[]> {
  const { data, error } = await supabase
    .from("medical_supply_items")
    .select("*")
    .is("deleted_at", null)
    .order("item_code", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchArchivedItems(): Promise<SupplyItem[]> {
  const { data, error } = await supabase
    .from("medical_supply_items")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
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

export async function recordPurchase(input: {
  item: SupplyItem;
  quantity: number;
  unitPrice: number;
  supplierName: string;
  supplierEmail: string;
  purchaseDate: string;
}): Promise<number> {
  const { data, error } = await supabase.rpc("record_purchase", {
    _item_id: input.item.id,
    _quantity: input.quantity,
    _unit_price: input.unitPrice,
    _supplier_name: input.supplierName,
    _supplier_email: input.supplierEmail,
    _purchase_date: input.purchaseDate,
  });
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as SupplyItem | null;
  return row?.available_stock ?? input.item.available_stock + input.quantity;
}

export async function adjustStock(input: {
  item: SupplyItem;
  change: number;
  reason: string;
}): Promise<number> {
  const { data, error } = await supabase.rpc("adjust_stock", {
    _item_id: input.item.id,
    _change: input.change,
    _reason: input.reason,
  });
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as SupplyItem | null;
  return row?.available_stock ?? Math.max(0, input.item.available_stock + input.change);
}

/**
 * Archives the item (soft delete). Nothing is physically removed, so the
 * purchase, movement and notification history stays intact and auditable.
 */
export async function archiveItem(item: SupplyItem, reason?: string) {
  const trimmed = reason?.trim();
  const { error } = await supabase.rpc("soft_delete_item", {
    _item_id: item.id,
    ...(trimmed ? { _reason: trimmed } : {}),
  });
  if (error) throw new Error(error.message);
}

export async function restoreItem(item: SupplyItem) {
  const { error } = await supabase.rpc("restore_item", { _item_id: item.id });
  if (error) throw new Error(error.message);
}

/** Backwards compatible alias: deleting an item now archives it. */
export const deleteItem = archiveItem;

export function defaultPurchaseDate() {
  return todaySydney();
}
