"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useTransition } from "react";
import { Eye, EyeOff, Loader2, KeyRound, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { changePasswordAction } from "@/modules/auth/actions";
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

export function ChangePasswordForm() {
  const t = useTranslations("myaccount");
  const ta = useTranslations("auth");
  const { version } = useParams() as { version: string };
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const schema = z
    .object({
      currentPassword: z.string().min(1, t("errors.required")),
      newPassword: z
        .string()
        .min(6, ta("errors.weak_password"))
        .max(16, ta("errors.weak_password"))
        .regex(/^[a-zA-Z0-9]+$/, ta("errors.password_invalid")),
      confirmPassword: z.string(),
    })
    .refine((d) => d.newPassword === d.confirmPassword, {
      path: ["confirmPassword"],
      message: ta("errors.password_mismatch"),
    });

  type FormData = z.infer<typeof schema>;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const newPasswordValue = form.watch("newPassword");
  const confirmValue = form.watch("confirmPassword");

  function onSubmit({ currentPassword, newPassword }: FormData) {
    startTransition(async () => {
      const versionNum = version === "1.0" ? 1 : 2;
      const result = await changePasswordAction({ currentPassword, newPassword, version: versionNum });
      if (result.success) {
        toast.success(t("password_changed"));
        form.reset();
        setOpen(false);
      } else {
        const msg =
          result.error === "wrong_password"
            ? t("errors.wrong_password")
            : result.error === "weak_password"
              ? ta("errors.weak_password")
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
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); form.reset(); }}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <KeyRound className="h-5 w-5 text-gold/70" />
          <span className="font-bebas text-xl tracking-widest text-gold">{t("change_password_title")}</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-white/40" /> : <ChevronDown className="h-4 w-4 text-white/40" />}
      </button>

      {open && (
        <div className="px-6 pb-6 flex flex-col gap-4 border-t border-white/10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 pt-4">
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70">{t("current_password")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input {...field} type={showCurrent ? "text" : "password"} placeholder="xxxxxxxxxx"
                          className="bg-background border-surface/50 pr-10" autoComplete="current-password" autoFocus />
                        <button type="button" onClick={() => setShowCurrent((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors" tabIndex={-1}>
                          {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70">{t("new_password")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input {...field} type={showNew ? "text" : "password"} placeholder="xxxxxxxxxx"
                          className="bg-background border-surface/50 pr-10" autoComplete="new-password" />
                        <button type="button" onClick={() => setShowNew((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors" tabIndex={-1}>
                          {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    {newPasswordValue.length > 0 && (
                      <div className="flex flex-col gap-0.5 mt-1">
                        {[
                          { ok: newPasswordValue.length >= 6 && newPasswordValue.length <= 16, label: ta("password_check_length") },
                          { ok: /^[a-zA-Z0-9]+$/.test(newPasswordValue), label: ta("password_check_alpha") },
                        ].map(({ ok, label }) => (
                          <span key={label} className={`text-xs flex items-center gap-1 ${ok ? "text-green-400" : "text-red-400/80"}`}>
                            {ok ? "checkmark" : "cross"} {label}
                          </span>
                        ))}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70">{t("confirm_new_password")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input {...field} type={showConfirm ? "text" : "password"} placeholder="xxxxxxxxxx"
                          className="bg-background border-surface/50 pr-10" autoComplete="new-password" />
                        <button type="button" onClick={() => setShowConfirm((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors" tabIndex={-1}>
                          {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    {confirmValue.length > 0 && (
                      <p className={`text-xs mt-0.5 ${newPasswordValue === confirmValue ? "text-green-400" : "text-red-400/80"}`}>
                        {newPasswordValue === confirmValue ? ta("passwords_match") : ta("errors.password_mismatch")}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-1">
                <Button type="submit" disabled={isPending}
                  className="flex-1 bg-gold hover:bg-gold-dark text-background font-bold h-10">
                  {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t("save_changes")}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setOpen(false); form.reset(); }}
                  className="border-white/20 text-white/60 hover:text-white">
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
