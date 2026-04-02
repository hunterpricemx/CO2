"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Save, Code, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ImageUploadField from "@/components/admin/ImageUploadField";
import type { PromoSlide } from "@/lib/site-settings";

const FIELD_CLS =
  "bg-[#0f0503] border border-[rgba(255,215,0,0.15)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f39c12] transition-colors w-full";

type SettingsMap = Record<string, string>;

function sectionCard({ children }: { children: React.ReactNode }) {
  return children;
}
void sectionCard;

export default function AdminSiteSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Logos
  const [logoV1, setLogoV1] = useState<string | null>(null);
  const [logoV2, setLogoV2] = useState<string | null>(null);

  // Backgrounds (páginas internas)
  const [bgV1, setBgV1] = useState<string | null>(null);
  const [bgV2, setBgV2] = useState<string | null>(null);

  // Backgrounds (home / landing)
  const [homeBgV1, setHomeBgV1] = useState<string | null>(null);
  const [homeBgV2, setHomeBgV2] = useState<string | null>(null);

  // Community links
  const [discordUrlV1, setDiscordUrlV1] = useState("");
  const [discordUrlV2, setDiscordUrlV2] = useState("");

  // Home videos
  const [videoV1, setVideoV1] = useState("");
  const [videoV2, setVideoV2] = useState("");

  // Promo slides
  const [slidesV1, setSlidesV1] = useState<PromoSlide[]>([]);
  const [slidesV2, setSlidesV2] = useState<PromoSlide[]>([]);

  // Custom scripts
  const [scriptHead, setScriptHead] = useState("");
  const [scriptFooter, setScriptFooter] = useState("");

  // Soporte
  const [supportEmail, setSupportEmail] = useState("");
  const [ticketsEnabled, setTicketsEnabled] = useState(false);
  const [garmentsEnabled, setGarmentsEnabled] = useState(false);
  const [garmentsWhatsappUrl, setGarmentsWhatsappUrl] = useState("");

  // SMTP test
  const [smtpTestEmail, setSmtpTestEmail] = useState("mariano@hunterprice.mx");
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{
    ok: boolean;
    message: string;
    at: string;
    debug?: unknown;
  } | null>(null);


  /* ── Load current settings ── */
  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data } = await (supabase as unknown as {
          from: (t: string) => { select: (c: string) => Promise<{ data: SettingsMap[] | null }> };
        })
          .from("site_settings")
          .select("key, value");

        if (!data) return;

        const map: SettingsMap = Object.fromEntries(
          data.map((r) => [r.key, r.value ?? ""]),
        );

        setLogoV1(map.logo_v1 || "/images/logos/conquer_classic_plus_10_logo.png");
        setLogoV2(map.logo_v2 || "/images/logos/conquer_classic_plus_20_logo.png");
        setBgV1(map.hero_bg_v1 || "/images/backgrounds/bg__main10.jpg");
        setBgV2(map.hero_bg_v2 || "/images/backgrounds/bg__main20.jpg");
        setHomeBgV1(map.home_bg_v1 || "/images/backgrounds/bh__home10.png");
        setHomeBgV2(map.home_bg_v2 || "/images/backgrounds/bh__home20.png");
        setDiscordUrlV1(map.discord_url_v1 || "");
        setDiscordUrlV2(map.discord_url_v2 || "");
        setVideoV1(map.home_video_url_v1 || "");
        setVideoV2(map.home_video_url_v2 || "");
        try { setSlidesV1(JSON.parse(map.promo_slides_v1 || "[]")); } catch { setSlidesV1([]); }
        try { setSlidesV2(JSON.parse(map.promo_slides_v2 || "[]")); } catch { setSlidesV2([]); }
        setScriptHead(map.script_head || "");
        setScriptFooter(map.script_footer || "");
        setSupportEmail(map.support_notification_email || "");
        setTicketsEnabled(map.tickets_enabled === "true");
        setGarmentsEnabled(map.garments_enabled === "true");
        setGarmentsWhatsappUrl(map.garments_whatsapp_url || "");

      } catch {
        toast.error("No se pudieron cargar los ajustes actuales.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /* ── Save helper ── */
  async function save(entries: { key: string; value: string }[]) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      if (!res.ok) throw new Error("Error guardando");
      toast.success("Ajustes guardados correctamente.");
    } catch {
      toast.error("No se pudieron guardar los ajustes.");
    } finally {
      setSaving(false);
    }
  }

  async function sendSmtpTest() {
    const email = smtpTestEmail.trim();
    if (!email) {
      toast.error("Ingresa un correo destino para la prueba SMTP.");
      return;
    }

    setSmtpTesting(true);
    try {
      const res = await fetch("/api/admin/smtp-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email }),
      });

      const data = (await res.json()) as {
        error?: string;
        ok?: boolean;
        message?: string;
        debug?: unknown;
      };
      if (!res.ok || !data.ok) {
        const message = data.error || "No se pudo enviar el correo de prueba.";
        setSmtpTestResult({
          ok: false,
          message,
          at: new Date().toLocaleString(),
          debug: data.debug,
        });
        throw new Error(message);
      }

      setSmtpTestResult({
        ok: true,
        message: data.message || `Correo de prueba enviado correctamente a ${email}`,
        at: new Date().toLocaleString(),
        debug: data.debug,
      });
      toast.success(`Correo de prueba enviado a ${email}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error enviando correo de prueba.";
      if (!smtpTestResult || smtpTestResult.ok) {
        setSmtpTestResult({
          ok: false,
          message,
          at: new Date().toLocaleString(),
        });
      }
      toast.error(message);
    } finally {
      setSmtpTesting(false);
    }
  }

  /* ── Slide helpers ── */
  function addSlide(list: PromoSlide[], setList: React.Dispatch<React.SetStateAction<PromoSlide[]>>) {
    if (list.length >= 3) return;
    setList([...list, { image_url: "", link_url: "", title: "" }]);
  }

  function removeSlide(index: number, list: PromoSlide[], setList: React.Dispatch<React.SetStateAction<PromoSlide[]>>) {
    setList(list.filter((_, i) => i !== index));
  }

  function updateSlide(
    index: number,
    field: keyof PromoSlide,
    value: string,
    list: PromoSlide[],
    setList: React.Dispatch<React.SetStateAction<PromoSlide[]>>,
  ) {
    const updated = list.map((s, i) => (i === index ? { ...s, [field]: value } : s));
    setList(updated);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-gray-500 text-sm font-poppins">Cargando ajustes...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <div>
        <h1 className="font-bebas text-5xl tracking-wider text-white">Ajustes del Sitio</h1>
        <p className="text-sm text-gray-500 mt-1">
          Logos, fondos de headers, video del inicio y sliders de promo.
        </p>
      </div>

      {/* ── Logos ── */}
      <Section
        title="Logotipos"
        description="Logo que aparece en el hero y headers de todas las páginas."
        onSave={() =>
          save([
            { key: "logo_v1", value: logoV1 || "" },
            { key: "logo_v2", value: logoV2 || "" },
          ])
        }
        saving={saving}
      >
        <div className="grid md:grid-cols-2 gap-6">
          <ImageUploadField
            label="Logo v1.0"
            value={logoV1}
            onChange={(v) => setLogoV1(v)}
            folder="site-settings"
          />
          <ImageUploadField
            label="Logo v2.0"
            value={logoV2}
            onChange={(v) => setLogoV2(v)}
            folder="site-settings"
          />
        </div>
      </Section>

      {/* ── Fondos de Header ── */}
      <Section
        title="Imágenes de Fondo (Headers)"
        description="Imagen de fondo que aparece en el hero de todas las páginas internas."
        onSave={() =>
          save([
            { key: "hero_bg_v1", value: bgV1 || "" },
            { key: "hero_bg_v2", value: bgV2 || "" },
          ])
        }
        saving={saving}
      >
        <div className="grid md:grid-cols-2 gap-6">
          <ImageUploadField
            label="Fondo v1.0"
            value={bgV1}
            onChange={(v) => setBgV1(v)}
            folder="site-settings"
          />
          <ImageUploadField
            label="Fondo v2.0"
            value={bgV2}
            onChange={(v) => setBgV2(v)}
            folder="site-settings"
          />
        </div>
      </Section>

      {/* ── Fondos de Landing (home) ── */}
      <Section
        title="Imágenes de Fondo (Landing)"
        description="Fondos del panel de selección en la página principal (/)."
        onSave={() =>
          save([
            { key: "home_bg_v1", value: homeBgV1 || "" },
            { key: "home_bg_v2", value: homeBgV2 || "" },
          ])
        }
        saving={saving}
      >
        <div className="grid md:grid-cols-2 gap-6">
          <ImageUploadField
            label="Fondo Landing 1.0"
            value={homeBgV1}
            onChange={(v) => setHomeBgV1(v)}
            folder="site-settings"
          />
          <ImageUploadField
            label="Fondo Landing 2.0"
            value={homeBgV2}
            onChange={(v) => setHomeBgV2(v)}
            folder="site-settings"
          />
        </div>
      </Section>

      <Section
        title="Comunidad de Discord"
        description="Links de invitación para las comunidades de Discord por versión."
        onSave={() =>
          save([
            { key: "discord_url_v1", value: discordUrlV1 },
            { key: "discord_url_v2", value: discordUrlV2 },
          ])
        }
        saving={saving}
      >
        <div className="grid md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-400 uppercase tracking-wider">Discord v1.0</label>
            <input
              type="url"
              value={discordUrlV1}
              onChange={(e) => setDiscordUrlV1(e.target.value)}
              placeholder="https://discord.gg/..."
              className={FIELD_CLS}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-400 uppercase tracking-wider">Discord v2.0</label>
            <input
              type="url"
              value={discordUrlV2}
              onChange={(e) => setDiscordUrlV2(e.target.value)}
              placeholder="https://discord.gg/..."
              className={FIELD_CLS}
            />
          </div>
        </div>
      </Section>

      {/* ── Video Home ── */}
      <Section
        title="Video del Inicio"
        description="URL de YouTube (ej: https://youtu.be/xxx) o enlace directo a MP4. Se muestra en la sección de bienvenida."
        onSave={() =>
          save([
            { key: "home_video_url_v1", value: videoV1 },
            { key: "home_video_url_v2", value: videoV2 },
          ])
        }
        saving={saving}
      >
        <div className="grid md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-400 uppercase tracking-wider">URL Video v1.0</label>
            <input
              type="url"
              value={videoV1}
              onChange={(e) => setVideoV1(e.target.value)}
              placeholder="https://youtu.be/... o https://..."
              className={FIELD_CLS}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-400 uppercase tracking-wider">URL Video v2.0</label>
            <input
              type="url"
              value={videoV2}
              onChange={(e) => setVideoV2(e.target.value)}
              placeholder="https://youtu.be/... o https://..."
              className={FIELD_CLS}
            />
          </div>
        </div>
      </Section>

      {/* ── Promo Slides v1.0 ── */}
      <Section
        title="Slides de Promo — v1.0"
        description="Máximo 3 slides. Aparecen a la derecha del video en la sección de bienvenida."
        onSave={() => save([{ key: "promo_slides_v1", value: JSON.stringify(slidesV1) }])}
        saving={saving}
      >
        <SlidesList
          slides={slidesV1}
          onAdd={() => addSlide(slidesV1, setSlidesV1)}
          onRemove={(i) => removeSlide(i, slidesV1, setSlidesV1)}
          onUpdate={(i, f, v) => updateSlide(i, f, v, slidesV1, setSlidesV1)}
          version="v1"
        />
      </Section>

      {/* ── Promo Slides v2.0 ── */}
      <Section
        title="Slides de Promo — v2.0"
        description="Máximo 3 slides. Aparecen a la derecha del video en la sección de bienvenida."
        onSave={() => save([{ key: "promo_slides_v2", value: JSON.stringify(slidesV2) }])}
        saving={saving}
      >
        <SlidesList
          slides={slidesV2}
          onAdd={() => addSlide(slidesV2, setSlidesV2)}
          onRemove={(i) => removeSlide(i, slidesV2, setSlidesV2)}
          onUpdate={(i, f, v) => updateSlide(i, f, v, slidesV2, setSlidesV2)}
          version="v2"
        />
      </Section>

      {/* ── Scripts ── */}
      <Section
        title="Scripts Personalizados"
        description="Pega aquí los snippets de analytics, pixels o cualquier código de terceros."
        onSave={() =>
          save([
            { key: "script_head",   value: scriptHead },
            { key: "script_footer", value: scriptFooter },
          ])
        }
        saving={saving}
        icon={<Code className="h-5 w-5 text-gold/60" />}
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-400 uppercase tracking-wider font-poppins flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-gold/50" />
              Scripts en &lt;body&gt; — inicio
            </label>
            <p className="text-[11px] text-gray-600 font-poppins -mt-1">
              Se inyectan justo después de abrir &lt;body&gt;. Ideal para Google Analytics, Meta Pixel, GTM, etc.
            </p>
            <textarea
              value={scriptHead}
              onChange={(e) => setScriptHead(e.target.value)}
              rows={6}
              spellCheck={false}
              placeholder={"<!-- Google Analytics -->\n<script async src=\"https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXX\"></script>\n<script>\n  window.dataLayer = window.dataLayer || [];\n  ...\n</script>"}
              className="bg-[#0a0a0a] border border-[rgba(255,215,0,0.15)] rounded-lg px-3 py-2.5 text-xs text-green-400 placeholder:text-gray-700 focus:outline-none focus:border-[#f39c12] transition-colors w-full font-mono resize-y"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-400 uppercase tracking-wider font-poppins flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-gold/30" />
              Scripts en &lt;body&gt; — final
            </label>
            <p className="text-[11px] text-gray-600 font-poppins -mt-1">
              Se inyectan justo antes de cerrar &lt;/body&gt;. Ideal para pixels de noscript, chat widgets, etc.
            </p>
            <textarea
              value={scriptFooter}
              onChange={(e) => setScriptFooter(e.target.value)}
              rows={6}
              spellCheck={false}
              placeholder={"<!-- GTM noscript -->\n<noscript>\n  <iframe src=\"https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX\"\n    height=\"0\" width=\"0\" style=\"display:none;visibility:hidden\">\n  </iframe>\n</noscript>"}
              className="bg-[#0a0a0a] border border-[rgba(255,215,0,0.15)] rounded-lg px-3 py-2.5 text-xs text-green-400 placeholder:text-gray-700 focus:outline-none focus:border-[#f39c12] transition-colors w-full font-mono resize-y"
            />
          </div>
        </div>
      </Section>

      {/* ── Soporte ── */}
      <Section
        title="Soporte"
        description="Correo de notificaciones y estado del sistema de tickets para jugadores."
        onSave={() => save([
          { key: "support_notification_email", value: supportEmail },
          { key: "tickets_enabled",            value: ticketsEnabled ? "true" : "false" },
          { key: "garments_enabled",           value: garmentsEnabled ? "true" : "false" },
          { key: "garments_whatsapp_url",      value: garmentsWhatsappUrl },
        ])}
        saving={saving}
      >
        <div className="flex flex-col gap-5">
          {/* Toggle tickets */}
          <div className="flex items-center justify-between gap-4 py-1">
            <div>
              <p className="text-sm text-white font-medium font-poppins">Sistema de tickets</p>
              <p className="text-[11px] text-gray-500 font-poppins mt-0.5">
                Habilita o deshabilita el acceso de jugadores al sistema de soporte.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTicketsEnabled((v) => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                ticketsEnabled ? "bg-[#f39c12]" : "bg-gray-700"
              }`}
              aria-checked={ticketsEnabled}
              role="switch"
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  ticketsEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Toggle garments */}
          <div className="flex items-center justify-between gap-4 py-1">
            <div>
              <p className="text-sm text-white font-medium font-poppins">Tienda de Garments</p>
              <p className="text-[11px] text-gray-500 font-poppins mt-0.5">
                Muestra u oculta la tienda de garments en el menú y bloquea el acceso a la página.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setGarmentsEnabled((v) => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                garmentsEnabled ? "bg-[#f39c12]" : "bg-gray-700"
              }`}
              aria-checked={garmentsEnabled}
              role="switch"
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  garmentsEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-400 uppercase tracking-wider font-poppins">
              Correo de notificaciones de tickets
            </label>
            <input
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              placeholder="soporte@tudominio.com"
              className={FIELD_CLS}
            />
            <p className="text-[11px] text-gray-600 font-poppins">
              Deja en blanco para desactivar las notificaciones por email de tickets.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-400 uppercase tracking-wider font-poppins">
              Link de WhatsApp para solicitudes de Garment
            </label>
            <input
              type="url"
              value={garmentsWhatsappUrl}
              onChange={(e) => setGarmentsWhatsappUrl(e.target.value)}
              placeholder="https://wa.me/521XXXXXXXXXX"
              className={FIELD_CLS}
            />
            <p className="text-[11px] text-gray-600 font-poppins">
              Ejemplo: https://wa.me/521XXXXXXXXXX o https://api.whatsapp.com/send?phone=...
            </p>
          </div>
        </div>
      </Section>


      {/* ── SMTP Test ── */}
      <Section
        title="Prueba SMTP"
        description="Envía un correo de prueba para validar la configuración SMTP actual en el servidor."
        onSave={sendSmtpTest}
        saving={smtpTesting}
        saveLabel={smtpTesting ? "Enviando..." : "Enviar prueba"}
        icon={<Send className="h-5 w-5 text-gold/60" />}
      >
        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-400 uppercase tracking-wider font-poppins">
            Correo destino
          </label>
          <input
            type="email"
            value={smtpTestEmail}
            onChange={(e) => setSmtpTestEmail(e.target.value)}
            placeholder="correo@dominio.com"
            className={FIELD_CLS}
          />
          <p className="text-[11px] text-gray-600 font-poppins">
            Usa este botón para confirmar que SMTP_HOST, SMTP_USER y SMTP_PASS están correctos.
          </p>

          {smtpTestResult && (
            <div
              className="mt-2 rounded-lg border px-3 py-2 text-xs font-mono whitespace-pre-wrap"
              style={{
                borderColor: smtpTestResult.ok ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)",
                background: smtpTestResult.ok ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                color: smtpTestResult.ok ? "#86efac" : "#fca5a5",
              }}
            >
              [{smtpTestResult.at}] {smtpTestResult.ok ? "OK" : "ERROR"}
              {"\n"}
              {smtpTestResult.message}
              {smtpTestResult.debug ? `\n\nEntrada/Salida:\n${JSON.stringify(smtpTestResult.debug, null, 2)}` : ""}
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}

/* ── Section wrapper ── */
function Section({
  title,
  description,
  children,
  onSave,
  saving,
  icon,
  saveLabel,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  onSave: () => void;
  saving: boolean;
  icon?: React.ReactNode;
  saveLabel?: string;
}) {
  return (
    <div
      className="rounded-2xl flex flex-col gap-5"
      style={{
        background: "rgba(15,5,3,0.95)",
        border: "1px solid rgba(255,215,0,0.12)",
        padding: "1.5rem",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <h2 className="font-bebas text-2xl tracking-wider text-white">{title}</h2>
            <p className="text-xs text-gray-500 mt-0.5 font-poppins">{description}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#f39c12] hover:bg-[#e67e22] disabled:opacity-60 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors shrink-0"
        >
          <Save className="h-3.5 w-3.5" />
          {saveLabel ?? (saving ? "Guardando..." : "Guardar")}
        </button>
      </div>
      {children}
    </div>
  );
}

/* ── Slides list sub-component ── */
function SlidesList({
  slides,
  onAdd,
  onRemove,
  onUpdate,
  version,
}: {
  slides: PromoSlide[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  onUpdate: (i: number, f: keyof PromoSlide, v: string) => void;
  version: string;
}) {
  const FIELD_CLS =
    "bg-[#0f0503] border border-[rgba(255,215,0,0.15)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f39c12] transition-colors w-full";

  return (
    <div className="flex flex-col gap-4">
      {slides.length === 0 && (
        <p className="text-gray-600 text-sm font-poppins">No hay slides. Agrega hasta 3.</p>
      )}
      {slides.map((slide, i) => (
        <div
          key={i}
          className="rounded-xl p-4 flex flex-col gap-3"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 uppercase tracking-wider font-poppins">
              Slide {i + 1}
            </span>
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <ImageUploadField
            label="Imagen del slide"
            value={slide.image_url || null}
            onChange={(v) => onUpdate(i, "image_url", v ?? "")}
            folder={`site-settings/promo-${version}`}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-500 uppercase tracking-wider">
                Título (opcional)
              </label>
              <input
                type="text"
                value={slide.title ?? ""}
                onChange={(e) => onUpdate(i, "title", e.target.value)}
                placeholder="Ej: ¡Evento especial!"
                className={FIELD_CLS}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-500 uppercase tracking-wider">
                Enlace (opcional)
              </label>
              <input
                type="url"
                value={slide.link_url ?? ""}
                onChange={(e) => onUpdate(i, "link_url", e.target.value)}
                placeholder="https://..."
                className={FIELD_CLS}
              />
            </div>
          </div>
        </div>
      ))}
      {slides.length < 3 && (
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-2 border border-dashed border-[rgba(255,215,0,0.2)] rounded-xl py-3 px-4 text-sm text-gold/60 hover:text-gold hover:border-gold/40 transition-colors font-poppins"
        >
          <Plus className="h-4 w-4" />
          Agregar slide
        </button>
      )}
    </div>
  );
}
