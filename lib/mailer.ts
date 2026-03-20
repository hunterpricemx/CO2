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

export async function sendResetPasswordEmail(params: {
  to: string;
  username: string;
  resetUrl: string;
  expiresMinutes: number;
}): Promise<void> {
  const cfg = getSmtpConfig();
  smtpDebug("OUTBOUND_RESET_ATTEMPT", {
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    user: maskEmail(cfg.user),
    to: maskEmail(params.to),
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

  const subject = "Conquer Classic Plus - Recuperar contraseña";
  const text = [
    `Hola ${params.username},`,
    "",
    "Recibimos una solicitud para restablecer tu contraseña.",
    `Usa este enlace para continuar: ${params.resetUrl}`,
    `Este enlace vence en ${params.expiresMinutes} minutos.`,
    "",
    "Si no solicitaste este cambio, puedes ignorar este mensaje.",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
      <h2 style="margin:0 0 12px">Recuperar contraseña</h2>
      <p>Hola <strong>${params.username}</strong>,</p>
      <p>Recibimos una solicitud para restablecer tu contraseña.</p>
      <p>
        <a href="${params.resetUrl}" style="display:inline-block;background:#f39c12;color:#000;padding:10px 14px;border-radius:6px;text-decoration:none;font-weight:700">
          Restablecer contraseña
        </a>
      </p>
      <p>Este enlace vence en <strong>${params.expiresMinutes} minutos</strong>.</p>
      <p>Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
    </div>
  `;

  const info = await transporter.sendMail({
    from: `"${cfg.fromName}" <${cfg.fromEmail}>`,
    to: params.to,
    subject,
    text,
    html,
  });

  smtpDebug("OUTBOUND_RESET_SENT", {
    to: maskEmail(params.to),
    messageId: info.messageId,
    response: info.response,
  });
}

export async function sendSmtpTestEmail(params: {
  to: string;
  requestedBy: string;
}): Promise<{ messageId: string; response: string }> {
  const cfg = getSmtpConfig();
  smtpDebug("OUTBOUND_TEST_ATTEMPT", {
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    user: maskEmail(cfg.user),
    to: maskEmail(params.to),
    requestedBy: params.requestedBy,
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

  const info = await transporter.sendMail({
    from: `"${cfg.fromName}" <${cfg.fromEmail}>`,
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
