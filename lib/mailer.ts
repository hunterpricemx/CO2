import nodemailer from "nodemailer";

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
};

type MailPayload = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

type MailProviderResponse = {
  messageId: string;
  response: string;
};

function getOriginFromUrl(rawUrl: string): string | null {
  try {
    return new URL(rawUrl).origin;
  } catch {
    return null;
  }
}

function isSmtpDebugEnabled(): boolean {
  return String(process.env.SMTP_DEBUG ?? "false").toLowerCase() === "true";
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "invalid-email";
  const head = local.slice(0, 2);
  return `${head}***@${domain}`;
}

function smtpDebug(event: string, data: Record<string, unknown>) {
  if (!isSmtpDebugEnabled()) return;
  console.info(`[SMTP_DEBUG] ${event}`, data);
}

function getResendConfig(): { apiKey: string; from: string } | null {
  const apiKey = process.env.RESEND_API_KEY?.trim() ?? "";
  if (!apiKey) return null;

  const from = process.env.RESEND_FROM_EMAIL?.trim() ?? "Conquer Classic Plus <onboarding@resend.dev>";
  return { apiKey, from };
}

function getSmtpConfig(): SmtpConfig {
  const host = process.env.SMTP_HOST?.trim() ?? "";
  const user = process.env.SMTP_USER?.trim() ?? "";
  const pass = process.env.SMTP_PASS ?? "";
  const fromEmail = process.env.SMTP_FROM_EMAIL?.trim() ?? user;
  const fromName = process.env.SMTP_FROM_NAME?.trim() ?? "Conquer Classic Plus";
  const port = Number.parseInt(process.env.SMTP_PORT?.trim() ?? "587", 10);
  const secure = String(process.env.SMTP_SECURE ?? "false").toLowerCase() === "true";

  if (!host || !user || !pass || !fromEmail || Number.isNaN(port)) {
    throw new Error("SMTP is not configured. Check SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and SMTP_FROM_EMAIL.");
  }

  return { host, port, secure, user, pass, fromEmail, fromName };
}

async function sendViaResend(payload: MailPayload): Promise<MailProviderResponse> {
  const resend = getResendConfig();
  if (!resend) {
    throw new Error("Resend is not configured. Check RESEND_API_KEY.");
  }

  smtpDebug("OUTBOUND_RESEND_ATTEMPT", {
    to: maskEmail(payload.to),
    from: resend.from,
  });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resend.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: resend.from,
      to: [payload.to],
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    }),
  });

  const body = await res.json() as { id?: string; message?: string; name?: string };
  if (!res.ok || !body.id) {
    const message = body.message ?? body.name ?? `Resend request failed with status ${res.status}`;
    throw new Error(message);
  }

  smtpDebug("OUTBOUND_RESEND_SENT", {
    to: maskEmail(payload.to),
    messageId: body.id,
  });

  return {
    messageId: body.id,
    response: "accepted-by-resend",
  };
}

async function sendViaSmtp(payload: MailPayload): Promise<MailProviderResponse> {
  const cfg = getSmtpConfig();
  smtpDebug("OUTBOUND_SMTP_ATTEMPT", {
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    user: maskEmail(cfg.user),
    to: maskEmail(payload.to),
  });

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
  });

  const info = await transporter.sendMail({
    from: `"${cfg.fromName}" <${cfg.fromEmail}>`,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });

  smtpDebug("OUTBOUND_SMTP_SENT", {
    to: maskEmail(payload.to),
    messageId: info.messageId,
    response: info.response,
  });

  return {
    messageId: info.messageId,
    response: info.response,
  };
}

async function sendMail(payload: MailPayload): Promise<MailProviderResponse> {
  return sendViaResend(payload);
}

export async function sendResetPasswordEmail(params: {
  to: string;
  username: string;
  resetUrl: string;
  expiresMinutes: number;
  version: number;
}): Promise<void> {
  const subject = "Conquer Classic Plus - Recuperar contrasena";
  const logoFile = params.version === 1 ? "conquer_classic_plus_10_logo.png" : "conquer_classic_plus_20_logo.png";
  const origin = getOriginFromUrl(params.resetUrl);
  const logoUrl = origin ? `${origin}/images/logos/${logoFile}` : null;

  const text = [
    `Hola ${params.username},`,
    "",
    `Usuario: ${params.username}`,
    "Recibimos una solicitud para restablecer tu contrasena.",
    `Usa este enlace para continuar: ${params.resetUrl}`,
    `Este enlace vence en ${params.expiresMinutes} minutos.`,
    "",
    "Si no solicitaste este cambio, puedes ignorar este mensaje.",
  ].join("\n");

  const html = `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Recuperar contrase\u00f1a</title>
      </head>
      <body style="margin:0;padding:0;background:#0f172a;font-family:Arial,sans-serif;color:#0f172a;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f172a;padding:28px 14px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.28);">
                <tr>
                  <td style="background:linear-gradient(135deg,#111827,#1f2937);padding:24px 20px;text-align:center;">
                    ${logoUrl
                      ? `<img src="${logoUrl}" alt="Conquer Classic Plus" width="110" style="display:block;margin:0 auto 10px auto;border:0;" />`
                      : ""}
                    <div style="font-size:20px;line-height:1.2;font-weight:700;color:#f8fafc;">Recuperar contrase&ntilde;a</div>
                    <div style="margin-top:6px;font-size:13px;color:#cbd5e1;">Conquer Classic Plus</div>
                  </td>
                </tr>

                <tr>
                  <td style="padding:22px 22px 18px 22px;">
                    <p style="margin:0 0 10px 0;font-size:16px;color:#111827;">Hola <strong>${params.username}</strong>,</p>
                    <p style="margin:0 0 8px 0;font-size:14px;color:#334155;">Usuario: <strong>${params.username}</strong></p>
                    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#334155;">Recibimos una solicitud para restablecer tu contrase&ntilde;a.</p>

                    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 16px 0;">
                      <tr>
                        <td align="center" style="border-radius:8px;background:#f59e0b;">
                          <a href="${params.resetUrl}" style="display:inline-block;padding:11px 16px;font-size:14px;font-weight:700;color:#111827;text-decoration:none;border-radius:8px;">
                            Restablecer contrase&ntilde;a
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:0 0 8px 0;font-size:13px;color:#475569;">Este enlace vence en <strong>${params.expiresMinutes} minutos</strong>.</p>
                    <p style="margin:0;font-size:13px;color:#64748b;">Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const provider = await sendMail({
    to: params.to,
    subject,
    text,
    html,
  });

  smtpDebug("OUTBOUND_RESET_SENT", {
    to: maskEmail(params.to),
    messageId: provider.messageId,
    response: provider.response,
  });
}

export async function sendSmtpTestEmail(params: {
  to: string;
  requestedBy: string;
}): Promise<{ messageId: string; response: string }> {
  smtpDebug("OUTBOUND_TEST_ATTEMPT", {
    to: maskEmail(params.to),
    requestedBy: params.requestedBy,
  });

  const subject = "Conquer Classic Plus - Prueba SMTP";
  const text = [
    "Este es un correo de prueba SMTP desde el panel de administración.",
    `Solicitado por: ${params.requestedBy}`,
    "",
    "Si recibiste este correo, la configuración SMTP es válida.",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
      <h2 style="margin:0 0 12px">Prueba SMTP</h2>
      <p>Este es un correo de prueba SMTP desde el panel de administración.</p>
      <p><strong>Solicitado por:</strong> ${params.requestedBy}</p>
      <p>Si recibiste este correo, la configuración SMTP es válida.</p>
    </div>
  `;

  const info = await sendMail({
    to: params.to,
    subject,
    text,
    html,
  });

  smtpDebug("OUTBOUND_TEST_SENT", {
    to: maskEmail(params.to),
    messageId: info.messageId,
    response: info.response,
  });

  return {
    messageId: info.messageId,
    response: info.response,
  };
}

/**
 * Generic fire-and-forget email. Uses Resend if configured, falls back to SMTP.
 * Never throws — failures are silently ignored.
 */
export async function sendGenericMail(payload: {
  to:      string;
  subject: string;
  text:    string;
  html:    string;
}): Promise<void> {
  try {
    await sendMail(payload);
  } catch {
    // fire-and-forget — never crash the caller
  }
}
