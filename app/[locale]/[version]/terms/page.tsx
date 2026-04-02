import type { Metadata } from "next";
import Link from "next/link";
import { getSiteSettings, buildPageSeo } from "@/lib/site-settings";

type Props = {
  params: Promise<{ locale: string; version: string }>;
};

const COPY = {
  es: {
    title: "Terminos de Servicio",
    hero: "Terminos de Servicio",
    subtitle: "Reglas generales para el uso del sitio y del servidor",
    home: "Inicio",
    breadcrumb: "Terminos",
    sections: [
      {
        heading: "1. Cuenta y acceso",
        body: "El acceso al servidor requiere una cuenta valida. El propietario de la cuenta es responsable de mantener sus credenciales seguras y de toda actividad realizada desde su usuario.",
      },
      {
        heading: "2. Conducta del jugador",
        body: "No se permite acoso, amenazas, discriminacion, suplantacion de identidad ni uso de errores del juego con fines abusivos. El equipo puede aplicar sanciones sin previo aviso cuando corresponda.",
      },
      {
        heading: "3. Compras y donaciones",
        body: "Las compras y donaciones son voluntarias y se destinan al mantenimiento del proyecto. Los beneficios entregados son digitales y pueden ajustarse por balance o mantenimiento tecnico.",
      },
      {
        heading: "4. Cambios del servicio",
        body: "El servidor, sus tasas, eventos y sistemas pueden modificarse, pausarse o cerrarse en cualquier momento por razones tecnicas, legales o administrativas.",
      },
      {
        heading: "5. Aceptacion",
        body: "Al usar este sitio y el juego, aceptas estos terminos y las decisiones administrativas necesarias para mantener la estabilidad y seguridad de la comunidad.",
      },
    ],
    contact: "Si tienes dudas sobre estos terminos, contacta al equipo de soporte.",
  },
  en: {
    title: "Terms of Service",
    hero: "Terms of Service",
    subtitle: "General rules for using the website and game server",
    home: "Home",
    breadcrumb: "Terms",
    sections: [
      {
        heading: "1. Account and access",
        body: "Access to the server requires a valid account. The account owner is responsible for keeping credentials secure and for all activity performed through that account.",
      },
      {
        heading: "2. Player conduct",
        body: "Harassment, threats, discrimination, impersonation, and abusive exploit usage are not allowed. The team may enforce penalties without prior notice when required.",
      },
      {
        heading: "3. Purchases and donations",
        body: "Purchases and donations are voluntary and support the project. Delivered benefits are digital and may be adjusted for balance or technical maintenance.",
      },
      {
        heading: "4. Service changes",
        body: "The server, rates, events, and systems may be changed, paused, or discontinued at any time for technical, legal, or administrative reasons.",
      },
      {
        heading: "5. Acceptance",
        body: "By using this site and the game, you accept these terms and administrative decisions required to keep the community stable and secure.",
      },
    ],
    contact: "If you have questions about these terms, contact the support team.",
  },
  pt: {
    title: "Termos de Servico",
    hero: "Termos de Servico",
    subtitle: "Regras gerais para uso do site e do servidor",
    home: "Inicio",
    breadcrumb: "Termos",
    sections: [
      {
        heading: "1. Conta e acesso",
        body: "O acesso ao servidor exige uma conta valida. O titular da conta e responsavel por manter suas credenciais seguras e por toda atividade realizada pelo usuario.",
      },
      {
        heading: "2. Conduta do jogador",
        body: "Nao sao permitidos assedio, ameacas, discriminacao, personificacao ou uso abusivo de falhas do jogo. A equipe pode aplicar sancoes sem aviso previo quando necessario.",
      },
      {
        heading: "3. Compras e doacoes",
        body: "Compras e doacoes sao voluntarias e ajudam na manutencao do projeto. Beneficios entregues sao digitais e podem ser ajustados por balanceamento ou manutencao tecnica.",
      },
      {
        heading: "4. Alteracoes do servico",
        body: "O servidor, taxas, eventos e sistemas podem ser alterados, pausados ou encerrados a qualquer momento por motivos tecnicos, legais ou administrativos.",
      },
      {
        heading: "5. Aceitacao",
        body: "Ao usar este site e o jogo, voce aceita estes termos e as decisoes administrativas necessarias para manter a comunidade estavel e segura.",
      },
    ],
    contact: "Se tiver duvidas sobre estes termos, entre em contato com o suporte.",
  },
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const settings = await getSiteSettings();
  const safeLocale = locale === "en" || locale === "pt" ? locale : "es";

  return buildPageSeo(settings, "terms", COPY[safeLocale].title);
}

export default async function TermsPage({ params }: Props) {
  const { locale, version } = await params;
  const safeLocale = locale === "en" || locale === "pt" ? locale : "es";
  const copy = COPY[safeLocale];

  const homeHref = safeLocale === "es" ? `/${version}` : `/${safeLocale}/${version}`;

  return (
    <div className="flex flex-col">
      <section
        className="relative flex items-center justify-center"
        style={{
          minHeight: "34vh",
          backgroundImage: `url('/images/backgrounds/bg__main${version === "1.0" ? "10" : "20"}.jpg')`,
          backgroundSize: "cover",
          backgroundPosition: "50% 24%",
          backgroundRepeat: "no-repeat",
          paddingTop: "4rem",
          paddingBottom: "4rem",
        }}
      >
        <div className="absolute inset-0 z-0" style={{ background: "rgba(0,0,0,0.80)" }} />

        <div className="relative z-10 text-center px-4 flex flex-col items-center gap-3">
          <nav className="flex items-center gap-2 font-poppins text-sm text-white/70">
            <Link href={homeHref} className="text-[#ffd700] hover:text-[#ffed4e] transition-colors">
              {copy.home}
            </Link>
            <span>/</span>
            <span>{copy.breadcrumb}</span>
          </nav>

          <h1
            className="font-bebas tracking-widest text-white"
            style={{ fontSize: "3.2rem", textShadow: "3px 3px 10px rgba(0,0,0,0.8)", letterSpacing: "2px" }}
          >
            {copy.hero}
          </h1>

          <p className="font-poppins text-[#e0e0e0] max-w-2xl">{copy.subtitle}</p>
        </div>
      </section>

      <section className="px-4 py-12" style={{ background: "#080808" }}>
        <div className="container mx-auto max-w-4xl flex flex-col gap-6">
          {copy.sections.map((section) => (
            <article
              key={section.heading}
              className="rounded-xl p-6"
              style={{
                background: "linear-gradient(135deg, rgba(26,26,46,0.97), rgba(46,46,76,0.97))",
                border: "1px solid rgba(255,215,0,0.20)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
              }}
            >
              <h2 className="font-bebas text-2xl tracking-wider text-[#ffd700] mb-2">{section.heading}</h2>
              <p className="font-poppins text-sm leading-relaxed text-[#d7d7e4]">{section.body}</p>
            </article>
          ))}

          <p className="text-sm font-poppins text-white/60 text-center pt-2">{copy.contact}</p>
        </div>
      </section>
    </div>
  );
}
