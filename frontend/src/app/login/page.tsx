"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { login } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Stethoscope, Lock, Mail, Activity, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login: authLogin, isAuthenticated } = useAuth();

  if (isAuthenticated) {
    router.replace("/dashboard");
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await login(email, password);
      authLogin(res.data.token, res.data.doctor);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left Side - Pattern/Illustration */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-primary items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent bg-[length:20px_20px]" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)' }}></div>
        <div className="relative z-10 text-center px-12">
          <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md shadow-2xl border border-white/20">
            <Stethoscope className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">DocSlot</h1>
          <p className="text-blue-100 text-lg max-w-md mx-auto">
            The complete clinic management system designed for modern healthcare professionals.
          </p>
          
          <div className="mt-12 grid grid-cols-2 gap-4">
            <div className="bg-white/10 p-4 rounded-xl backdrop-blur border border-white/10 text-left">
              <Activity className="h-6 w-6 text-blue-200 mb-2" />
              <h3 className="text-white font-semibold">Live Queue</h3>
              <p className="text-blue-200 text-sm">Manage patient flow effortlessly</p>
            </div>
            <div className="bg-white/10 p-4 rounded-xl backdrop-blur border border-white/10 text-left">
              <Activity className="h-6 w-6 text-blue-200 mb-2" />
              <h3 className="text-white font-semibold">Analytics</h3>
              <p className="text-blue-200 text-sm">Track clinic performance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8 lg:p-24 bg-background">
        <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center lg:text-left">
            <div className="lg:hidden mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
              <Stethoscope className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-foreground tracking-tight">Welcome back, Doctor</h2>
            <p className="text-muted-foreground mt-2">Sign in to your account to manage your clinic</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-semibold text-foreground">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  id="email"
                  type="email"
                  placeholder="doctor@clinic.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 bg-muted/50 border-transparent focus:bg-background focus:border-primary focus:ring-primary transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-semibold text-foreground">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11 bg-muted/50 border-transparent focus:bg-background focus:border-primary focus:ring-primary transition-all"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-danger/10 p-4 text-sm text-danger flex items-start">
                <Activity className="h-5 w-5 mr-2 shrink-0" />
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-11 text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]" 
              disabled={loading}
            >
              {loading ? "Signing in..." : (
                <span className="flex items-center">
                  Sign In <ArrowRight className="ml-2 h-4 w-4" />
                </span>
              )}
            </Button>
          </form>
          
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account? Contact the system administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
