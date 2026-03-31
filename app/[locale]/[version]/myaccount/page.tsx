import { getGameSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getSiteSettings, getVersionAssets } from "@/lib/site-settings";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { Metadata } from "next";
import { LogoutButton } from "@/components/shared/LogoutButton";
import { getGameDb } from "@/lib/game-db";
import type { RowDataPacket } from "mysql2";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { ChangeEmailForm } from "./ChangeEmailForm";
import { Coins, ArrowLeftRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Mi Cuenta",
};

function meshToClassKey(mesh: number): string {
  if (mesh === 1003 || mesh === 1004) return "class_trojan";
  if (mesh === 1005 || mesh === 1006) return "class_warrior";
  if (mesh === 2001 || mesh === 2002) return "class_archer";
  if (mesh === 2003 || mesh === 2004) return "class_ninja";
  if (mesh === 1007) return "class_monk";
  return "class_unknown";
}

function meshToGender(mesh: number): "male" | "female" {
  return mesh === 1007 ? "male" : mesh % 2 === 0 ? "female" : "male";
}

const VIP_BADGE: Record<number, string> = {
  0: "bg-gray-800/40 text-gray-400 border-gray-600/40",
  1: "bg-amber-900/30 text-amber-500 border-amber-600/50",
  2: "bg-sky-900/30 text-sky-400 border-sky-500/50",
  3: "bg-emerald-900/30 text-emerald-400 border-emerald-500/50",
  4: "bg-purple-900/30 text-purple-400 border-purple-500/50",
  5: "bg-orange-900/30 text-orange-400 border-orange-500/50",
  6: "bg-yellow-900/20 text-[#ffd700] border-yellow-500/50",
};

export default async function MyAccountPage({
  params,
}: {
  params: Promise<{ locale: string; version: string }>;
}) {
  const { locale, version } = await params;
  const t = await getTranslations("myaccount");
  const tn = await getTranslations("nav");

  const session = await getGameSession();

  const loginHref = `/${locale === "es" ? "" : locale + "/"}${version}/login?next=/${locale === "es" ? "" : locale + "/"}${version}/myaccount`;

  if (!session) redirect(loginHref);

  const { heroBg, logoSrc } = getVersionAssets(await getSiteSettings(), version);
  const homeHref = `/${locale === "es" ? "" : locale + "/"}${version}`;

  type CharData = {
    Name: string; Level: number; Reborn: number; CPs: number;
    Money: number; MoneySave: number; GuildName: string | null; Mesh: number;
    PKPoints: number; MetScrolls: number; Strength: number; Agility: number;
    Vitality: number; Spirit: number; Additional: number;
    Spouse: string | null; Status: number; VipLevel: number | null;
  };

  let character: CharData | null = null;
  let creationDate: string | null = null;

  try {
    const vNum = version === "1.0" ? 1 as const : 2 as const;
    const { conn, config } = await getGameDb(vNum);
    try {
      const charTable = config.table_characters;

      const [charRows] = await conn.execute<RowDataPacket[]>(
        `SELECT Name, Level, Reborn, CPs, Money, MoneySave, GuildName, Mesh, PKPoints, MetScrolls, Strength, Agility, Vitality, Spirit, Additional, Spouse, Status, VipLevel FROM \`${charTable}\` WHERE EntityID = ? LIMIT 1`,
        [session.uid],
      );
      if (charRows.length > 0) character = charRows[0] as CharData;

      const [accRows] = await conn.execute<RowDataPacket[]>(
        `SELECT Creation FROM \`${config.table_accounts}\` WHERE EntityID = ? LIMIT 1`,
        [session.uid],
      );
      if (accRows.length > 0 && accRows[0].Creation) {
        creationDate = new Date(accRows[0].Creation as Date).toLocaleDateString(
          locale === "es" ? "es-ES" : locale === "pt" ? "pt-BR" : "en-US",
          { year: "numeric", month: "long", day: "numeric" },
        );
      }
    } finally {
      await conn.end();
    }
  } catch {
    // DB may not be reachable; show page without character data
  }

  const vipLevel = character?.VipLevel ?? 0;

  const classNames: Record<string, string> = {
    class_trojan: t("class_trojan"),
    class_warrior: t("class_warrior"),
    class_archer: t("class_archer"),
    class_ninja: t("class_ninja"),
    class_monk: t("class_monk"),
    class_unknown: t("class_unknown"),
  };
  const classKey = character ? meshToClassKey(character.Mesh) : null;
  const className = classKey ? classNames[classKey] : null;

  return (
    <div className="flex flex-col">
      {/* ── Hero ── */}
      <section
        className="relative flex flex-col items-center justify-end overflow-hidden"
        style={{ minHeight: "320px" }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url('${heroBg}')`,
            backgroundSize: "cover",
            backgroundPosition: "50% 24%",
          }}
        />
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.80)" }} />

        <div className="relative z-10 flex flex-col items-center gap-3 pb-10 text-center px-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="Conquer" className="w-36 drop-shadow-xl mb-2" />
          <p className="text-sm">
            <Link href={homeHref} className="text-gold hover:text-gold-light transition-colors">
              {tn("home")}
            </Link>
            <span className="mx-2 text-white/40">›</span>
            <span className="text-white/70">{t("title")}</span>
          </p>
          <h1
            className="font-bebas uppercase tracking-widest text-white leading-none"
            style={{ fontSize: "3.5rem" }}
          >
            {session.username}
          </h1>
          <p className="font-poppins text-white/70 text-base">{t("subtitle")}</p>
        </div>
      </section>

      {/* ── Content ── */}
      <section className="px-4 py-12" style={{ background: "#080808", minHeight: "50vh" }}>
        <div className="container mx-auto max-w-3xl flex flex-col gap-6">

          {/* Character + Account info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Character card */}
            <div
              className="rounded-2xl p-6 flex flex-col gap-4"
              style={{ background: "rgba(26,26,26,0.9)", border: "1px solid rgba(255,215,0,0.2)" }}
            >
              <h2 className="font-bebas text-2xl tracking-widest text-gold">{t("char_title")}</h2>

              {character ? (
                <>
                  {/* Class badge + name */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bebas text-xl shrink-0">
                      {className?.charAt(0) ?? "?"}
                    </div>
                    <div>
                      <p className="text-white font-bold text-lg leading-tight">{character.Name}</p>
                      <p className="text-gold/70 text-sm">{className}</p>
                    </div>
                  </div>

                  {/* Status + Level */}
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      character.Status > 0
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    }`}>
                      {character.Status > 0 ? t("char_status_online") : t("char_status_offline")}
                    </span>
                    <span className="text-white/50 text-sm">
                      Lv. <span className="text-white font-bold">{character.Level}</span>
                      {character.Reborn > 0 && (
                        <span className="ml-2 text-gold text-xs">×{character.Reborn} RB</span>
                      )}
                    </span>
                  </div>

                  {/* Info rows */}
                  <div className="flex flex-col gap-0 font-poppins text-sm">
                    <div className="flex justify-between items-center py-2 border-b border-white/10">
                      <span className="text-white/50">{t("char_cps")}</span>
                      <span className="text-white font-semibold">{character.CPs.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/10">
                      <span className="text-white/50">{t("char_spouse")}</span>
                      <span className="text-white/80">
                        {character.Spouse ?? <span className="text-white/30 italic">{t("char_no_spouse")}</span>}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-white/50">{t("char_guild")}</span>
                      <span className="text-white/80">
                        {character.GuildName ?? <span className="text-white/30 italic">{t("no_guild")}</span>}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-white/40 text-sm italic">{t("char_not_found")}</p>
              )}
            </div>

            {/* Account info card */}
            <div
              className="rounded-2xl p-6 flex flex-col gap-4"
              style={{ background: "rgba(26,26,26,0.9)", border: "1px solid rgba(255,215,0,0.2)" }}
            >
              <h2 className="font-bebas text-2xl tracking-widest text-gold">{t("account_info")}</h2>
              <div className="flex flex-col gap-1 font-poppins text-sm">
                <div className="flex justify-between items-center py-2 border-b border-white/10">
                  <span className="text-white/60">{t("profile")}</span>
                  <span className="text-gold font-semibold">{session.username}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/10">
                  <span className="text-white/60">VIP</span>
                  <Link
                    href={`${homeHref}/vip`}
                    className={`text-xs font-bold px-2.5 py-1 rounded-full border font-poppins transition-opacity hover:opacity-80 ${VIP_BADGE[vipLevel]}`}
                  >
                    {vipLevel === 0 ? "Sin VIP" : `VIP ${vipLevel}`}
                  </Link>
                </div>
                {creationDate && (
                  <div className="flex justify-between items-center py-2 border-b border-white/10">
                    <span className="text-white/60">{t("member_since")}</span>
                    <span className="text-white/80 text-xs text-right">{creationDate}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2">
                  <span className="text-white/60">ID</span>
                  <span className="text-white/40 text-xs font-mono">#{session.uid}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Character details card */}
          {character && (
            <div
              className="rounded-2xl p-6"
              style={{ background: "rgba(26,26,26,0.9)", border: "1px solid rgba(255,215,0,0.2)" }}
            >
              <h2 className="font-bebas text-2xl tracking-widest text-gold mb-4">{t("char_details")}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* General */}
                <div>
                  <h3 className="font-bebas text-sm tracking-widest text-white/30 uppercase mb-1">{t("char_general")}</h3>
                  {[
                    { label: t("char_gender"), value: meshToGender(character.Mesh) === "female" ? t("char_gender_female") : t("char_gender_male") },
                    { label: t("char_pkpoints"), value: `${character.PKPoints} PK` },
                    { label: t("char_reborn"), value: character.Reborn === 0 ? t("char_reborn_no") : `×${character.Reborn}` },
                    { label: t("char_gold"), value: character.Money.toLocaleString() },
                    { label: t("char_money_save"), value: character.MoneySave.toLocaleString() },
                    { label: t("char_scrolls"), value: String(character.MetScrolls) },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center py-2 border-b border-white/10">
                      <span className="text-white/50 text-sm">{label}</span>
                      <span className="text-white font-semibold text-sm">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Atributos */}
                <div>
                  <h3 className="font-bebas text-sm tracking-widest text-white/30 uppercase mb-1">{t("char_attributes")}</h3>
                  {[
                    { label: t("char_strength"), value: character.Strength },
                    { label: t("char_agility"), value: character.Agility },
                    { label: t("char_vitality"), value: character.Vitality },
                    { label: t("char_spirit"), value: character.Spirit },
                    { label: t("char_additional"), value: character.Additional },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center py-2 border-b border-white/10">
                      <span className="text-white/50 text-sm">{label}</span>
                      <span className="text-white font-semibold text-sm">{value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          )}

          {/* Settings section */}
          <div className="flex flex-col gap-3">
            <h2 className="font-bebas text-lg tracking-widest text-white/40 uppercase px-1">{t("settings_title")}</h2>
            <ChangePasswordForm />
            <ChangeEmailForm currentEmail={session.email} />
          </div>

          {/* Actions row */}
          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <Link
              href={`${homeHref}/donate`}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-gold hover:bg-gold-dark text-background transition-colors shadow-lg"
            >
              <Coins className="h-4 w-4" />
              {t("donate_cta")}
            </Link>
            <Link
              href={`${homeHref}/trade`}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm border border-gold/40 text-gold hover:bg-gold/10 transition-colors"
            >
              <ArrowLeftRight className="h-4 w-4" />
              {t("trade_log")}
            </Link>
            <div className="flex-1">
              <LogoutButton label={t("logout")} className="w-full justify-center" />
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
