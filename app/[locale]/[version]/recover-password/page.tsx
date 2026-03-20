"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTransition, useState, useEffect } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { requestRecoverGamePasswordAction } from "@/modules/auth/actions";
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

export default function RecoverPasswordPage() {
  const { locale, version } = useParams() as { locale: string; version: string };
  const router = useRouter();
  const t = useTranslations("auth");
  const tn = useTranslations("nav");
  const [isPending, startTransition] = useTransition();
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaKey, setCaptchaKey] = useState(0);
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

  const heroBg =
    version === "1.0"
      ? "/images/backgrounds/bg__main10.jpg"
      : "/images/backgrounds/bg__main20.jpg";
  const logoSrc =
    version === "1.0"
      ? "/images/logos/conquer_classic_plus_10_logo.png"
      : "/images/logos/conquer_classic_plus_20_logo.png";

  const schema = z
    .object({
      username: z
        .string()
        .min(6, t("errors.username_invalid"))
        .max(16, t("errors.username_invalid"))
        .regex(/^[a-zA-Z0-9]+$/, t("errors.username_invalid")),
      email: z.string().email(t("errors.invalid_email")),
    });

  type FormData = z.infer<typeof schema>;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { username: "", email: "" },
  });

  const errorMap: Record<string, string> = {
    captcha_error: t("errors.captcha_error"),
    recovery_data_invalid: t("errors.recovery_data_invalid"),
    rate_limited: t("errors.rate_limited"),
  };

  function onSubmit(data: FormData) {
    startTransition(async () => {
      if (!allowRecovery) {
        toast.error("La recuperación de contraseña está deshabilitada temporalmente.");
        router.replace(loginPath);
        return;
      }

      if (!captchaToken) {
        toast.error(t("errors.captcha_error"));
        return;
      }

      const result = await requestRecoverGamePasswordAction({
        username: data.username,
        email: data.email,
        captchaToken,
        version: version === "1.0" ? 1 : 2,
        locale,
      });

      if (!result.success) {
        setCaptchaToken("");
        setCaptchaKey((v) => v + 1);
        toast.error(errorMap[result.error ?? ""] ?? result.error ?? "Error");
        return;
      }

      toast.success(t("recover_email_sent"));
      form.reset();
      setCaptchaToken("");
      setCaptchaKey((v) => v + 1);
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} alt="Conquer" className="w-36 drop-shadow-xl" />

        <p className="text-sm text-muted-foreground">
          <Link href={vp("/")} className="text-gold hover:text-gold-light transition-colors">
            {tn("home")}
          </Link>
          <span className="mx-2 text-muted-foreground/50">›</span>
          <span>{t("recover_title")}</span>
        </p>

        <div className="w-full bg-surface/90 border border-gold/20 rounded-2xl p-8 flex flex-col gap-6">
          <div className="text-center">
            <h1 className="font-bebas text-4xl tracking-widest text-gold">{t("recover_title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("recover_subtitle")}</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("username")}</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="username" className="bg-background border-surface/50" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("email")}</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" autoComplete="email" className="bg-background border-surface/50" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-center">
                <ReCAPTCHA
                  key={captchaKey}
                  sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
                  theme="light"
                  onChange={(value) => setCaptchaToken(value ?? "")}
                  onExpired={() => setCaptchaToken("")}
                />
              </div>

              <Button
                type="submit"
                disabled={isPending}
                className="mt-2 bg-gold hover:bg-gold-dark text-background font-bold h-10"
              >
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t("recover_send_button")}
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
