"use client";

import { useLogin } from "@refinedev/core";
import { useEffect, useRef, useState } from "react";
import { Shield, Loader2, Eye, EyeOff, AlertTriangle, KeyRound, Mail } from "lucide-react";

const LAST_EMAIL_KEY = "admin_last_email";

function getLoginErrorMessage(error: unknown): string {
  const fallback = "Credenciales incorrectas o sin acceso admin.";
  if (!error || typeof error !== "object" || !("message" in error)) return fallback;

  const raw = String((error as { message?: string }).message ?? "");
  const msg = raw.toLowerCase();

  if (msg.includes("invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (msg.includes("email not confirmed"))       return "El correo no está confirmado en Supabase.";
  if (msg.includes("no tienes permisos") || msg.includes("unauthorized"))
                                                  return "Esta cuenta existe pero no tiene rol de administrador.";
  if (msg.includes("rate limit") || msg.includes("too many requests"))
                                                  return "Demasiados intentos. Espera ~1 min e intenta de nuevo.";
  if (msg.includes("network") || msg.includes("fetch failed"))
                                                  return "Error de red — no se pudo contactar a Supabase.";
  if (msg.includes("500") || msg.includes("internal"))
                                                  return "Error del servidor de autenticación. Revisa Supabase e intenta de nuevo.";
  // Show raw message as last resort if it's short enough to be useful.
  if (raw.length > 0 && raw.length < 140) return `${fallback} (${raw})`;
  return fallback;
}

export default function AdminLoginPage() {
  const { mutate: login, isPending: isLoading } = useLogin<{ email: string; password: string }>();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]       = useState("");
  const [touched, setTouched]   = useState({ email: false, password: false });
  const [capsLock, setCapsLock] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);

  // Restore last email from localStorage + autofocus.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LAST_EMAIL_KEY);
      if (saved) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setEmail(saved);
      }
    } catch {
      /* ignore quota / private mode */
    }
    // Focus email if empty, else password.
    setTimeout(() => {
      if (!emailRef.current?.value) emailRef.current?.focus();
      else (document.querySelector('input[type="password"], input[name="password"]') as HTMLInputElement | null)?.focus();
    }, 50);
  }, []);

  // Client-side validation.
  const emailValid    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 6;
  const formValid     = emailValid && passwordValid;
  const showEmailErr  = touched.email && email.length > 0 && !emailValid;
  const showPwdErr    = touched.password && password.length > 0 && !passwordValid;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    setError("");

    if (!formValid) {
      if (!emailValid)        setError("Email inválido.");
      else if (!passwordValid) setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    try { window.localStorage.setItem(LAST_EMAIL_KEY, email); } catch { /* ignore */ }

    login(
      { email, password },
      {
        onError: (loginError) => {
          console.error("[admin-login] error:", loginError);
          setError(getLoginErrorMessage(loginError));
        },
      },
    );
  };

  const handleCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLock(e.getModifierState?.("CapsLock") ?? false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0503] px-4">
      <div className="w-full max-w-sm bg-[#1a1a1a] border border-[rgba(255,215,0,0.15)] rounded-2xl p-8 flex flex-col gap-6 shadow-2xl">
        <div className="flex flex-col items-center gap-2">
          <div className="bg-[rgba(243,156,18,0.1)] border border-[rgba(243,156,18,0.2)] p-3 rounded-xl">
            <Shield className="h-7 w-7 text-[#f39c12]" />
          </div>
          <h1 className="font-bebas text-3xl tracking-widest text-[#f39c12]">Admin Panel</h1>
          <p className="text-xs text-gray-500">Acceso restringido</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          {/* Email */}
          <div className="flex flex-col gap-1">
            <label htmlFor="admin-email" className="text-xs text-gray-400 uppercase tracking-wider">
              Email
            </label>
            <div className="relative">
              <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                ref={emailRef}
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched(t => ({ ...t, email: true }))}
                required
                autoComplete="email"
                placeholder="admin@conquer.com"
                aria-invalid={showEmailErr}
                disabled={isLoading}
                className={`w-full bg-[#0f0503] border rounded-lg pl-10 pr-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none transition-colors disabled:opacity-50 ${
                  showEmailErr
                    ? "border-red-700/60 focus:border-red-500"
                    : "border-[rgba(255,215,0,0.15)] focus:border-[#f39c12]"
                }`}
              />
            </div>
            {showEmailErr && (
              <p className="text-[11px] text-red-400 mt-0.5">Email inválido.</p>
            )}
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1">
            <label htmlFor="admin-password" className="text-xs text-gray-400 uppercase tracking-wider">
              Contraseña
            </label>
            <div className="relative">
              <KeyRound className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                id="admin-password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched(t => ({ ...t, password: true }))}
                onKeyUp={handleCapsLock}
                onKeyDown={handleCapsLock}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                aria-invalid={showPwdErr}
                disabled={isLoading}
                className={`w-full bg-[#0f0503] border rounded-lg pl-10 pr-10 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none transition-colors disabled:opacity-50 ${
                  showPwdErr
                    ? "border-red-700/60 focus:border-red-500"
                    : "border-[rgba(255,215,0,0.15)] focus:border-[#f39c12]"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors"
                tabIndex={-1}
                title={showPassword ? "Ocultar" : "Mostrar"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {showPwdErr && (
              <p className="text-[11px] text-red-400 mt-0.5">Mínimo 6 caracteres.</p>
            )}
            {capsLock && (
              <p className="text-[11px] text-yellow-400 flex items-center gap-1 mt-0.5">
                <AlertTriangle className="h-3 w-3" />
                Mayúsculas activadas
              </p>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs text-red-300 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-red-400" />
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !formValid}
            className="mt-2 bg-[#f39c12] hover:bg-[#e67e22] disabled:bg-gray-700 disabled:cursor-not-allowed text-black disabled:text-gray-500 font-semibold rounded-lg py-2.5 text-sm transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4" />
                Entrar
              </>
            )}
          </button>

          <p className="text-[10px] text-gray-600 text-center mt-1">
            ¿Olvidaste tu contraseña? Contacta al super admin.
          </p>
        </form>
      </div>
    </div>
  );
}
