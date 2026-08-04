import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ItemForm, type ItemFormValues } from "@/components/ItemForm";
import { supabase } from "@/integrations/supabase/client";
import { fetchItem, fetchItems, type SupplyItem } from "@/lib/supplies";
import { logAudit } from "@/lib/audit";

export const Route = createFileRoute("/_authenticated/supplies/$itemId/edit")({
  head: () => ({
    meta: [
      { title: "Edit Supply Item | Good Practice (GP) Surgery" },
      {
        name: "description",
        content:
          "Update details, stock levels and reorder settings for a Good Practice GP Surgery medical supply item.",
      },
      { property: "og:title", content: "Edit Supply Item | Good Practice (GP) Surgery" },
      {
        property: "og:description",
        content: "Update stock levels and reorder settings for a GP Surgery supply item.",
      },
    ],
  }),
  component: EditItemPage,
});

function EditItemPage() {
  const { itemId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const itemQuery = useQuery({ queryKey: ["item", itemId], queryFn: () => fetchItem(itemId) });
  const itemsQuery = useQuery({ queryKey: ["items"], queryFn: fetchItems });

  const mutation = useMutation({
    mutationFn: async (values: ItemFormValues) => {
      const item = itemQuery.data as SupplyItem;
      const newStock = Number(values.available_stock);
      const { data: auth } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("medical_supply_items")
        .update({
          item_code: values.item_code,
          item_description: values.item_description.trim(),
          category: values.category,
          supplier_name: values.supplier_name.trim(),
          supplier_email: values.supplier_email.trim(),
          purchase_price_aud: Number(values.purchase_price_aud),
          available_stock: newStock,
          reorder_level: Number(values.reorder_level),
          reorder_quantity: Number(values.reorder_quantity),
          last_purchased_date: values.last_purchased_date || null,
          expiry_date: values.expiry_date || null,
          status: values.status,
        })
        .eq("id", itemId);
      if (error) throw new Error(error.message);

      if (newStock !== item.available_stock) {
        await supabase.from("stock_movements").insert({
          item_id: itemId,
          movement_type: "Stock Adjustment",
          quantity_change: newStock - item.available_stock,
          stock_after: newStock,
          notes: "Stock level changed when the item record was edited",
          performed_by: auth.user?.id ?? null,
        });
      }

      await logAudit("Edit", "medical_supply_items", itemId, {
        item_code: values.item_code,
        previous_stock: item.available_stock,
        new_stock: newStock,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["items"] });
      void queryClient.invalidateQueries({ queryKey: ["item", itemId] });
      void queryClient.invalidateQueries({ queryKey: ["item-history", itemId] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["reorder-count"] });
      void queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      toast.success("Supply item updated");
      void navigate({ to: "/supplies/$itemId", params: { itemId } });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (itemQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading supply item...</p>;
  }

  if (itemQuery.isError || !itemQuery.data) {
    return (
      <p className="text-sm text-alert">
        {(itemQuery.error as Error | null)?.message ?? "This supply item could not be found."}
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg text-navy">
            Edit {itemQuery.data.item_code} {itemQuery.data.item_description}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ItemForm
            item={itemQuery.data}
            existingCodes={(itemsQuery.data ?? []).map((i) => i.item_code)}
            submitting={mutation.isPending}
            onSubmit={(values) => mutation.mutate(values)}
            onCancel={() => void navigate({ to: "/supplies/$itemId", params: { itemId } })}
          />
        </CardContent>
      </Card>
    </div>
  );
}
