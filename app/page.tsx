import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getSiteSettings } from "@/lib/site-settings";

export const metadata: Metadata = {
  title: "Conquer Classic Plus — Elige tu Experiencia",
};

export default async function Home() {
  const settings = await getSiteSettings();
  const logo10 = settings.logo_v1;
  const logo20 = settings.logo_v2;
  const bg10   = settings.home_bg_v1;
  const bg20   = settings.home_bg_v2;

  return (
    <>
      <style>{`
        .home-hero { height: 100vh; display: flex; overflow: hidden; }

        .home-hero-section {
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          overflow: hidden;
          background-position: center;
          background-size: 105%;
          transition: background-size 0.4s ease;
          cursor: pointer;
        }
        .home-hero-section:hover { background-size: 110%; }

        .home-hero-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.4);
          transition: background 0.4s ease;
        }
        .home-hero-section:hover .home-hero-overlay { background: rgba(0,0,0,0.2); }

        .home-hero-content {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          text-align: center;
          color: white;
          padding: 2rem;
          font-family: var(--font-chakra), "Chakra Petch", sans-serif;
        }

        .home-hero-logo-img {
          max-width: 200px;
          height: auto;
          transition: transform 0.3s ease;
        }
        .home-hero-section:hover .home-hero-logo-img { transform: scale(1.05); }

        .home-hero-server {
          font-size: 1.3rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          margin: 0;
        }

        .home-hero-title {
          font-size: 2rem;
          font-weight: 700;
          margin: 0;
          text-shadow: 2px 2px 8px rgba(0,0,0,0.5);
        }

        .home-hero-subtitle {
          font-size: 1.1rem;
          opacity: 0.9;
          margin: 0;
        }

        .home-hero-cta {
          background-image: url("/images/buttons/button_1.png");
          background-size: cover;
          width: 150px;
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 700;
          text-transform: uppercase;
          color: white;
          margin-top: 0.5rem;
          transition: transform 0.3s ease;
        }
        .home-hero-section:hover .home-hero-cta {
          transform: scale(0.9);
          background-image: url("/images/buttons/button_2.png");
        }

        @media (max-width: 768px) {
          .home-hero { flex-direction: column; }
          .home-hero-section { min-height: 50vh; }
          .home-hero-title { font-size: 1.5rem; }
          .home-hero-subtitle { font-size: 0.85rem; }
          .home-hero-server { font-size: 1rem; margin-bottom: 5px; }
        }
      `}</style>

      <main className="home-hero">
        {/* LEFT — /1.0 */}
        <Link
          href="/1.0"
          className="home-hero-section"
          style={{ backgroundImage: `url('${bg10}')` }}
        >
          <div className="home-hero-overlay" />
          <div className="home-hero-content">
            <Image
              src={logo10}
              alt="Conquer Classic Plus 1.0"
              width={200}
              height={100}
              className="home-hero-logo-img"
              priority
            />
            <p className="home-hero-server">2.0 EVOLUTION</p>
            <h1 className="home-hero-title">CONQUER CLASSIC PLUS EVOLUTION</h1>
            <span className="home-hero-cta">ENTRAR</span>
          </div>
        </Link>

        {/* RIGHT — /2.0 */}
        <Link
          href="/2.0"
          className="home-hero-section"
          style={{ backgroundImage: `url('${bg20}')` }}
        >
          <div className="home-hero-overlay" />
          <div className="home-hero-content">
            <Image
              src={logo20}
              alt="Conquer Classic Plus 2.0"
              width={200}
              height={100}
              className="home-hero-logo-img"
              priority
            />
            <p className="home-hero-server">SERVER 2.0</p>
            <h1 className="home-hero-title">CONQUER CLASSIC PLUS 2.0</h1>
            <span className="home-hero-cta">ENTRAR</span>
          </div>
        </Link>
      </main>
    </>
  );
}
