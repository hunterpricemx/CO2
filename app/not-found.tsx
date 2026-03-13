import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "404 – Página no encontrada | Conquer Classic Plus",
};

export default function NotFound() {
  return (
    <>
      <style>{`
        .nf-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          background: #1a1a1a;
          font-family: var(--font-chakra), "Chakra Petch", sans-serif;
        }

        /* Background image with dark overlay */
        .nf-bg {
          position: absolute;
          inset: 0;
          background-image: url('/images/backgrounds/bg__main10.jpg');
          background-size: cover;
          background-position: center;
          filter: brightness(0.2) saturate(0.6);
          z-index: 0;
        }

        .nf-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 1.25rem;
          padding: 2rem;
          max-width: 600px;
        }

        .nf-code {
          font-family: var(--font-bebas), "Bebas Neue", sans-serif;
          font-size: clamp(7rem, 20vw, 12rem);
          line-height: 1;
          color: transparent;
          -webkit-text-stroke: 2px #f39c12;
          text-shadow:
            0 0 40px rgba(243,156,18,0.4),
            0 0 80px rgba(243,156,18,0.15);
          letter-spacing: 0.05em;
          user-select: none;
        }

        .nf-title {
          font-family: var(--font-bebas), "Bebas Neue", sans-serif;
          font-size: clamp(1.4rem, 4vw, 2rem);
          color: #ffffff;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .nf-desc {
          font-size: 0.9rem;
          color: #aaaaaa;
          line-height: 1.6;
        }

        .nf-divider {
          width: 60px;
          height: 2px;
          background: linear-gradient(90deg, transparent, #f39c12, transparent);
          border: none;
          margin: 0.25rem 0;
        }

        .nf-links {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          justify-content: center;
          margin-top: 0.5rem;
        }

        .nf-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.6rem;
          background: #f39c12;
          color: #1a1a1a;
          font-family: var(--font-chakra), sans-serif;
          font-weight: 700;
          font-size: 0.875rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-decoration: none;
          border-radius: 4px;
          transition: background 0.2s, transform 0.15s;
        }
        .nf-btn-primary:hover {
          background: #e67e22;
          transform: translateY(-1px);
        }

        .nf-btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.6rem;
          border: 1px solid rgba(243,156,18,0.4);
          color: #f39c12;
          font-family: var(--font-chakra), sans-serif;
          font-size: 0.875rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-decoration: none;
          border-radius: 4px;
          transition: background 0.2s, border-color 0.2s, transform 0.15s;
        }
        .nf-btn-ghost:hover {
          background: rgba(243,156,18,0.08);
          border-color: #f39c12;
          transform: translateY(-1px);
        }

        .nf-logo {
          margin-bottom: 0.5rem;
          opacity: 0.9;
        }
      `}</style>

      <div className="nf-root">
        <div className="nf-bg" aria-hidden="true" />

        <div className="nf-content">
          <Link href="/" className="nf-logo">
            <Image
              src="/images/logos/conquer_classic_plus_10_logo.png"
              alt="Conquer Classic Plus"
              width={150}
              height={60}
              style={{ height: "auto" }}
              priority
            />
          </Link>

          <div className="nf-code">404</div>

          <h1 className="nf-title">Página no encontrada</h1>

          <hr className="nf-divider" />

          <p className="nf-desc">
            El destino al que intentas llegar no existe o fue eliminado.<br />
            Regresa al reino y retoma tu aventura.
          </p>

          <div className="nf-links">
            <Link href="/1.0" className="nf-btn-primary">
              ⚔ Server 1.0
            </Link>
            <Link href="/2.0" className="nf-btn-primary">
              ⚔ Server 2.0
            </Link>
            <Link href="/" className="nf-btn-ghost">
              ← Inicio
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
