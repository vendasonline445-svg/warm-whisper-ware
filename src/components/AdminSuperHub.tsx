import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: "superadmin" | "admin" | "client";
  client_id: string | null;
  created_at: string;
}

interface Client {
  id: string;
  client_name: string;
}

export default function AdminSuperHub() {
  const { profile: myProfile } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "client">("client");
  const [newClientId, setNewClientId] = useState<string>("");
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from("profiles" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("clients").select("id, client_name").order("client_name"),
    ]);
    setProfiles((p as any[]) ?? []);
    setClients((c as any[]) ?? []);
    setLoading(false);
  }

  async function updateRole(userId: string, role: string) {
    const { error } = await supabase
      .from("profiles" as any)
      .update({ role } as any)
      .eq("id", userId);

    if (error) {
      toast({ title: "Erro ao atualizar role", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Role atualizado com sucesso" });
      loadData();
    }
  }

  async function updateClientId(userId: string, clientId: string) {
    const { error } = await supabase
      .from("profiles" as any)
      .update({ client_id: clientId || null } as any)
      .eq("id", userId);

    if (error) {
      toast({ title: "Erro ao atualizar cliente", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Cliente vinculado com sucesso" });
      loadData();
    }
  }

  async function inviteUser() {
    if (!newEmail) return;
    setCreating(true);
    const { error } = await supabase.functions.invoke("admin-invite-user", {
      body: { email: newEmail, full_name: newName, role: newRole, client_id: newClientId || null },
    });
    if (error) {
      toast({ title: "Erro ao convidar usuário", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Convite enviado", description: `Email enviado para ${newEmail}` });
      setNewEmail(""); setNewName(""); setNewClientId("");
      loadData();
    }
    setCreating(false);
  }

  async function deleteUser(userId: string, userEmail: string) {
    if (userId === myProfile?.id) {
      toast({ title: "Não é possível excluir sua própria conta", variant: "destructive" });
      return;
    }
    if (!confirm(`Remover acesso de ${userEmail}?`)) return;
    const { error } = await supabase.functions.invoke("admin-delete-user", {
      body: { user_id: userId },
    });
    if (error) {
      toast({ title: "Erro ao remover usuário", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Acesso removido" });
      loadData();
    }
  }

  const roleBadge = (role: string) => {
    const map: Record<string, string> = {
      superadmin: "bg-primary/20 text-primary",
      admin: "bg-accent/20 text-accent-foreground",
      client: "bg-muted text-muted-foreground",
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[role] ?? ""}`}>{role}</span>;
  };

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Super Admin</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie todos os usuários, roles e acessos do FunnelIQ.
        </p>
      </div>

      {/* Invite user */}
      <div className="border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-base font-medium">Convidar novo usuário</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input placeholder="Email" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
          <Input placeholder="Nome completo (opcional)" value={newName} onChange={e => setNewName(e.target.value)} />
          <Select value={newRole} onValueChange={(v: "admin" | "client") => setNewRole(v)}>
            <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin — acesso total ao painel</SelectItem>
              <SelectItem value="client">Client — vê apenas os próprios dados</SelectItem>
            </SelectContent>
          </Select>
          {newRole === "client" && (
            <Select value={newClientId} onValueChange={setNewClientId}>
              <SelectTrigger><SelectValue placeholder="Vincular a um cliente" /></SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.client_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <Button onClick={inviteUser} disabled={creating || !newEmail}>
          {creating ? "Enviando convite..." : "Enviar convite por email"}
        </Button>
      </div>

      {/* Users table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Cliente vinculado</TableHead>
              <TableHead>Desde</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : profiles.map(p => (
              <TableRow key={p.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{p.full_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{p.email}</p>
                  </div>
                </TableCell>
                <TableCell>
                  {p.id === myProfile?.id ? (
                    roleBadge(p.role)
                  ) : (
                    <Select value={p.role} onValueChange={v => updateRole(p.id, v)}>
                      <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="superadmin">superadmin</SelectItem>
                        <SelectItem value="admin">admin</SelectItem>
                        <SelectItem value="client">client</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
                <TableCell>
                  {p.role === "client" ? (
                    <Select value={p.client_id ?? ""} onValueChange={v => updateClientId(p.id, v)}>
                      <SelectTrigger className="w-44 h-7 text-xs"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                      <SelectContent>
                        {clients.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.client_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-xs text-muted-foreground">Acesso total</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell>
                  {p.id !== myProfile?.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive h-7 text-xs"
                      onClick={() => deleteUser(p.id, p.email)}
                    >
                      Remover
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
