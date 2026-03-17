"use client";

import { useLogin } from "@refinedev/core";
import { useState } from "react";
import { Shield, Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  const { mutate: login, isPending: isLoading } = useLogin<{
    email: string;
    password: string;
  }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function getLoginErrorMessage(error: unknown) {
    const fallback = "Credenciales incorrectas o sin acceso admin.";

    if (!error || typeof error !== "object" || !("message" in error)) {
      return fallback;
    }

    const message = String((error as { message?: string }).message ?? "").toLowerCase();

    if (message.includes("invalid login credentials")) {
      return "Correo o contrasena incorrectos.";
    }
    if (message.includes("email not confirmed")) {
      return "El correo no esta confirmado en Supabase.";
    }
    if (message.includes("no tienes permisos") || message.includes("unauthorized")) {
      return "Esta cuenta no tiene permisos de administrador.";
    }
    if (message.includes("rate limit") || message.includes("too many requests")) {
      return "Demasiados intentos. Espera un momento e intenta de nuevo.";
    }
    if (message.includes("fetch") || message.includes("500") || message.includes("internal")) {
      return "Error del servidor de autenticacion. Revisa Supabase e intenta de nuevo.";
    }

    return fallback;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    login(
      { email, password },
      {
        onError: (loginError) => {
          console.error("Admin login error:", loginError);
          setError(getLoginErrorMessage(loginError));
        },
      },
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0503] px-4">
      <div className="w-full max-w-sm bg-[#1a1a1a] border border-[rgba(255,215,0,0.15)] rounded-2xl p-8 flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2">
          <div className="bg-[rgba(243,156,18,0.1)] border border-[rgba(243,156,18,0.2)] p-3 rounded-xl">
            <Shield className="h-7 w-7 text-[#f39c12]" />
          </div>
          <h1 className="font-bebas text-3xl tracking-widest text-[#f39c12]">
            Admin Panel
          </h1>
          <p className="text-xs text-gray-500">Acceso restringido</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="admin@conquer.com"
              className="bg-[#0f0503] border border-[rgba(255,215,0,0.15)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f39c12] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 uppercase tracking-wider">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="bg-[#0f0503] border border-[rgba(255,215,0,0.15)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f39c12] transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 bg-[#f39c12] hover:bg-[#e67e22] disabled:opacity-50 text-black font-semibold rounded-lg py-2 text-sm transition-colors flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
