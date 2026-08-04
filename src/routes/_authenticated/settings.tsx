import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Mail, ShieldAlert, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useAuth } from "@/hooks/useAuth";
import { createUser, listUsers } from "@/lib/users.functions";
import { NOTIFICATION_RECIPIENT, formatDateTime } from "@/lib/au";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Practice Settings | Good Practice (GP) Surgery" },
      {
        name: "description",
        content:
          "Administrator settings for the GP Surgery administration system: staff accounts and reorder notification recipient.",
      },
      { property: "og:title", content: "Practice Settings | Good Practice (GP) Surgery" },
      {
        property: "og:description",
        content: "Manage staff accounts and the reorder notification recipient.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const fetchUsers = useServerFn(listUsers);
  const addUser = useServerFn(createUser);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "staff">("staff");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const usersQuery = useQuery({
    queryKey: ["managed-users"],
    queryFn: () => fetchUsers({ data: undefined as never }),
    enabled: isAdmin,
  });

  const mutation = useMutation({
    mutationFn: () => addUser({ data: { email, password, fullName, role } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["managed-users"] });
      void queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      toast.success(`Account created for ${email}`);
      setEmail("");
      setFullName("");
      setPassword("");
      setRole("staff");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!isAdmin) {
    return (
      <Card className="mx-auto max-w-lg shadow-card">
        <CardContent className="space-y-3 p-8 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-alert" />
          <h1 className="text-lg font-semibold text-navy">Administrator access only</h1>
          <p className="text-sm text-muted-foreground">
            Practice settings and user management are available to practice administrators.
          </p>
          <Link to="/dashboard" className="inline-block text-sm font-semibold text-teal">
            Return to dashboard
          </Link>
        </CardContent>
      </Card>
    );
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const found: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      found["email"] = "Enter a valid work email address.";
    if (!fullName.trim()) found["fullName"] = "Full name is required.";
    if (password.length < 8) found["password"] = "Password must be at least 8 characters.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    mutation.mutate();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-navy sm:text-2xl">Practice settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage staff accounts and reorder notification delivery.
        </p>
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4.5 w-4.5 text-teal" />
            Reorder notification recipient
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="recipient">Notifications are emailed to</Label>
          <Input id="recipient" value={NOTIFICATION_RECIPIENT} readOnly className="mt-2 max-w-md" />
          <p className="mt-2 text-xs text-muted-foreground">
            Every reorder notification is recorded in the system and emailed to this practice
            mailbox when email delivery is configured.
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4.5 w-4.5 text-teal" />
            Create a staff or administrator account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-name">Full name</Label>
              <Input id="new-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              {errors["fullName"] && <p className="text-xs text-alert">{errors["fullName"]}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">Work email address</Label>
              <Input
                id="new-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@goodpracticegp.com.au"
              />
              {errors["email"] && <p className="text-xs text-alert">{errors["email"]}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Temporary password</Label>
              <Input
                id="new-password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {errors["password"] && <p className="text-xs text-alert">{errors["password"]}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as "admin" | "staff")}>
                <SelectTrigger id="new-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff, view and record purchases</SelectItem>
                  <SelectItem value="admin">Administrator, full access</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={mutation.isPending}>
                Create account
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="overflow-hidden shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Practice user accounts</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersQuery.isLoading && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      Loading accounts...
                    </TableCell>
                  </TableRow>
                )}
                {usersQuery.isError && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-alert">
                      {(usersQuery.error as Error).message}
                    </TableCell>
                  </TableRow>
                )}
                {(usersQuery.data ?? []).map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                    <TableCell className="text-sm font-semibold uppercase text-navy">
                      {user.role ?? "none"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(user.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
