import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Menu,
  CreditCard,
  UserPen,
  Mail,
  Globe,
  Trash2,
  LogOut,
  Loader2,
  Target,
  Briefcase,
  Plane,
  MessageCircle,
  GraduationCap,
  Check,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const goalOptions = [
  { value: "work", label: "Trabalho e Carreira", Icon: Briefcase },
  { value: "travel", label: "Viagens", Icon: Plane },
  { value: "conversation", label: "Conversação do Dia a Dia", Icon: MessageCircle },
  { value: "study", label: "Estudos e Intercâmbio", Icon: GraduationCap },
];

export function SettingsMenu() {
  const { user, signOut, deleteAccount } = useAuth();
  const { profile, updateProfile } = useProfile();
  const [showProfile, setShowProfile] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [selectedGoal, setSelectedGoal] = useState("");
  const [saving, setSaving] = useState(false);

  const handleOpenProfile = () => {
    setDisplayName(profile?.display_name || "");
    setNewEmail(user?.email || "");
    setShowProfile(true);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    
    // Update display name
    await updateProfile({ display_name: displayName });
    
    // Update email if changed
    if (newEmail && newEmail !== user?.email) {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) {
        toast({ title: "Erro ao atualizar email", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Email atualizado", description: "Verifique seu novo email para confirmar a alteração." });
      }
    }
    
    setSaving(false);
    setShowProfile(false);
  };

  const handleDeleteAccount = async () => {
    await deleteAccount();
    setShowDelete(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-secondary-foreground/70 hover:text-secondary-foreground hover:bg-secondary-foreground/10"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => setShowPlan(true)}>
            <CreditCard className="w-4 h-4 mr-2" />
            Plano
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setSelectedGoal(profile?.goal || 'conversation'); setShowTheme(true); }}>
            <Target className="w-4 h-4 mr-2" />
            Tema
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleOpenProfile}>
            <UserPen className="w-4 h-4 mr-2" />
            Dados pessoais
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href="mailto:suporte@speakdaily.com.br">
              <Mail className="w-4 h-4 mr-2" />
              Falar com suporte
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href="https://speakdaily.lovable.app" target="_blank" rel="noopener noreferrer">
              <Globe className="w-4 h-4 mr-2" />
              Site
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowDelete(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir conta
          </DropdownMenuItem>
          <DropdownMenuItem onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Plan Dialog */}
      <Dialog open={showPlan} onOpenChange={setShowPlan}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Seu Plano</DialogTitle>
            <DialogDescription>Informações sobre seu plano ativo</DialogDescription>
          </DialogHeader>
          <div className="p-4 rounded-xl bg-muted/50 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">Plano</span>
              <span className="font-semibold text-sm">Gratuito</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">Status</span>
              <span className="font-semibold text-sm text-accent">Ativo</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Edit Dialog */}
      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Dados pessoais</DialogTitle>
            <DialogDescription>Edite suas informações</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="seu@email.com"
              />
              <p className="text-xs text-muted-foreground">
                Ao alterar, um email de confirmação será enviado.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveProfile} disabled={saving} variant="default">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir conta</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir sua conta? Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDelete(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Theme Dialog */}
      <Dialog open={showTheme} onOpenChange={setShowTheme}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Tema dos Desafios</DialogTitle>
            <DialogDescription>Escolha o tema principal dos seus desafios diários</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {goalOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedGoal(opt.value)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                  selectedGoal === opt.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                )}
              >
                <div className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
                  selectedGoal === opt.value ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <opt.Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium flex-1">{opt.label}</span>
                {selectedGoal === opt.value && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={async () => {
              setSaving(true);
              await updateProfile({ goal: selectedGoal });
              setSaving(false);
              setShowTheme(false);
            }} disabled={saving} variant="default">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
