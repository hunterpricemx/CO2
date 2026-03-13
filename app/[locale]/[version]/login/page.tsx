"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { gameLoginAction } from "@/modules/auth/actions";
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
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useTransition, useState } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(4),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { locale, version } = useParams() as { locale: string; version: string };
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("auth");
  const tn = useTranslations("nav");
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);

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

  const errorMap: Record<string, string> = {
    invalid_credentials: t("errors.invalid_credentials"),
    account_banned: t("errors.account_banned"),
  };

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", password: "" },
  });

  function onSubmit(data: FormData) {
    startTransition(async () => {
      const result = await gameLoginAction(data);
      if (!result.success) {
        toast.error(errorMap[result.error ?? ""] ?? result.error ?? "Error");
        return;
      }
      const next = searchParams.get("next");
      router.push(next ?? vp("/"));
      router.refresh();
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

      <div className="relative z-10 flex flex-col items-center gap-5 w-full max-w-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} alt="Conquer" className="w-36 drop-shadow-xl" />

        <p className="text-sm text-muted-foreground">
          <Link href={vp("/")} className="text-gold hover:text-gold-light transition-colors">
            {tn("home")}
          </Link>
          <span className="mx-2 text-muted-foreground/50">›</span>
          <span>{t("login_title")}</span>
        </p>

        <div className="w-full bg-surface/90 border border-gold/20 rounded-2xl p-8 flex flex-col gap-6">
          <div className="text-center">
            <h1 className="font-bebas text-4xl tracking-widest text-gold">
              {t("login_title")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("login_subtitle")}
            </p>
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
                      <Input
                        {...field}
                        placeholder="GuerreroDeLuz"
                        className="bg-background border-surface/50"
                        autoComplete="username"
                        autoFocus
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                          autoComplete="current-password"
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
              <Button
                type="submit"
                disabled={isPending}
                className="mt-2 bg-gold hover:bg-gold-dark text-background font-bold h-10"
              >
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t("login_button")}
              </Button>
            </form>
          </Form>

          <p className="text-center text-xs text-muted-foreground">
            {t("no_account")}{" "}
            <Link
              href={vp("/register")}
              className="text-gold hover:text-gold-light transition-colors font-medium"
            >
              {t("register_link")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
