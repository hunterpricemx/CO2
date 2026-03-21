import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/**
 * Next.js configuration for Conquer Classic Plus web app.
 *
 * Integrations:
 * - next-intl: internationalisation (ES / EN / PT)
 * - Supabase storage: remote image domain allowed
 */
const nextConfig: NextConfig = {
  serverExternalPackages: ["mysql2"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fjvadikuvcshwxikebhv.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
