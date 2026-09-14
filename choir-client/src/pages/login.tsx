import React, { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginSchema, type LoginDto } from "@choir-workspace/shared-validation";
import { useAuth } from "../auth/auth-context";
import { useNavigate, useLocation } from "react-router-dom";
import { apiClient } from "../lib/api-client";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import { ModeToggle } from "@/components/mode-toggle";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname ?? "/";

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginDto>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (data: LoginDto) => {
    try {
      const res = await apiClient.post<{ token: string, refreshToken: string }>("/auth/login", data);
      login(res.data.token, res.data.refreshToken);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Login failed. Check your email and password.";
      setError("root", { message });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background p-4">
      <header className="border-b bg-background shadow-sm sticky top-0 z-10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-primary">
              CSync
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <ModeToggle />
          </div>
        </div>
      </header>
      <Card className="w-full max-w-sm shadow-md mx-auto my-auto overflow-hidden">
        <CardHeader className="space-y-4">
          <CardTitle className="text-2xl font-bold">Login</CardTitle>
          <CardDescription>Sign in to access the song library</CardDescription>
        </CardHeader>
        <CardContent>
          {isGoogleLoading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-6">
              <div className="relative">
                <div className="absolute inset-0 rounded-full blur-xl bg-primary/20 animate-pulse"></div>
                <Loader2 className="w-12 h-12 animate-spin text-primary relative z-10" />
              </div>
              <p className="text-base font-medium text-muted-foreground animate-pulse text-center">
                Securely authenticating<br/>with Google...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="space-y-4">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-sm text-destructive font-medium">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-4">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-sm text-destructive font-medium">
                    {errors.password.message}
                  </p>
                )}
              </div>
              {errors.root && (
                <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md flex items-start gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span className="font-medium mt-0.5">{errors.root.message}</span>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Signing in…" : "Sign in"}
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={async (credentialResponse) => {
                    setIsGoogleLoading(true);
                    try {
                      const res = await apiClient.post<{ token: string, refreshToken: string }>("/auth/google", {
                        idToken: credentialResponse.credential,
                      });
                      login(res.data.token, res.data.refreshToken);
                      navigate(from, { replace: true });
                    } catch (err: unknown) {
                      setIsGoogleLoading(false);
                      const message =
                        (err as { response?: { data?: { error?: string } } })?.response?.data
                          ?.error ?? "Google sign in failed.";
                      setError("root", { message });
                    }
                  }}
                  onError={() => {
                    setError("root", { message: "Google sign in failed." });
                  }}
                />
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
