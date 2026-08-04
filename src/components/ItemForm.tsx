import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, STATUSES, nextItemCode, todaySydney } from "@/lib/au";
import type { SupplyItem } from "@/lib/supplies";

export type ItemFormValues = {
  item_code: string;
  item_description: string;
  category: string;
  supplier_name: string;
  supplier_email: string;
  purchase_price_aud: string;
  available_stock: string;
  reorder_level: string;
  reorder_quantity: string;
  last_purchased_date: string;
  expiry_date: string;
  status: string;
};

function toValues(item?: SupplyItem, existingCodes: string[] = []): ItemFormValues {
  if (!item) {
    return {
      item_code: nextItemCode(existingCodes),
      item_description: "",
      category: CATEGORIES[0],
      supplier_name: "",
      supplier_email: "",
      purchase_price_aud: "",
      available_stock: "0",
      reorder_level: "0",
      reorder_quantity: "0",
      last_purchased_date: todaySydney(),
      expiry_date: "",
      status: "In Stock",
    };
  }
  return {
    item_code: item.item_code,
    item_description: item.item_description,
    category: item.category,
    supplier_name: item.supplier_name,
    supplier_email: item.supplier_email,
    purchase_price_aud: String(item.purchase_price_aud),
    available_stock: String(item.available_stock),
    reorder_level: String(item.reorder_level),
    reorder_quantity: String(item.reorder_quantity),
    last_purchased_date: item.last_purchased_date ?? "",
    expiry_date: item.expiry_date ?? "",
    status: item.status,
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateItem(
  values: ItemFormValues,
  options: { isNew: boolean; takenCodes: string[] },
): Record<string, string> {
  const errors: Record<string, string> = {};
  const code = values.item_code.trim().toUpperCase();

  if (!code) errors["item_code"] = "Item code is required.";
  else if (!/^MS-\d{4,6}$/.test(code))
    errors["item_code"] = "Use the format MS-0001 with four to six digits.";
  else if (options.takenCodes.includes(code))
    errors["item_code"] = "This item code is already used by another item.";

  if (!values.item_description.trim()) errors["item_description"] = "Item description is required.";
  if (!values.category) errors["category"] = "Select a category.";
  if (!values.supplier_name.trim()) errors["supplier_name"] = "Supplier name is required.";

  if (!values.supplier_email.trim()) errors["supplier_email"] = "Supplier email is required.";
  else if (!EMAIL_RE.test(values.supplier_email.trim()))
    errors["supplier_email"] = "Enter a valid email address, for example orders@supplier.com.au";

  const price = Number(values.purchase_price_aud);
  if (!values.purchase_price_aud.trim() || Number.isNaN(price) || price <= 0)
    errors["purchase_price_aud"] = "Enter a purchase price greater than $0.00.";

  for (const field of ["available_stock", "reorder_level", "reorder_quantity"] as const) {
    const raw = values[field];
    const n = Number(raw);
    if (raw.trim() === "" || Number.isNaN(n) || !Number.isInteger(n) || n < 0) {
      errors[field] = "Enter a whole number of zero or more.";
    }
  }

  if (values.expiry_date) {
    if (options.isNew && values.expiry_date <= todaySydney())
      errors["expiry_date"] = "Expiry date must be in the future.";
  }

  if (!values.status) errors["status"] = "Select a status.";

  return errors;
}

export function ItemForm({
  item,
  existingCodes,
  submitting,
  onSubmit,
  onCancel,
}: {
  item?: SupplyItem;
  existingCodes: string[];
  submitting: boolean;
  onSubmit: (values: ItemFormValues) => void;
  onCancel: () => void;
}) {
  const isNew = !item;
  const [values, setValues] = useState<ItemFormValues>(() => toValues(item, existingCodes));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const takenCodes = existingCodes
    .map((c) => c.toUpperCase())
    .filter((c) => c !== item?.item_code.toUpperCase());

  const set = (key: keyof ItemFormValues) => (value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const found = validateItem(values, { isNew, takenCodes });
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onSubmit({ ...values, item_code: values.item_code.trim().toUpperCase() });
  };

  const field = (key: keyof ItemFormValues, label: string, extra?: React.ReactNode) => (
    <div className="space-y-2">
      <Label htmlFor={key}>{label}</Label>
      {extra}
      {errors[key] && (
        <p className="text-xs font-medium text-alert" role="alert">
          {errors[key]}
        </p>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        {field(
          "item_code",
          "Item code",
          <Input
            id="item_code"
            value={values.item_code}
            onChange={(e) => set("item_code")(e.target.value)}
            placeholder="MS-0001"
          />,
        )}
        {field(
          "category",
          "Category",
          <Select value={values.category} onValueChange={set("category")}>
            <SelectTrigger id="category">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>,
        )}
        <div className="sm:col-span-2">
          {field(
            "item_description",
            "Item description",
            <Input
              id="item_description"
              value={values.item_description}
              onChange={(e) => set("item_description")(e.target.value)}
              placeholder="Nitrile examination gloves, medium, box of 100"
            />,
          )}
        </div>
        {field(
          "supplier_name",
          "Supplier name",
          <Input
            id="supplier_name"
            value={values.supplier_name}
            onChange={(e) => set("supplier_name")(e.target.value)}
            placeholder="MedSupplies Australia"
          />,
        )}
        {field(
          "supplier_email",
          "Supplier email",
          <Input
            id="supplier_email"
            type="email"
            value={values.supplier_email}
            onChange={(e) => set("supplier_email")(e.target.value)}
            placeholder="orders@medsupplies.example.com.au"
          />,
        )}
        {field(
          "purchase_price_aud",
          "Purchase price (AUD)",
          <Input
            id="purchase_price_aud"
            type="number"
            step="0.01"
            min="0"
            value={values.purchase_price_aud}
            onChange={(e) => set("purchase_price_aud")(e.target.value)}
          />,
        )}
        {field(
          "available_stock",
          "Available stock",
          <Input
            id="available_stock"
            type="number"
            min="0"
            step="1"
            value={values.available_stock}
            onChange={(e) => set("available_stock")(e.target.value)}
          />,
        )}
        {field(
          "reorder_level",
          "Reorder level",
          <Input
            id="reorder_level"
            type="number"
            min="0"
            step="1"
            value={values.reorder_level}
            onChange={(e) => set("reorder_level")(e.target.value)}
          />,
        )}
        {field(
          "reorder_quantity",
          "Reorder quantity",
          <Input
            id="reorder_quantity"
            type="number"
            min="0"
            step="1"
            value={values.reorder_quantity}
            onChange={(e) => set("reorder_quantity")(e.target.value)}
          />,
        )}
        {field(
          "last_purchased_date",
          "Last purchased date",
          <Input
            id="last_purchased_date"
            type="date"
            value={values.last_purchased_date}
            onChange={(e) => set("last_purchased_date")(e.target.value)}
          />,
        )}
        {field(
          "expiry_date",
          "Expiry date (optional)",
          <Input
            id="expiry_date"
            type="date"
            value={values.expiry_date}
            onChange={(e) => set("expiry_date")(e.target.value)}
          />,
        )}
        {field(
          "status",
          "Status",
          <Select value={values.status} onValueChange={set("status")}>
            <SelectTrigger id="status">
              <SelectValue placeholder="Select a status" />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>,
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Status is recalculated automatically from the stock level and reorder level. Choose
        Discontinued to hold an item out of the automated reorder process.
      </p>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={submitting}>
          {isNew ? "Create supply item" : "Save changes"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
