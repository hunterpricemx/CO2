"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useTransition, useState, useEffect } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { confirmRecoverGamePasswordAction } from "@/modules/auth/actions";
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

export default function ResetPasswordPage() {
  const { locale, version } = useParams() as { locale: string; version: string };
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations("auth");
  const tn = useTranslations("nav");
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const allowRecovery = process.env.NEXT_PUBLIC_ENABLE_PASSWORD_RECOVERY === "true";

  function vp(path: string) {
    return `/${locale === "es" ? "" : `${locale}/`}${version}${path}`;
  }

  const loginPath = `/${locale === "es" ? "" : `${locale}/`}${version}/login`;

  useEffect(() => {
    if (!allowRecovery) {
      router.replace(loginPath);
    }
  }, [allowRecovery, router, loginPath]);

  const token = searchParams.get("token") ?? "";

  const schema = z
    .object({
      newPassword: z
        .string()
        .min(6, t("errors.weak_password"))
        .max(16, t("errors.weak_password"))
        .regex(/^[a-zA-Z0-9]+$/, t("errors.password_invalid")),
      confirmPassword: z.string(),
    })
    .refine((d) => d.newPassword === d.confirmPassword, {
      path: ["confirmPassword"],
      message: t("errors.password_mismatch"),
    });

  type FormData = z.infer<typeof schema>;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const errorMap: Record<string, string> = {
    weak_password: t("errors.weak_password"),
    password_invalid: t("errors.password_invalid"),
    invalid_token: t("errors.invalid_token"),
    token_expired: t("errors.token_expired"),
  };

  function onSubmit(data: FormData) {
    if (!allowRecovery) {
      toast.error("La recuperación de contraseña está deshabilitada temporalmente.");
      router.replace(loginPath);
      return;
    }

    if (!token) {
      toast.error(t("errors.invalid_token"));
      return;
    }

    startTransition(async () => {
      const result = await confirmRecoverGamePasswordAction({
        token,
        newPassword: data.newPassword,
        version: version === "1.0" ? 1 : 2,
      });

      if (!result.success) {
        toast.error(errorMap[result.error ?? ""] ?? result.error ?? "Error");
        return;
      }

      toast.success(t("recover_success"));
      window.location.assign(vp("/login"));
    });
  }

  const heroBg =
    version === "1.0"
      ? "/images/backgrounds/bg__main10.jpg"
      : "/images/backgrounds/bg__main20.jpg";
  const logoSrc =
    version === "1.0"
      ? "/images/logos/conquer_classic_plus_10_logo.png"
      : "/images/logos/conquer_classic_plus_20_logo.png";

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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} alt="Conquer" className="w-36 drop-shadow-xl" />

        <p className="text-sm text-muted-foreground">
          <Link href={vp("/")} className="text-gold hover:text-gold-light transition-colors">
            {tn("home")}
          </Link>
          <span className="mx-2 text-muted-foreground/50">›</span>
          <span>{t("reset_title")}</span>
        </p>

        <div className="w-full bg-surface/90 border border-gold/20 rounded-2xl p-8 flex flex-col gap-6">
          <div className="text-center">
            <h1 className="font-bebas text-4xl tracking-widest text-gold">{t("reset_title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("reset_subtitle")}</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("new_password")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          className="bg-background border-surface/50 pr-10"
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("confirm_new_password")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showConfirm ? "text" : "password"}
                          autoComplete="new-password"
                          className="bg-background border-surface/50 pr-10"
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={isPending}
                className="mt-2 bg-gold hover:bg-gold-dark text-background font-bold h-10"
              >
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t("reset_button")}
              </Button>
            </form>
          </Form>

          <p className="text-center text-xs text-muted-foreground">
            <Link
              href={vp("/login")}
              className="text-gold hover:text-gold-light transition-colors font-medium"
            >
              {t("recover_back_login")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
