import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ItemForm, type ItemFormValues } from "@/components/ItemForm";
import { supabase } from "@/integrations/supabase/client";
import { fetchItems } from "@/lib/supplies";

export const Route = createFileRoute("/_authenticated/supplies/new")({
  head: () => ({
    meta: [
      { title: "Add Supply Item | Good Practice (GP) Surgery" },
      {
        name: "description",
        content:
          "Add a new medical supply item to the Good Practice GP Surgery procurement and inventory register.",
      },
      { property: "og:title", content: "Add Supply Item | Good Practice (GP) Surgery" },
      {
        property: "og:description",
        content: "Add a new medical supply item to the GP Surgery inventory register.",
      },
    ],
  }),
  component: NewItemPage,
});

function NewItemPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const itemsQuery = useQuery({ queryKey: ["items"], queryFn: fetchItems });

  const mutation = useMutation({
    mutationFn: async (values: ItemFormValues) => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("medical_supply_items")
        .insert({
          item_code: values.item_code,
          item_description: values.item_description.trim(),
          category: values.category,
          supplier_name: values.supplier_name.trim(),
          supplier_email: values.supplier_email.trim(),
          purchase_price_aud: Number(values.purchase_price_aud),
          available_stock: Number(values.available_stock),
          reorder_level: Number(values.reorder_level),
          reorder_quantity: Number(values.reorder_quantity),
          last_purchased_date: values.last_purchased_date || null,
          expiry_date: values.expiry_date || null,
          status: values.status,
        })
        .select("*")
        .single();
      if (error) throw new Error(error.message);

      if (data.available_stock > 0) {
        await supabase.from("stock_movements").insert({
          item_id: data.id,
          movement_type: "Initial Stock",
          quantity_change: data.available_stock,
          stock_after: data.available_stock,
          notes: "Opening stock recorded when the item was created",
          performed_by: auth.user?.id ?? null,
        });
      }

      return data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["items"] });
      void queryClient.invalidateQueries({ queryKey: ["reorder-count"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      toast.success(`${data.item_code} created`);
      void navigate({ to: "/supplies/$itemId", params: { itemId: data.id } });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="mx-auto max-w-4xl">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg text-navy">Add supply item</CardTitle>
        </CardHeader>
        <CardContent>
          <ItemForm
            existingCodes={(itemsQuery.data ?? []).map((i) => i.item_code)}
            submitting={mutation.isPending}
            onSubmit={(values) => mutation.mutate(values)}
            onCancel={() => void navigate({ to: "/supplies" })}
          />
        </CardContent>
      </Card>
    </div>
  );
}
