import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { getSiteSettings, getVersionAssets, buildPageSeo } from "@/lib/site-settings";
import type { Metadata } from "next";
import { getGameSession } from "@/lib/session";
import { getPublicPaymentConfig, getDonationPackages, getCharacterName } from "@/lib/game-db";
import { DonateClient } from "@/components/shared/DonateClient";
import type { DonateLabels } from "@/components/shared/DonateClient";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return buildPageSeo(settings, "donate", "Donar");
}

type Props = { params: Promise<{ locale: string; version: string }> };

export default async function DonatePage({ params }: Props) {
  const { locale, version } = await params;
  const t = await getTranslations("donate");

  // ── Auth check (server-side) ──────────────────────────────────────────────
  const session = await getGameSession();
  const isLoggedIn = !!session;
  const versionNum = version === "1.0" ? 1 : 2;
  const [paymentConfig, packages, characterName] = await Promise.all([
    getPublicPaymentConfig(),
    getDonationPackages(versionNum),
    session ? getCharacterName(session.uid, versionNum) : Promise.resolve(null),
  ]);

  // Build login URL preserving the return destination
  const returnPath =
    locale === "es" ? `/${version}/donate` : `/${locale}/${version}/donate`;
  const loginHref =
    locale === "es"
      ? `/${version}/login?next=${encodeURIComponent(returnPath)}`
      : `/${locale}/${version}/login?next=${encodeURIComponent(returnPath)}`;

  // ── Hero background / logo per version ───────────────────────────────────
  const { heroBg, logoSrc } = getVersionAssets(await getSiteSettings(), version);

  const homeHref = locale === "es" ? `/${version}` : `/${locale}/${version}`;

  // ── Pass all i18n strings to the client component ─────────────────────────
  const labels: DonateLabels = {
    packages_title:    t("packages_title"),
    packages_subtitle: t("packages_subtitle"),
    cp_points:         t("cp_points"),
    btn_buy:           t("btn_buy"),
    badge_popular:     t("badge_popular"),
    badge_best_value:  t("badge_best_value"),
    login_required:    t("login_required"),
    login_link:        t("login_link"),
    npc_title:         t("npc_title"),
    npc_text:          t("npc_text"),
    npc_caption:       t("npc_caption"),
    problem_title:     t("problem_title"),
    problem_text:      t("problem_text"),
    policy_title:      t("policy_title"),
    policy_subtitle:   t("policy_subtitle"),
    policy_1:          t("policy_1"),
    policy_2:          t("policy_2"),
    policy_3:          t("policy_3"),
    policy_4:          t("policy_4"),
    policy_5:          t("policy_5"),
    policy_accept:     t("policy_accept"),
    policy_cancel:     t("policy_cancel"),
    checkout_title:    t("checkout_title"),
    checkout_text:     t("checkout_text"),
    checkout_close:    t("checkout_close"),
    no_payment_methods:      t("no_payment_methods"),
    tebex_pay:               t("tebex_pay"),
    tebex_processing:        t("tebex_processing"),
    stripe_test_mode_notice: t("stripe_test_mode_notice"),
    char_name_label:         t("char_name_label"),
    char_name_placeholder:   t("char_name_placeholder"),
    char_name_required:      t("char_name_required"),
    stripe_pay:              t("stripe_pay"),
    stripe_processing:       t("stripe_processing"),
    checkout_confirm:        t("checkout_confirm"),
  };

  return (
    <div className="flex flex-col">

      {/* ═══════════════════════ HERO ═══════════════════════ */}
      <section
        className="relative flex items-center justify-center"
        style={{
          minHeight: "40vh",
          backgroundImage: `url('${heroBg}')`,
          backgroundSize: "cover",
          backgroundPosition: "50% 24%",
          backgroundRepeat: "no-repeat",
          paddingTop: "4rem",
          paddingBottom: "4rem",
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 z-0" style={{ background: "rgba(0,0,0,0.80)" }} />

        {/* Content */}
        <div className="relative z-10 text-center px-4 flex flex-col items-center gap-4">
          {/* Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt={`Conquer ${version}`}
            className="w-36 h-auto mb-2 drop-shadow-xl"
          />

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 font-poppins text-sm text-white/70">
            <Link href={homeHref} className="text-[#ffd700] hover:text-[#ffed4e] transition-colors">
              {t("breadcrumb_home")}
            </Link>
            <span>/</span>
            <span>{t("breadcrumb_donate")}</span>
          </nav>

          {/* Title */}
          <h1
            className="font-bebas tracking-widest text-white"
            style={{ fontSize: "3.5rem", textShadow: "3px 3px 10px rgba(0,0,0,0.8)", letterSpacing: "3px" }}
          >
            {t("hero_title")}
          </h1>

          {/* Subtitle */}
          <p
            className="font-poppins text-[#e0e0e0]"
            style={{ fontSize: "1.1rem", textShadow: "2px 2px 8px rgba(0,0,0,0.8)" }}
          >
            {t("hero_subtitle")}
          </p>

          {/* History link — only show when logged in */}
          {isLoggedIn && (
            <Link
              href={locale === "es" ? `/${version}/donate/history` : `/${locale}/${version}/donate/history`}
              className="font-poppins text-xs text-[#ffd700]/70 hover:text-[#ffd700] transition-colors underline underline-offset-2"
            >
              {t("history_link")}
            </Link>
          )}
        </div>
      </section>

      {/* ═══════════════════════ PACKAGES + INTERACTIVE ═══════════════════════ */}
      <DonateClient
        isLoggedIn={isLoggedIn}
        loginHref={loginHref}
        labels={labels}
        paymentConfig={paymentConfig}
        packages={packages}
        version={version}
        locale={locale}
        sessionUsername={characterName ?? session?.username ?? ""}
        accountUsername={session?.username ?? ""}
      />
    </div>
  );
}
