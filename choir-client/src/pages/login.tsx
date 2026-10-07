import React, { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../auth/auth-context";
import { useNavigate, useLocation } from "react-router-dom";
import { apiClient } from "../lib/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { ModeToggle } from "@/components/mode-toggle";
import { trackChoirEvent } from "../lib/analytics";
import { Loader2, Music2, Headphones, ListMusic, CalendarCheck, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname ?? "/";

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-background shadow-sm sticky top-0 z-10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-md">
              <Music2 className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-primary">
              CSync
            </h1>
            <span className="hidden sm:inline-flex ml-2 items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
              Choir Portal
            </span>
          </div>
          <div className="flex items-center gap-4">
            <ModeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-border/50 relative overflow-hidden">
          {/* Decorative Top Gradient */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          
          <CardHeader className="space-y-3 pt-8 pb-4 text-center">
            <CardTitle className="text-3xl font-bold tracking-tight">Welcome to CSync</CardTitle>
            <p className="text-muted-foreground text-sm">
              Your choir's rehearsal parts, Sunday setlists, and schedules in one place.
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6 pb-8 px-6">
            {error && (
              <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-lg flex items-start gap-2 animate-in fade-in zoom-in-95">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{error}</span>
              </div>
            )}

            {isGoogleLoading ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-5 animate-in fade-in zoom-in-95">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full blur-xl bg-primary/20 animate-pulse"></div>
                  <Loader2 className="w-10 h-10 animate-spin text-primary relative z-10" />
                </div>
                <div className="text-center space-y-1">
                  <p className="font-medium text-foreground">Signing you in...</p>
                  <p className="text-xs text-muted-foreground">This may take a few seconds if the server is waking up</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-2 animate-in fade-in zoom-in-95">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Sign in with your Google account to continue
                </p>
                <GoogleLogin
                  size="large"
                  theme="outline"
                  shape="pill"
                  text="continue_with"
                  onSuccess={async (credentialResponse) => {
                    setError(null);
                    setIsGoogleLoading(true);
                    try {
                      const res = await apiClient.post<{
                        token: string;
                        refreshToken: string;
                        user?: { createdAt: string };
                      }>("/auth/google", {
                        idToken: credentialResponse.credential,
                      });
                      login(res.data.token, res.data.refreshToken);
                      trackChoirEvent({ action: "login_success", params: { method: "google" } });
                      
                      let nextUrl = from;
                      if (res.data.user && res.data.user.createdAt) {
                        const createdTime = new Date(res.data.user.createdAt).getTime();
                        // If account was created less than 2 minutes ago, consider it a new signup
                        if (Date.now() - createdTime < 2 * 60 * 1000) {
                          nextUrl = "/profile";
                        }
                      }
                      navigate(nextUrl, { replace: true });
                    } catch (err: unknown) {
                      setIsGoogleLoading(false);
                      const message =
                        (err as { response?: { data?: { error?: string } } })
                          ?.response?.data?.error ?? "Google sign in failed. Please try again.";
                      setError(message);
                    }
                  }}
                  onError={() => {
                    setError("Google sign in failed. Please try again.");
                  }}
                />
              </div>
            )}

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-md shrink-0">
                  <Headphones className="w-4 h-4 text-indigo-500" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Voice Part Rehearsals</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Stream Soprano, Alto & Tenor audio notes and lyrics.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-500/10 rounded-md shrink-0">
                  <ListMusic className="w-4 h-4 text-purple-500" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Sunday Setlists & Keys</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">See active lineups, keys, and lead vocalists.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-pink-500/10 rounded-md shrink-0">
                  <CalendarCheck className="w-4 h-4 text-pink-500" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Rosters & Uniforms</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Check your service schedule and dress code.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
