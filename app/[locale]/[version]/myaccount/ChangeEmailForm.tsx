"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useTransition } from "react";
import { Eye, EyeOff, Loader2, Mail, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { changeEmailAction } from "@/modules/auth/actions";
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
import { useParams } from "next/navigation";

export function ChangeEmailForm({ currentEmail }: { currentEmail: string }) {
  const t = useTranslations("myaccount");
  const ta = useTranslations("auth");
  const { version } = useParams() as { version: string };
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const schema = z.object({
    currentEmail: z.string().min(1, t("errors.required")).email(ta("errors.invalid_email")),
    currentPassword: z.string().min(1, t("errors.required")),
    newEmail: z.string().email(ta("errors.invalid_email")),
  });

  type FormData = z.infer<typeof schema>;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { currentEmail: "", currentPassword: "", newEmail: "" },
  });

  function onSubmit({ currentEmail, currentPassword, newEmail }: FormData) {
    if (newEmail === currentEmail) {
      form.setError("newEmail", { message: t("errors.same_email") });
      return;
    }
    startTransition(async () => {
      const versionNum = version === "1.0" ? 1 : 2;
      const result = await changeEmailAction({ currentEmail, currentPassword, newEmail, version: versionNum });
      if (result.success) {
        toast.success(t("email_changed"));
        form.reset();
        setOpen(false);
      } else {
        const msg =
          result.error === "wrong_password"
            ? t("errors.wrong_password")
            : result.error === "wrong_current_email"
              ? t("errors.wrong_current_email")
              : result.error === "rate_limited"
                ? t("errors.rate_limited")
                : result.error === "invalid_email"
                  ? ta("errors.invalid_email")
                  : t("errors.unknown_error");
        toast.error(msg);
      }
    });
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(26,26,26,0.9)", border: "1px solid rgba(255,215,0,0.2)" }}
    >
      {/* Header / toggle button */}
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); form.reset(); }}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Mail className="h-5 w-5 text-gold/70" />
          <span className="font-bebas text-xl tracking-widest text-gold">{t("change_email_title")}</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-white/40" /> : <ChevronDown className="h-4 w-4 text-white/40" />}
      </button>

      {/* Collapsible form */}
      {open && (
        <div className="px-6 pb-6 flex flex-col gap-4 border-t border-white/10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
              {/* Current Email (validation) */}
              <FormField
                control={form.control}
                name="currentEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70">{t("current_email_label")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="tu@correo.com"
                        className="bg-background border-surface/50"
                        autoComplete="email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* New Email */}
              <FormField
                control={form.control}
                name="newEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70">{t("new_email")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="nuevo@email.com"
                        className="bg-background border-surface/50"
                        autoComplete="email"
                        autoFocus
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Current password to confirm identity */}
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70">{t("current_password")}</FormLabel>
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
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-1">
                <Button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 bg-gold hover:bg-gold-dark text-background font-bold h-10"
                >
                  {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t("save_changes")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setOpen(false); form.reset(); }}
                  className="border-white/20 text-white/60 hover:text-white"
                >
                  {t("cancel")}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}
    </div>
  );
}
