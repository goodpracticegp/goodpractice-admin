import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  Download,
  Eye,
  FileSpreadsheet,
  Pencil,
  Plus,
  ShoppingCart,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import {
  AdjustStockDialog,
  DeleteItemDialog,
  RecordPurchaseDialog,
} from "@/components/SupplyDialogs";
import { useAuth } from "@/hooks/useAuth";
import { deleteItem, fetchItems, type SupplyItem } from "@/lib/supplies";
import { CATEGORIES, STATUSES, formatAud, formatDate } from "@/lib/au";
import { exportCsv, exportXlsx, type ExportColumn } from "@/lib/export";
import { logAudit } from "@/lib/audit";

type SortKey = "item_code" | "item_description" | "category" | "available_stock" | "purchase_price_aud" | "status" | "expiry_date";

export const Route = createFileRoute("/_authenticated/supplies/")({
  validateSearch: (search: Record<string, unknown>): { status?: string } =>
    typeof search["status"] === "string" ? { status: search["status"] } : {},

  head: () => ({
    meta: [
      { title: "Medical Supplies Inventory | Good Practice (GP) Surgery" },
      {
        name: "description",
        content:
          "Search, filter and manage the medical supply inventory for Good Practice GP Surgery, including purchases, stock adjustments and exports.",
      },
      { property: "og:title", content: "Medical Supplies Inventory | Good Practice (GP) Surgery" },
      {
        property: "og:description",
        content: "Search, filter and manage the Good Practice GP Surgery medical supply inventory.",
      },
    ],
  }),
  component: SuppliesPage,
});

const PAGE_SIZE = 10;

function SuppliesPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const search = Route.useSearch();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState(search.status ?? "all");
  const [supplier, setSupplier] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("item_code");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);

  const [purchaseItem, setPurchaseItem] = useState<SupplyItem | null>(null);
  const [adjustItem, setAdjustItem] = useState<SupplyItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SupplyItem | null>(null);

  const itemsQuery = useQuery({ queryKey: ["items"], queryFn: fetchItems });
  const items = itemsQuery.data ?? [];

  const suppliers = useMemo(
    () => Array.from(new Set(items.map((i) => i.supplier_name))).sort(),
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = items.filter((item) => {
      const matchesQuery =
        !q ||
        item.item_code.toLowerCase().includes(q) ||
        item.item_description.toLowerCase().includes(q) ||
        item.supplier_name.toLowerCase().includes(q);
      const matchesCategory = category === "all" || item.category === category;
      const matchesStatus = status === "all" || item.status === status;
      const matchesSupplier = supplier === "all" || item.supplier_name === supplier;
      return matchesQuery && matchesCategory && matchesStatus && matchesSupplier;
    });

    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") return sortAsc ? av - bv : bv - av;
      const as = String(av ?? "");
      const bs = String(bv ?? "");
      return sortAsc ? as.localeCompare(bs) : bs.localeCompare(as);
    });
  }, [items, query, category, status, supplier, sortKey, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const deleteMutation = useMutation({
    mutationFn: async (input: { item: SupplyItem; reason: string }) =>
      deleteItem(input.item, input.reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["items"] });
      void queryClient.invalidateQueries({ queryKey: ["reorder-count"] });
      void queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      toast.success("Supply item archived");
      setDeleteTarget(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const columns: ExportColumn<SupplyItem>[] = [
    { header: "Item Code", value: (r) => r.item_code },
    { header: "Item Description", value: (r) => r.item_description },
    { header: "Category", value: (r) => r.category },
    { header: "Supplier Name", value: (r) => r.supplier_name },
    { header: "Supplier Email", value: (r) => r.supplier_email },
    { header: "Purchase Price (AUD)", value: (r) => Number(r.purchase_price_aud).toFixed(2) },
    { header: "Available Stock", value: (r) => r.available_stock },
    { header: "Reorder Level", value: (r) => r.reorder_level },
    { header: "Reorder Quantity", value: (r) => r.reorder_quantity },
    { header: "Last Purchased", value: (r) => formatDate(r.last_purchased_date) },
    { header: "Expiry Date", value: (r) => formatDate(r.expiry_date) },
    { header: "Status", value: (r) => r.status },
  ];

  const runExport = async (kind: "csv" | "xlsx") => {
    const stamp = formatDate(new Date().toISOString().slice(0, 10)).replace(/\//g, "-");
    if (kind === "csv") {
      exportCsv(filtered, columns, `gp-surgery-medical-supplies-${stamp}.csv`);
    } else {
      exportXlsx(filtered, columns, `gp-surgery-medical-supplies-${stamp}.xlsx`, "Medical Supplies");
    }
    await logAudit("Export", "medical_supply_items", null, {
      format: kind,
      rows: filtered.length,
    });
    void queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    toast.success(`Exported ${filtered.length} items to ${kind.toUpperCase()}`);
  };

  const sortButton = (key: SortKey, label: string) => (
    <button
      type="button"
      onClick={() => {
        if (sortKey === key) setSortAsc(!sortAsc);
        else {
          setSortKey(key);
          setSortAsc(true);
        }
      }}
      className="inline-flex items-center gap-1 font-semibold text-foreground hover:text-teal"
    >
      {label}
      {sortKey === key &&
        (sortAsc ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />)}
    </button>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy sm:text-2xl">Medical supplies</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} of {items.length} items shown
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void runExport("csv")}>
            <Download className="mr-1.5 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => void runExport("xlsx")}>
            <FileSpreadsheet className="mr-1.5 h-4 w-4" />
            Export Excel
          </Button>
          {isAdmin && (
            <Button size="sm" onClick={() => void navigate({ to: "/supplies/new" })}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add item
            </Button>
          )}
        </div>
      </div>

      <Card className="shadow-card">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <Input
              placeholder="Search code, description or supplier"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            value={category}
            onValueChange={(v) => {
              setCategory(v);
              setPage(1);
            }}
          >
            <SelectTrigger aria-label="Filter by category">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          >
            <SelectTrigger aria-label="Filter by status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={supplier}
            onValueChange={(v) => {
              setSupplier(v);
              setPage(1);
            }}
          >
            <SelectTrigger aria-label="Filter by supplier">
              <SelectValue placeholder="All suppliers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All suppliers</SelectItem>
              {suppliers.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{sortButton("item_code", "Code")}</TableHead>
                <TableHead className="min-w-[220px]">
                  {sortButton("item_description", "Description")}
                </TableHead>
                <TableHead>{sortButton("category", "Category")}</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">
                  {sortButton("available_stock", "Stock")}
                </TableHead>
                <TableHead className="text-right">Reorder at</TableHead>
                <TableHead className="text-right">
                  {sortButton("purchase_price_aud", "Price")}
                </TableHead>
                <TableHead>{sortButton("expiry_date", "Expiry")}</TableHead>
                <TableHead>{sortButton("status", "Status")}</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                    Loading supply items...
                  </TableCell>
                </TableRow>
              )}
              {!itemsQuery.isLoading && pageRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                    No supply items match these filters.
                  </TableCell>
                </TableRow>
              )}
              {pageRows.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs font-semibold text-navy">
                    {item.item_code}
                  </TableCell>
                  <TableCell className="font-medium">{item.item_description}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.category}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.supplier_name}
                  </TableCell>
                  <TableCell className="text-right font-semibold">{item.available_stock}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {item.reorder_level}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {formatAud(item.purchase_price_aud)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(item.expiry_date) || "Not applicable"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        to="/supplies/$itemId"
                        params={{ itemId: item.id }}
                        title="View item"
                        aria-label={`View ${item.item_code}`}
                        className="rounded p-2 text-muted-foreground hover:bg-muted hover:text-navy"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link
                        to="/supplies/$itemId/edit"
                        params={{ itemId: item.id }}
                        title="Edit item"
                        aria-label={`Edit ${item.item_code}`}
                        className="rounded p-2 text-muted-foreground hover:bg-muted hover:text-navy"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        title="Record purchase"
                        aria-label={`Record purchase for ${item.item_code}`}
                        onClick={() => setPurchaseItem(item)}
                        className="rounded p-2 text-muted-foreground hover:bg-muted hover:text-teal"
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </button>
                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            title="Adjust stock"
                            aria-label={`Adjust stock for ${item.item_code}`}
                            onClick={() => setAdjustItem(item)}
                            className="rounded p-2 text-muted-foreground hover:bg-muted hover:text-teal"
                          >
                            <SlidersHorizontal className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Delete item"
                            aria-label={`Delete ${item.item_code}`}
                            onClick={() => setDeleteTarget(item)}
                            className="rounded p-2 text-muted-foreground hover:bg-alert/10 hover:text-alert"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      <RecordPurchaseDialog
        item={purchaseItem}
        open={purchaseItem !== null}
        onOpenChange={(open) => !open && setPurchaseItem(null)}
      />
      <AdjustStockDialog
        item={adjustItem}
        open={adjustItem !== null}
        onOpenChange={(open) => !open && setAdjustItem(null)}
      />
      <DeleteItemDialog
        item={deleteTarget}
        open={deleteTarget !== null}
        pending={deleteMutation.isPending}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={(reason) => deleteTarget && deleteMutation.mutate({ item: deleteTarget, reason })}
      />
    </div>
  );
}
