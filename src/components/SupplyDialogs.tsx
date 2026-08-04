import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { adjustStock, defaultPurchaseDate, recordPurchase, type SupplyItem } from "@/lib/supplies";
import { formatAud } from "@/lib/au";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["items"] });
    void queryClient.invalidateQueries({ queryKey: ["item"] });
    void queryClient.invalidateQueries({ queryKey: ["recent-purchases"] });
    void queryClient.invalidateQueries({ queryKey: ["recent-movements"] });
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    void queryClient.invalidateQueries({ queryKey: ["reorder-count"] });
    void queryClient.invalidateQueries({ queryKey: ["item-history"] });
    void queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
  };
}

export function RecordPurchaseDialog({
  item,
  open,
  onOpenChange,
}: {
  item: SupplyItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const invalidate = useInvalidate();
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(defaultPurchaseDate());
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (item && open) {
      setQuantity("1");
      setUnitPrice(String(item.purchase_price_aud));
      setSupplierName(item.supplier_name);
      setSupplierEmail(item.supplier_email);
      setPurchaseDate(defaultPurchaseDate());
      setErrors({});
    }
  }, [item, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!item) throw new Error("No item selected.");
      return recordPurchase({
        item,
        quantity: Number(quantity),
        unitPrice: Number(unitPrice),
        supplierName: supplierName.trim(),
        supplierEmail: supplierEmail.trim(),
        purchaseDate,
      });
    },
    onSuccess: (newStock) => {
      invalidate();
      toast.success(`Purchase recorded. Available stock is now ${newStock}.`);
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const found: Record<string, string> = {};
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) found["quantity"] = "Enter a whole quantity of one or more.";
    const price = Number(unitPrice);
    if (Number.isNaN(price) || price <= 0) found["unitPrice"] = "Enter a unit price greater than $0.00.";
    if (!supplierName.trim()) found["supplierName"] = "Supplier name is required.";
    if (!EMAIL_RE.test(supplierEmail.trim())) found["supplierEmail"] = "Enter a valid email address.";
    if (!purchaseDate) found["purchaseDate"] = "Select the purchase date.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    mutation.mutate();
  };

  const total = Number(quantity) * Number(unitPrice);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record purchase</DialogTitle>
          <DialogDescription>
            {item ? `${item.item_code} ${item.item_description}` : ""}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="purchase-quantity">Quantity received</Label>
              <Input
                id="purchase-quantity"
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              {errors["quantity"] && <p className="text-xs text-alert">{errors["quantity"]}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase-price">Unit price (AUD)</Label>
              <Input
                id="purchase-price"
                type="number"
                min="0"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
              />
              {errors["unitPrice"] && <p className="text-xs text-alert">{errors["unitPrice"]}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase-supplier">Supplier name</Label>
              <Input
                id="purchase-supplier"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
              />
              {errors["supplierName"] && <p className="text-xs text-alert">{errors["supplierName"]}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase-email">Supplier email</Label>
              <Input
                id="purchase-email"
                type="email"
                value={supplierEmail}
                onChange={(e) => setSupplierEmail(e.target.value)}
              />
              {errors["supplierEmail"] && <p className="text-xs text-alert">{errors["supplierEmail"]}</p>}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="purchase-date">Purchase date</Label>
              <Input
                id="purchase-date"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
              {errors["purchaseDate"] && <p className="text-xs text-alert">{errors["purchaseDate"]}</p>}
            </div>
          </div>

          <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            Order total: <span className="font-semibold text-navy">{formatAud(total || 0)}</span>
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              Save purchase
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdjustStockDialog({
  item,
  open,
  onOpenChange,
}: {
  item: SupplyItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const invalidate = useInvalidate();
  const [change, setChange] = useState("-1");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setChange("-1");
      setReason("");
      setErrors({});
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!item) throw new Error("No item selected.");
      return adjustStock({ item, change: Number(change), reason: reason.trim() });
    },
    onSuccess: (newStock) => {
      invalidate();
      toast.success(`Stock adjusted. Available stock is now ${newStock}.`);
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const found: Record<string, string> = {};
    const value = Number(change);
    if (!Number.isInteger(value) || value === 0)
      found["change"] = "Enter a whole number that is not zero, for example -5 or 10.";
    if (!reason.trim()) found["reason"] = "A reason is required for every stock adjustment.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>
            {item
              ? `${item.item_code} ${item.item_description} currently has ${item.available_stock} units.`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adjust-change">Quantity change (use a minus sign for usage)</Label>
            <Input
              id="adjust-change"
              type="number"
              step="1"
              value={change}
              onChange={(e) => setChange(e.target.value)}
            />
            {errors["change"] && <p className="text-xs text-alert">{errors["change"]}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="adjust-reason">Reason</Label>
            <Textarea
              id="adjust-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Used during Tuesday immunisation clinic"
            />
            {errors["reason"] && <p className="text-xs text-alert">{errors["reason"]}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              Record adjustment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteItemDialog({
  item,
  open,
  onOpenChange,
  onConfirm,
  pending,
}: {
  item: SupplyItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  pending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-alert">Delete supply item</DialogTitle>
          <DialogDescription>
            {item
              ? `Delete ${item.item_code} ${item.item_description}? This also removes its stock movements, purchases and reorder notifications. This cannot be undone.`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={pending}>
            Delete item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
