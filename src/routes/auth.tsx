import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";

type AuthSearch = { mode?: string | undefined; redirect?: string | undefined };

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    mode: search["mode"] === "signup" ? "signup" : "login",
    redirect:
      typeof search["redirect"] === "string" && search["redirect"].startsWith("/")
        ? search["redirect"]
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in or create your CodeMarket account" },
      {
        name: "description",
        content:
          "Sign in to download software, keep your library and follow new releases on CodeMarket.",
      },
      { property: "og:title", content: "Sign in to CodeMarket" },
      { property: "og:description", content: "Create a free CodeMarket account to download software." },
    ],
  }),
  component: AuthPage,
});

const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, "Please enter your full name").max(100),
    email: z.string().trim().email("Enter a valid email address").max(255),
    password: z.string().min(8, "Use at least 8 characters").max(72),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const [forgot, setForgot] = useState(false);

  const [login, setLogin] = useState({ email: "", password: "" });
  const [signup, setSignup] = useState({ fullName: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (loading || !user) return;
    if (isAdmin) {
      void navigate({ to: "/admin/dashboard", replace: true });
    } else {
      void navigate({ to: search.redirect ?? "/", replace: true });
    }
  }, [user, isAdmin, loading, navigate, search.redirect]);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword(login);
    setBusy(false);
    if (error) {
      toast.error(
        error.message.toLowerCase().includes("invalid")
          ? "Wrong email or password."
          : "We couldn't sign you in. Please try again.",
      );
      return;
    }
    trackEvent("login");
  }

  async function handleSignup(event: React.FormEvent) {
    event.preventDefault();
    const parsed = signupSchema.safeParse(signup);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: parsed.data.fullName },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(
        error.message.toLowerCase().includes("already")
          ? "An account with this email already exists."
          : "We couldn't create your account. Please try again.",
      );
      return;
    }
    trackEvent("signup");
    if (!data.session) setCheckEmail(true);
  }

  async function handleGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    setBusy(false);
    if (result.error) toast.error("Google sign-in didn't work. Please try again.");
  }

  async function handleForgot(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(login.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) {
      toast.error("We couldn't send the reset email. Please try again.");
      return;
    }
    toast.success("Check your inbox for the password reset link.");
    setForgot(false);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
          <Logo />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        {checkEmail ? (
          <div className="rounded-xl border bg-card p-6 text-center">
            <h1 className="font-display text-xl font-semibold">Confirm your email</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We sent you a confirmation link. Click it to activate your CodeMarket account, then
              come back and sign in.
            </p>
            <Button className="mt-5" variant="outline" onClick={() => setCheckEmail(false)}>
              Back to sign in
            </Button>
          </div>
        ) : forgot ? (
          <form onSubmit={handleForgot} className="rounded-xl border bg-card p-6">
            <h1 className="font-display text-xl font-semibold">Reset your password</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your email and we'll send you a reset link.
            </p>
            <div className="mt-5 space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                required
                value={login.email}
                onChange={(event) => setLogin({ ...login, email: event.target.value })}
              />
            </div>
            <div className="mt-5 flex gap-2">
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                Send reset link
              </Button>
              <Button type="button" variant="ghost" onClick={() => setForgot(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Tabs defaultValue={search.mode === "signup" ? "signup" : "login"}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="mt-4 space-y-4 rounded-xl border bg-card p-6">
                <h1 className="font-display text-xl font-semibold">Welcome back</h1>
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    required
                    value={login.email}
                    onChange={(event) => setLogin({ ...login, email: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    required
                    value={login.password}
                    onChange={(event) => setLogin({ ...login, password: event.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                  Sign in
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={() => void handleGoogle()} disabled={busy}>
                  Continue with Google
                </Button>
                <button
                  type="button"
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => setForgot(true)}
                >
                  Forgot your password?
                </button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="mt-4 space-y-4 rounded-xl border bg-card p-6" noValidate>
                <h1 className="font-display text-xl font-semibold">Create your account</h1>
                <div className="space-y-2">
                  <Label htmlFor="full-name">Full name</Label>
                  <Input
                    id="full-name"
                    value={signup.fullName}
                    onChange={(event) => setSignup({ ...signup, fullName: event.target.value })}
                  />
                  {errors["fullName"] ? (
                    <p className="text-xs text-destructive">{errors["fullName"]}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={signup.email}
                    onChange={(event) => setSignup({ ...signup, email: event.target.value })}
                  />
                  {errors["email"] ? <p className="text-xs text-destructive">{errors["email"]}</p> : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={signup.password}
                    onChange={(event) => setSignup({ ...signup, password: event.target.value })}
                  />
                  {errors["password"] ? (
                    <p className="text-xs text-destructive">{errors["password"]}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm">Confirm password</Label>
                  <Input
                    id="signup-confirm"
                    type="password"
                    value={signup.confirm}
                    onChange={(event) => setSignup({ ...signup, confirm: event.target.value })}
                  />
                  {errors["confirm"] ? (
                    <p className="text-xs text-destructive">{errors["confirm"]}</p>
                  ) : null}
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                  Create account
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={() => void handleGoogle()} disabled={busy}>
                  Continue with Google
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Back to CodeMarket
          </Link>
        </p>
      </main>
    </div>
  );
}
