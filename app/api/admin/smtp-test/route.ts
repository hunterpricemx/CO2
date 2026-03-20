import { NextResponse } from "next/server";
import { getCurrentAdminContext } from "@/lib/admin/auth";
import { sendSmtpTestEmail } from "@/lib/mailer";

function isSmtpDebugEnabled(): boolean {
  return String(process.env.SMTP_DEBUG ?? "false").toLowerCase() === "true";
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "invalid-email";
  return `${local.slice(0, 2)}***@${domain}`;
}

function smtpDebug(event: string, data: Record<string, unknown>) {
  if (!isSmtpDebugEnabled()) return;
  console.info(`[SMTP_DEBUG] ${event}`, data);
}

export async function POST(request: Request) {
  const admin = await getCurrentAdminContext();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const to =
    body && typeof body === "object" && typeof (body as { to?: unknown }).to === "string"
      ? (body as { to: string }).to.trim()
      : "";

  if (!to) {
    return NextResponse.json({ error: "Missing recipient email" }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    return NextResponse.json({ error: "Invalid recipient email" }, { status: 400 });
  }

  smtpDebug("INBOUND_TEST_REQUEST", {
    requestedBy: admin.username,
    to: maskEmail(to),
  });

  const inbound = {
    requestedBy: admin.username,
    to: maskEmail(to),
    at: new Date().toISOString(),
  };

  const outboundBase = {
    host: process.env.SMTP_HOST ?? "",
    port: Number.parseInt(process.env.SMTP_PORT ?? "587", 10),
    secure: String(process.env.SMTP_SECURE ?? "false").toLowerCase() === "true",
    user: maskEmail(process.env.SMTP_USER ?? ""),
  };

  try {
    const provider = await sendSmtpTestEmail({
      to,
      requestedBy: admin.username,
    });

    smtpDebug("INBOUND_TEST_SUCCESS", {
      requestedBy: admin.username,
      to: maskEmail(to),
      provider,
    });

    return NextResponse.json({
      ok: true,
      message: "Correo de prueba enviado correctamente.",
      debug: {
        inbound,
        outbound: {
          smtp: outboundBase,
          provider,
        },
      },
    });
  } catch (error) {
    const errObj = error as {
      message?: string;
      code?: string;
      responseCode?: number;
      command?: string;
      response?: string;
      stack?: string;
    };
    const message = error instanceof Error ? error.message : "SMTP test failed";

    const providerError = {
      code: errObj?.code ?? null,
      responseCode: errObj?.responseCode ?? null,
      command: errObj?.command ?? null,
      response: errObj?.response ?? message,
    };

    smtpDebug("INBOUND_TEST_FAILURE", {
      requestedBy: admin.username,
      to: maskEmail(to),
      error: message,
      providerError,
    });
    return NextResponse.json(
      {
        ok: false,
        error: message,
        debug: {
          inbound,
          outbound: {
            smtp: outboundBase,
            providerError,
          },
        },
      },
      { status: 500 },
    );
  }
}
