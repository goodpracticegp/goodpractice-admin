import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  CheckCircle2,
  PackageX,
  RefreshCcw,
  TrendingDown,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { fetchItems, type SupplyItem } from "@/lib/supplies";
import { CATEGORIES, daysUntil, formatAud, formatDate, formatDateTime } from "@/lib/au";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Procurement Dashboard | Good Practice (GP) Surgery" },
      {
        name: "description",
        content:
          "Live medical supply inventory overview for Good Practice GP Surgery: stock levels, reorder alerts, purchases and stock movements.",
      },
      { property: "og:title", content: "Procurement Dashboard | Good Practice (GP) Surgery" },
      {
        property: "og:description",
        content: "Live medical supply inventory overview for Good Practice GP Surgery.",
      },
    ],
  }),
  component: DashboardPage,
});

const CHART_COLOURS = [
  "var(--navy)",
  "var(--teal)",
  "var(--chart-3)",
  "var(--warn)",
  "var(--alert)",
  "var(--ok)",
  "var(--caution)",
  "var(--muted-foreground)",
];

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "navy",
}: {
  label: string;
  value: number;
  icon: typeof Boxes;
  tone?: "navy" | "teal" | "alert" | "warn" | "caution" | "ok";
}) {
  const tones: Record<string, string> = {
    navy: "bg-navy/10 text-navy",
    teal: "bg-teal/10 text-teal",
    alert: "bg-alert/10 text-alert",
    warn: "bg-warn/20 text-warn-foreground",
    caution: "bg-caution/30 text-caution-foreground",
    ok: "bg-ok/15 text-ok",
  };
  return (
    <Card className="shadow-card">
      <CardContent className="flex items-center gap-4 p-5">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-none text-foreground">{value}</p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const itemsQuery = useQuery({ queryKey: ["items"], queryFn: fetchItems });

  const purchasesQuery = useQuery({
    queryKey: ["recent-purchases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select("*, medical_supply_items(item_code, item_description)")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const movementsQuery = useQuery({
    queryKey: ["recent-movements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("*, medical_supply_items(item_code, item_description)")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reorder_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const items: SupplyItem[] = itemsQuery.data ?? [];
  const counts = {
    total: items.length,
    inStock: items.filter((i) => i.status === "In Stock").length,
    lowStock: items.filter((i) => i.status === "Low Stock").length,
    outOfStock: items.filter((i) => i.status === "Out of Stock").length,
    reorder: items.filter((i) => i.status === "Reorder Required").length,
    expiring: items.filter((i) => {
      const days = daysUntil(i.expiry_date);
      return days !== null && days >= 0 && days <= 90;
    }).length,
  };

  const reorderItems = items.filter(
    (i) => i.status === "Reorder Required" || i.status === "Out of Stock",
  );

  const categoryData = CATEGORIES.map((category) => ({
    category,
    short: category.length > 12 ? `${category.slice(0, 11)}.` : category,
    count: items.filter((i) => i.category === category).length,
  })).filter((row) => row.count > 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-navy sm:text-2xl">Procurement dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live view of the medical supply inventory. All times shown in Sydney time.
        </p>
      </div>

      {itemsQuery.isError && (
        <p className="rounded-md bg-alert-soft px-4 py-3 text-sm text-alert">
          {(itemsQuery.error as Error).message}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total supply items" value={counts.total} icon={Boxes} tone="navy" />
        <StatCard label="Items in stock" value={counts.inStock} icon={CheckCircle2} tone="ok" />
        <StatCard label="Low stock items" value={counts.lowStock} icon={TrendingDown} tone="caution" />
        <StatCard label="Out of stock items" value={counts.outOfStock} icon={PackageX} tone="alert" />
        <StatCard label="Reorder required" value={counts.reorder} icon={RefreshCcw} tone="warn" />
        <StatCard
          label="Expiring within 90 days"
          value={counts.expiring}
          icon={CalendarClock}
          tone="teal"
        />
      </div>

      <Card className="border-2 border-alert shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-alert">
            <AlertTriangle className="h-4.5 w-4.5" />
            Items requiring a reorder ({reorderItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reorderItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No items are currently below their reorder level.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {reorderItems.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <Link
                      to="/supplies/$itemId"
                      params={{ itemId: item.id }}
                      className="text-sm font-semibold text-navy hover:underline"
                    >
                      {item.item_code} {item.item_description}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      Stock {item.available_stock} of reorder level {item.reorder_level} to reorder{" "}
                      {item.reorder_quantity} units from {item.supplier_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={item.status} />
                    <Link
                      to="/supplies/$itemId"
                      params={{ itemId: item.id }}
                      className="text-xs font-semibold text-teal hover:underline"
                    >
                      View item
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Items by category</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 8, right: 8, bottom: 40, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="short"
                  angle={-32}
                  textAnchor="end"
                  interval={0}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "var(--border)" }}
                  formatter={(value: number) => [`${value} items`, "Count"]}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.category ?? ""}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {categoryData.map((entry, index) => (
                    <Cell key={entry.category} fill={CHART_COLOURS[index % CHART_COLOURS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent reorder notifications</CardTitle>
          </CardHeader>
          <CardContent>
            {(notificationsQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No reorder notifications recorded yet.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {(notificationsQuery.data ?? []).map((row) => (
                  <li key={row.id} className="py-2.5">
                    <p className="font-medium text-foreground">
                      {row.item_code} {row.item_description}
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent purchases</CardTitle>
          </CardHeader>
          <CardContent>
            {(purchasesQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No purchases recorded yet.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {(purchasesQuery.data ?? []).map((row) => (
                  <li key={row.id} className="flex flex-wrap justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {row.medical_supply_items?.item_code} {row.medical_supply_items?.item_description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {row.quantity} units from {row.supplier_name} on {formatDate(row.purchase_date)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-navy">
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
            <CardTitle className="text-base">Recent stock movements</CardTitle>
          </CardHeader>
          <CardContent>
            {(movementsQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No stock movements recorded yet.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {(movementsQuery.data ?? []).map((row) => (
                  <li key={row.id} className="flex flex-wrap justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {row.medical_supply_items?.item_code}{" "}
                        {row.medical_supply_items?.item_description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {row.movement_type} at {formatDateTime(row.created_at)}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-semibold ${row.quantity_change < 0 ? "text-alert" : "text-ok"}`}
                    >
                      {row.quantity_change > 0 ? "+" : ""}
                      {row.quantity_change}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
