import React, { useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { useAuth } from "../auth/auth-context";
import { useNavigate, useLocation } from "react-router-dom";
import { apiClient } from "../lib/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { trackChoirEvent } from "../lib/analytics";
import { Loader2, Headphones, ListMusic, CalendarCheck, AlertCircle, Smartphone } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname ?? "/";

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setError(null);
      setIsGoogleLoading(true);
      try {
        const res = await apiClient.post<{
          token: string;
          refreshToken: string;
          user?: { createdAt: string };
        }>("/auth/google", {
          accessToken: tokenResponse.access_token,
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
    },
    onError: () => {
      setIsGoogleLoading(false);
      setError("Google sign in failed. Please try again.");
    },
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-background shadow-sm sticky top-0 z-10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
           <div className="bg-black rounded-full p-0.5">  <img src="/dgc_logo.png" alt="DGC Crest" className="w-8 h-8 object-contain shrink-0" /></div>
            <h1 className="text-xl font-bold tracking-tight text-primary">
              DGC Resound
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
            <CardTitle className="text-3xl font-bold tracking-tight">Welcome to DGC Resound</CardTitle>
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
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Sign in with your Google account to continue
                </p>
                <Button
                  type="button"
                  onClick={() => {
                    setError(null);
                    handleGoogleLogin();
                  }}
                  variant="outline"
                  className="w-full sm:w-auto min-w-[240px] h-11 rounded-full font-medium shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-3 border-input hover:bg-accent/80 active:scale-[0.98]"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.92 0 12s.45 3.85 1.24 5.42l4.04-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.93 6.72-4.93z"
                    />
                  </svg>
                  <span className="text-sm font-medium">Continue with Google</span>
                </Button>
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

            <div className="pt-2 border-t border-border/50 text-center">
              <a
                href="https://github.com/sam-c14/choir-sync/releases/latest/download/ChoirSync-Latest.apk"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors py-1"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Prefer Android native app? Click here to download</span>
              </a>
               <p className="text-xs text-muted-foreground">
                This is for Android users only. iOS users can use the web app in Safari/Chrome.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
