import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserPlus, Trash2, Mail, Shield, User } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function UsersSection() {
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");

  const load = async () => {
    try {
      const list = await base44.entities.User.list();
      setUsers(list);
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los usuarios" });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleInvite = async () => {
    if (!email.trim()) return;
    setInviting(true);
    try {
      await base44.users.inviteUser(email.trim(), role);
      toast({ title: "Invitación enviada", description: `Se invitó a ${email.trim()} como ${role === "admin" ? "administrador" : "usuario"}` });
      setEmail("");
      load();
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: e.message || "No se pudo enviar la invitación" });
    }
    setInviting(false);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="font-heading font-semibold text-sm mb-1">Invitar usuario</h3>
        <p className="text-xs text-muted-foreground mb-4">Envía una invitación por correo electrónico</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-9"
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            />
          </div>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">Usuario</SelectItem>
              <SelectItem value="admin">Administrador</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleInvite} disabled={inviting || !email.trim()}>
            {inviting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
            Invitar
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="font-heading font-semibold text-sm mb-3">Usuarios ({users.length})</h3>
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No hay usuarios registrados</p>
        ) : (
          <div className="divide-y divide-border">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{u.full_name || u.email}</p>
                    {u.full_name && <p className="text-xs text-muted-foreground">{u.email}</p>}
                  </div>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 ${
                  u.role === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  {u.role === "admin" && <Shield className="w-3 h-3" />}
                  {u.role === "admin" ? "Administrador" : "Usuario"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}