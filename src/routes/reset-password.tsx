import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { t } from "@/lib/i18n/strings";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "New password · ExpoAI" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  // When the user lands here via the recovery link, Supabase fires
  // PASSWORD_RECOVERY with a temporary session. Detect that (or an
  // already-established session) before rendering the form.
  useEffect(() => {
    let resolved = false;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "INITIAL_SESSION" && session)) {
        resolved = true;
        setHasRecoverySession(!!session);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!resolved) setHasRecoverySession(!!data.session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error(t.auth.passwordTooShort);
      return;
    }
    if (password !== confirm) {
      toast.error(t.auth.passwordsDoNotMatch);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t.auth.passwordUpdated);
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{t.brand.name}</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t.auth.newPasswordTitle}</CardTitle>
            <CardDescription>{t.auth.newPasswordDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            {hasRecoverySession === null ? (
              <p className="text-sm text-muted-foreground">{t.common.loading}</p>
            ) : hasRecoverySession === false ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{t.auth.resetLinkInvalid}</p>
                <Link to="/forgot-password" className="text-sm underline">
                  {t.auth.requestNewLink}
                </Link>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rp-pw">{t.auth.newPasswordLabel}</Label>
                  <Input
                    id="rp-pw"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rp-pw2">{t.auth.confirmPasswordLabel}</Label>
                  <Input
                    id="rp-pw2"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? t.auth.updating : t.auth.updatePassword}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
