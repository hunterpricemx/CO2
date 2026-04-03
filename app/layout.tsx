import type { Metadata } from "next";
import { Chakra_Petch, Bebas_Neue, Poppins } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { getSiteSettings } from "@/lib/site-settings";
import { DisclaimerBanner } from "@/components/shared/DisclaimerBanner";
import "./globals.css";

const chakraPetch = Chakra_Petch({
  variable: "--font-chakra",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: "400",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const siteName    = settings.seo_site_name;
  const description = settings.seo_default_description;
  const ogImage     = settings.seo_og_image || undefined;

  return {
    title: {
      default: siteName,
      template: `%s | ${siteName}`,
    },
    description,
    keywords: ["conquer online", "private server", "classic plus", "mmorpg"],
    icons: {
      icon: "/images/icons/favicon.png",
      shortcut: "/images/icons/favicon.png",
      apple: "/images/icons/favicon.png",
    },
    openGraph: {
      type: "website",
      siteName,
      description,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();

  return (
    <html
      lang="es"
      className={`${chakraPetch.variable} ${bebasNeue.variable} ${poppins.variable} dark`}
    >
      <head>
        <link rel="preconnect" href="https://fjvadikuvcshwxikebhv.supabase.co" />
        <link rel="dns-prefetch" href="https://fjvadikuvcshwxikebhv.supabase.co" />
      </head>
      <body className="antialiased bg-background text-foreground font-chakra">
        {settings.script_head && (
          <div dangerouslySetInnerHTML={{ __html: settings.script_head }} />
        )}
        {children}
        <DisclaimerBanner />
        <Toaster richColors position="top-right" />
        {settings.script_footer && (
          <div dangerouslySetInnerHTML={{ __html: settings.script_footer }} />
        )}
      </body>
    </html>
  );
}
