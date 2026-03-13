import Link from "next/link";
import { CheckCircle2, MapPin, MessageCircle } from "lucide-react";

type Props = { params: Promise<{ locale: string; version: string }> };

export default async function DonateSuccessPage({ params }: Props) {
  const { locale, version } = await params;
  const homeHref   = locale === "es" ? `/${version}` : `/${locale}/${version}`;
  const donateHref = locale === "es" ? `/${version}/donate` : `/${locale}/${version}/donate`;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center space-y-6">

        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">¡Pago exitoso!</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Tu donación fue procesada correctamente. Tus CPs ya están listos para acreditar en el juego.
          </p>
        </div>

        {/* NPC instructions */}
        <div className="bg-[#111] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 text-left space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
            <MapPin className="w-4 h-4 shrink-0" />
            Cómo reclamar tus CPs
          </div>
          <ol className="text-sm text-gray-400 leading-relaxed space-y-2 list-decimal list-inside">
            <li>Entra al juego con tu personaje</li>
            <li>Ve al mercado y busca el <span className="text-white font-medium">Premio NPC</span> (185, 170)</li>
            <li>Habla con el NPC y elige <span className="text-white font-medium">&quot;Acreditar donación&quot;</span></li>
            <li>Si tienes un código de influencer, ingrésalo para recibir CPs extra</li>
            <li>¡Listo! Los CPs se acreditan al instante</li>
          </ol>
        </div>

        {/* Discord note */}
        <div className="flex items-start gap-3 bg-[#5865f2]/10 border border-[#5865f2]/25 rounded-xl px-4 py-3 text-left">
          <MessageCircle className="w-4 h-4 text-[#7289da] shrink-0 mt-0.5" />
          <p className="text-sm text-gray-400">
            ¿Problemas? Contáctanos en Discord o abre un ticket en el sitio y te ayudamos de inmediato.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Link
            href={donateHref}
            className="flex-1 py-2.5 rounded-xl border border-[rgba(255,255,255,0.1)] text-sm text-gray-400 hover:text-white hover:border-[rgba(255,255,255,0.25)] transition-colors text-center"
          >
            Volver a Donar
          </Link>
          <Link
            href={homeHref}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition-colors text-center"
          >
            Ir al Inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
