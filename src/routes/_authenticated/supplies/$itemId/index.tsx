import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, ShoppingCart, SlidersHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import {
  AdjustStockDialog,
  DeleteItemDialog,
  RecordPurchaseDialog,
} from "@/components/SupplyDialogs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { deleteItem, fetchItem } from "@/lib/supplies";
import { formatAud, formatDate, formatDateTime } from "@/lib/au";

export const Route = createFileRoute("/_authenticated/supplies/$itemId/")({
  head: () => ({
    meta: [
      { title: "Supply Item Detail | Good Practice (GP) Surgery" },
      {
        name: "description",
        content:
          "Full record for a medical supply item including stock movements, purchase history and reorder notifications.",
      },
      { property: "og:title", content: "Supply Item Detail | Good Practice (GP) Surgery" },
      {
        property: "og:description",
        content: "Stock movements, purchases and reorder notifications for a GP Surgery supply item.",
      },
    ],
  }),
  component: ItemDetailPage,
});

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-2.5 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function ItemDetailPage() {
  const { itemId } = Route.useParams();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const itemQuery = useQuery({ queryKey: ["item", itemId], queryFn: () => fetchItem(itemId) });

  const historyQuery = useQuery({
    queryKey: ["item-history", itemId],
    queryFn: async () => {
      const [movements, purchases, notifications] = await Promise.all([
        supabase
          .from("stock_movements")
          .select("*")
          .eq("item_id", itemId)
          .order("created_at", { ascending: false }),
        supabase
          .from("purchases")
          .select("*")
          .eq("item_id", itemId)
          .order("created_at", { ascending: false }),
        supabase
          .from("reorder_notifications")
          .select("*")
          .eq("item_id", itemId)
          .order("created_at", { ascending: false }),
      ]);
      return {
        movements: movements.data ?? [],
        purchases: purchases.data ?? [],
        notifications: notifications.data ?? [],
      };
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (reason: string) => {
      if (!itemQuery.data) throw new Error("Item not loaded.");
      return deleteItem(itemQuery.data, reason);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["items"] });
      void queryClient.invalidateQueries({ queryKey: ["reorder-count"] });
      toast.success("Supply item archived");
      void navigate({ to: "/supplies" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (itemQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading supply item...</p>;
  }

  if (itemQuery.isError || !itemQuery.data) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-sm text-alert">
          {(itemQuery.error as Error | null)?.message ?? "This supply item could not be found."}
        </p>
        <Link to="/supplies" className="mt-3 inline-block text-sm font-semibold text-teal">
          Back to medical supplies
        </Link>
      </div>
    );
  }

  const item = itemQuery.data;
  const history = historyQuery.data;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Link
        to="/supplies"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-teal hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to medical supplies
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-semibold text-teal">{item.item_code}</p>
          <h1 className="text-xl font-bold text-navy sm:text-2xl">{item.item_description}</h1>
          <div className="mt-2">
            <StatusBadge status={item.status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setPurchaseOpen(true)}>
            <ShoppingCart className="mr-1.5 h-4 w-4" />
            Record purchase
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void navigate({ to: "/supplies/$itemId/edit", params: { itemId } })}
          >
            <Pencil className="mr-1.5 h-4 w-4" />
            Edit
          </Button>
          {isAdmin && (
            <>
              <Button size="sm" variant="outline" onClick={() => setAdjustOpen(true)}>
                <SlidersHorizontal className="mr-1.5 h-4 w-4" />
                Adjust stock
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="mr-1.5 h-4 w-4" />
                Archive
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader className="pb-1">
            <CardTitle className="text-base">Item details</CardTitle>
          </CardHeader>
          <CardContent>
            <Row label="Category" value={item.category} />
            <Row label="Supplier" value={item.supplier_name} />
            <Row label="Supplier email" value={item.supplier_email} />
            <Row label="Purchase price" value={formatAud(item.purchase_price_aud)} />
            <Row label="Available stock" value={item.available_stock} />
            <Row label="Reorder level" value={item.reorder_level} />
            <Row label="Reorder quantity" value={item.reorder_quantity} />
            <Row label="Last purchased" value={formatDate(item.last_purchased_date) || "Never"} />
            <Row label="Expiry date" value={formatDate(item.expiry_date) || "Not applicable"} />
            <Row
              label="Reorder notice sent"
              value={item.reorder_notified ? "Yes, awaiting restock" : "No"}
            />
            <Row label="Created" value={formatDateTime(item.created_at)} />
            <Row label="Last updated" value={formatDateTime(item.updated_at)} />
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Stock movement history</CardTitle>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            {(history?.movements ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No stock movements recorded.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {history?.movements.map((row) => (
                  <li key={row.id} className="flex justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="font-medium">{row.movement_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(row.created_at)}
                        {row.notes ? ` to ${row.notes}` : ""}
                      </p>
                    </div>
                    <div className="whitespace-nowrap text-right">
                      <p
                        className={`font-semibold ${row.quantity_change < 0 ? "text-alert" : "text-ok"}`}
                      >
                        {row.quantity_change > 0 ? "+" : ""}
                        {row.quantity_change}
                      </p>
                      <p className="text-xs text-muted-foreground">stock {row.stock_after}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Purchase history</CardTitle>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            {(history?.purchases ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No purchases recorded.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {history?.purchases.map((row) => (
                  <li key={row.id} className="flex justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {row.quantity} units at {formatAud(row.unit_price_aud)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {row.supplier_name} on {formatDate(row.purchase_date)}
                      </p>
                    </div>
                    <span className="whitespace-nowrap font-semibold text-navy">
                      {formatAud(Number(row.unit_price_aud) * row.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Reorder notification history</CardTitle>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            {(history?.notifications ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No reorder notifications for this item.
              </p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {history?.notifications.map((row) => (
                  <li key={row.id} className="py-2.5">
                    <p className="font-medium">
                      Stock {row.available_stock} at reorder level {row.reorder_level}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sent to {row.sent_to} at {formatDateTime(row.sent_at)} with status{" "}
                      {row.email_status}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <RecordPurchaseDialog item={item} open={purchaseOpen} onOpenChange={setPurchaseOpen} />
      <AdjustStockDialog item={item} open={adjustOpen} onOpenChange={setAdjustOpen} />
      <DeleteItemDialog
        item={item}
        open={deleteOpen}
        pending={deleteMutation.isPending}
        onOpenChange={setDeleteOpen}
        onConfirm={(reason) => deleteMutation.mutate(reason)}
      />
    </div>
  );
}
