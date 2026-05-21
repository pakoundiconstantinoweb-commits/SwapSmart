import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Le mot de passe doit contenir au moins 6 caractères");
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Mot de passe mis à jour");
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-card rounded-2xl shadow-card border p-8 space-y-4">
        <h1 className="text-2xl font-bold text-center">Réinitialiser le mot de passe</h1>
        <div className="space-y-1.5">
          <Label htmlFor="pwd">Nouveau mot de passe</Label>
          <Input id="pwd" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
        </div>
        <Button type="submit" disabled={submitting} className="w-full h-11">
          {submitting ? "Mise à jour..." : "Mettre à jour le mot de passe"}
        </Button>
      </form>
    </div>
  );
}
