"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { gameRegisterAction } from "@/modules/auth/actions";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTransition, useState, useRef } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import ReCAPTCHA from "react-google-recaptcha";
import { useTranslations } from "next-intl";

export default function RegisterPage() {
  const { locale, version } = useParams() as { locale: string; version: string };
  const router = useRouter();
  const t = useTranslations("auth");
  const tn = useTranslations("nav");
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  function vp(path: string) {
    return `/${locale === "es" ? "" : locale + "/"}${version}${path}`;
  }

  const heroBg =
    version === "1.0"
      ? "/images/backgrounds/bg__main10.jpg"
      : "/images/backgrounds/bg__main20.jpg";
  const logoSrc =
    version === "1.0"
      ? "/images/logos/conquer_classic_plus_10_logo.png"
      : "/images/logos/conquer_classic_plus_20_logo.png";

  // Schema defined inside component to access translations for error messages
  const schema = z
    .object({
      username: z
        .string()
        .min(6, t("errors.username_invalid"))
        .max(16, t("errors.username_invalid"))
        .regex(/^[a-zA-Z0-9]+$/, t("errors.username_invalid")),
      email: z.string().email(),
      password: z
        .string()
        .min(6, t("errors.weak_password"))
        .max(16, t("errors.weak_password"))
        .regex(/^[a-zA-Z0-9]+$/, t("errors.password_invalid")),
      confirmPassword: z.string(),
    })
    .refine((d) => d.password === d.confirmPassword, {
      path: ["confirmPassword"],
      message: t("errors.password_mismatch"),
    });

  type FormData = z.infer<typeof schema>;

  const errorMap: Record<string, string> = {
    email_taken: t("errors.email_taken"),
    username_taken: t("errors.username_taken"),
    weak_password: t("errors.weak_password"),    "captcha_error": t("errors.captcha_error"),  };

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { username: "", email: "", password: "", confirmPassword: "" },
  });

  const usernameValue = form.watch("username");
  const passwordValue = form.watch("password");
  const confirmValue = form.watch("confirmPassword");

  function onSubmit({ username, email, password }: FormData) {
    startTransition(async () => {
      const captchaToken = recaptchaRef.current?.getValue() ?? "";
      const versionNum = version === "1.0" ? 1 : 2;
      if (!captchaToken) {
        toast.error(t("errors.captcha_error"));
        return;
      }
      const result = await gameRegisterAction({ username, email, password, captchaToken, version: versionNum });
      if (result.success) {
        toast.success(t("success_register"));
        router.push(vp("/"));
        router.refresh();
      } else {
        recaptchaRef.current?.reset();
        toast.error(errorMap[result.error ?? ""] ?? result.error ?? "Error");
      }
    });
  }

  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 py-16"
      style={{
        backgroundImage: `url('${heroBg}')`,
        backgroundSize: "cover",
        backgroundPosition: "50% 24%",
      }}
    >
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.78)" }} />

      <div className="relative z-10 flex flex-col items-center gap-5 w-full max-w-md">
        {/* Version logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} alt="Conquer" className="w-36 drop-shadow-xl" />

        {/* Breadcrumb */}
        <p className="text-sm text-muted-foreground">
          <Link href={vp("/")} className="text-gold hover:text-gold-light transition-colors">
            {tn("home")}
          </Link>
          <span className="mx-2 text-muted-foreground/50">›</span>
          <span>{t("register_title")}</span>
        </p>

        {/* Card */}
        <div className="w-full bg-surface/90 border border-gold/20 rounded-2xl p-8 flex flex-col gap-6">
          <div className="text-center">
            <h1 className="font-bebas text-4xl tracking-widest text-gold">
              {t("register_title")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("register_subtitle")}
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
              {/* Username */}
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("username")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="GuerreroDeLuz"
                        className="bg-background border-surface/50"
                        autoComplete="username"
                        autoFocus
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground/60">{t("username_hint")}</p>
                    {usernameValue.length > 0 && (
                      <div className="flex flex-col gap-0.5">
                        {[
                          { ok: usernameValue.length >= 6 && usernameValue.length <= 16, label: t("username_check_length") },
                          { ok: /^[a-zA-Z0-9]+$/.test(usernameValue), label: t("username_check_alpha") },
                        ].map(({ ok, label }) => (
                          <span key={label} className={`text-xs flex items-center gap-1 ${ok ? "text-green-400" : "text-red-400/80"}`}>
                            {ok ? "✓" : "✗"} {label}
                          </span>
                        ))}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("email")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="tu@email.com"
                        className="bg-background border-surface/50"
                        autoComplete="email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("password")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="bg-background border-surface/50 pr-10"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                          tabIndex={-1}
                          aria-label={showPassword ? t("hide_password") : t("show_password")}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <p className="text-xs text-muted-foreground/60">{t("password_hint")}</p>
                    {passwordValue.length > 0 && (
                      <div className="flex flex-col gap-0.5">
                        {[
                          { ok: passwordValue.length >= 6 && passwordValue.length <= 16, label: t("password_check_length") },
                          { ok: /^[a-zA-Z0-9]+$/.test(passwordValue), label: t("password_check_alpha") },
                        ].map(({ ok, label }) => (
                          <span key={label} className={`text-xs flex items-center gap-1 ${ok ? "text-green-400" : "text-red-400/80"}`}>
                            {ok ? "✓" : "✗"} {label}
                          </span>
                        ))}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Confirm Password */}
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("confirm_password")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showConfirm ? "text" : "password"}
                          placeholder="••••••••"
                          className="bg-background border-surface/50 pr-10"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                          tabIndex={-1}
                          aria-label={showConfirm ? t("hide_password") : t("show_password")}
                        >
                          {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    {confirmValue.length > 0 && (
                      <p className={`text-xs mt-0.5 ${passwordValue === confirmValue ? "text-green-400" : "text-red-400/80"}`}>
                        {passwordValue === confirmValue
                          ? `✓ ${t("passwords_match")}`
                          : `✗ ${t("errors.password_mismatch")}`}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* reCAPTCHA */}
              <div className="flex justify-center">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
                  theme="light"
                />
              </div>

              <Button
                type="submit"
                disabled={isPending}
                className="mt-2 bg-gold hover:bg-gold-dark text-background font-bold h-10"
              >
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t("register_button")}
              </Button>
            </form>
          </Form>

          <p className="text-center text-xs text-muted-foreground">
            {t("already_account")}{" "}
            <Link
              href={vp("/login")}
              className="text-gold hover:text-gold-light transition-colors font-medium"
            >
              {t("login_link")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
