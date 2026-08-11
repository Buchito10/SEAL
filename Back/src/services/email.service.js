const nodemailer = require("nodemailer");
const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    EMAIL_FROM,
    NODE_ENV,
} = require("../config/env");

let transporter;

function isEmailConfigured() {
    const user = String(SMTP_USER || "").trim();
    const pass = String(SMTP_PASS || "").trim();
    return Boolean(user && pass && user !== "dev@example.com" && pass !== "dev-password");
}

async function sendMailOrLog(mail) {
    if (!isEmailConfigured()) {
        console.log("[email:dev-skip]", {
            to: mail.to,
            subject: mail.subject,
        });
        return { skipped: true, reason: "SMTP_NOT_CONFIGURED" };
    }

    const t = getTransporter();
    return t.sendMail(mail);
}

function getTransporter() {
    if (transporter) return transporter;

    transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465, // 465 = SSL
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
        },
    });

    return transporter;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function buildPasswordAccessEmailHTML({
    name,
    loginEmail,
    createdByName,
    link,
    expiresMinutes,
    purpose,
}) {
    const safeName = escapeHtml(name);
    const safeLoginEmail = escapeHtml(loginEmail);
    const safeCreatedBy = escapeHtml(createdByName);
    const safeLink = escapeHtml(link);
    const isActivation = purpose === "ACCOUNT_ACTIVATION";

    const title = "Seal Contratos";
    const preheader = isActivation
        ? "Activa la cuenta que tu administrador creó en Seal."
        : "Restablece la contraseña de tu cuenta Seal.";
    const heading = isActivation ? "Activa tu cuenta" : "Restablece tu contraseña";
    const buttonLabel = isActivation ? "Activar cuenta" : "Restablecer contraseña";

    return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f7fb;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>

    <div style="width:100%;padding:24px 12px;box-sizing:border-box;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(16,24,40,0.08);">

        <div style="padding:18px 20px;background:#0b1220;">
          <div style="font-family:Arial,sans-serif;color:#ffffff;font-weight:700;font-size:18px;letter-spacing:0.2px;">
            Seal <span style="opacity:0.85;font-weight:600;">Contratos</span>
          </div>
          <div style="font-family:Arial,sans-serif;color:#c7d2fe;font-size:12px;margin-top:6px;">
            Plataforma de gestión de contratos
          </div>
        </div>

        <div style="padding:22px 20px 10px 20px;font-family:Arial,sans-serif;color:#111827;">
          <h2 style="margin:0 0 10px 0;font-size:18px;line-height:1.25;">${heading}</h2>

          <p style="margin:0 0 10px 0;font-size:14px;line-height:1.55;">
            Hola ${safeName || ""}${safeName ? "," : ""}
          </p>

          ${isActivation && safeCreatedBy
            ? `
          <p style="margin:0 0 10px 0;font-size:14px;line-height:1.55;">
            <strong>${safeCreatedBy}</strong> te dio acceso a <strong>Seal Contratos</strong>.
          </p>
          `
            : ""
        }

          <p style="margin:0 0 12px 0;font-size:14px;line-height:1.55;">
            ${isActivation
              ? "Para completar la activación, crea una contraseña y acepta los documentos de protección de datos y privacidad."
              : "Recibimos una solicitud para cambiar la contraseña de tu cuenta. Si fuiste tú, utiliza el siguiente enlace."
            }
          </p>

          <p style="margin:0 0 14px 0;font-size:14px;line-height:1.55;">
            Para iniciar sesión, tu usuario será este mismo correo:
            ${safeLoginEmail
            ? `<br/><strong style="font-size:14px;">${safeLoginEmail}</strong>`
            : ""
        }
          </p>

          <div style="margin:14px 0 16px 0;">
            <a href="${safeLink}"
              style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 16px;border-radius:10px;font-weight:700;font-size:14px;">
              ${buttonLabel}
            </a>
          </div>

          <div style="background:#f3f4f6;border-radius:12px;padding:12px 12px;margin:0 0 14px 0;">
            <div style="font-size:13px;line-height:1.45;color:#111827;">
              <strong>Importante:</strong>
              <ul style="margin:8px 0 0 18px;padding:0;color:#374151;">
                <li>Este enlace expira en <strong>${expiresMinutes} minutos</strong> y solo puede usarse <strong>una vez</strong>.</li>
                <li>Si tú no esperabas este correo, puedes ignorarlo.</li>
              </ul>
            </div>
          </div>

          <p style="margin:0 0 14px 0;font-size:12px;line-height:1.55;color:#6b7280;">
            Si el botón no funciona, copia y pega este enlace en tu navegador:
            <br/>
            <span style="word-break:break-all;">${safeLink}</span>
          </p>

          ${NODE_ENV === "development"
            ? `
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:14px 0;" />
          <p style="margin:0;font-size:12px;line-height:1.55;color:#6b7280;">(DEV) Link directo: ${safeLink}</p>
          `
            : ""
        }
        </div>

        <div style="padding:14px 20px 18px 20px;background:#fbfbfd;font-family:Arial,sans-serif;">
          <p style="margin:0;font-size:12px;line-height:1.55;color:#6b7280;">
            Este mensaje fue enviado automáticamente por <strong>Seal Contratos</strong>.
          </p>
        </div>

      </div>
    </div>
  </body>
</html>
`;
}

async function sendPasswordAccessEmail({
    to,
    name,
    link,
    expiresMinutes,
    createdByName,
    loginEmail,
    purpose,
}) {
    const isActivation = purpose === "ACCOUNT_ACTIVATION";
    const info = await sendMailOrLog({
        from: EMAIL_FROM,
        to,
        subject: isActivation
            ? "Seal Contratos — Activa tu cuenta"
            : "Seal Contratos — Restablece tu contraseña",
        html: buildPasswordAccessEmailHTML({
            name,
            link,
            expiresMinutes,
            createdByName,
            loginEmail: loginEmail || to,
            purpose,
        }),
    });
    return info;
}



function buildAssignmentNotificationText({ name }) {
    const safeName = name ? String(name) : "";
    return `Estimado/a ${safeName},

Se le informa que tiene un contrato pendiente de revisión y firma en la plataforma Seal.

Para consultarlo, inicie sesión en la plataforma y diríjase a la sección “Bandeja de entrada”.

Si usted no reconoce esta actividad, por favor comuníquese con el equipo de soporte de inmediato.

Atentamente,
Equipo Seal
`;
}

async function sendAssignmentNotificationEmail({ to, name }) {
    if (!to) return;
    const subject = "Seal — Contrato pendiente de firma";
    const text = buildAssignmentNotificationText({ name });
    const html = `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap;line-height:1.4;color:#111827;">${text}</pre>`;
    const info = await sendMailOrLog({
        from: EMAIL_FROM,
        to,
        subject,
        text,
        html,
    });
    return info;
}

function buildProfileUpdateRequestText({ name }) {
    const safeName = name ? String(name) : "";
    return `Estimado/a ${safeName},

Para poder asignarle un contrato pendiente de firma en Seal, es necesario que complete o actualice algunos datos de su perfil.

Por favor, inicie sesión en la plataforma Seal y diríjase a la sección “Perfil” para completar la información requerida.

Una vez actualizados sus datos, podremos enviarle el contrato para su revisión y firma.

Atentamente,
Equipo Seal
`;
}

async function sendProfileUpdateRequestEmail({ to, name }) {
    if (!to) return;
    const subject = "Seal — Actualización requerida de datos";
    const text = buildProfileUpdateRequestText({ name });
    const html = `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap;line-height:1.4;color:#111827;">${text}</pre>`;
    const info = await sendMailOrLog({
        from: EMAIL_FROM,
        to,
        subject,
        text,
        html,
    });
    return info;
}

function buildApprovedNotificationText({ name }) {
    const safeName = name ? String(name) : "";
    return `Estimado/a ${safeName},

Se le informa que su contrato ha sido aprobado y ya se encuentra disponible para descarga en la plataforma Seal.

Para descargarlo, inicie sesión y diríjase a la sección “Bandeja de entrada”.

Atentamente,
Equipo Seal
`;
}

async function sendApprovedNotificationEmail({ to, name }) {
    if (!to) return;
    const subject = "Seal — Contrato aprobado y disponible";
    const text = buildApprovedNotificationText({ name });
    const html = `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap;line-height:1.4;color:#111827;">${text}</pre>`;
    const info = await sendMailOrLog({
        from: EMAIL_FROM,
        to,
        subject,
        text,
        html,
    });
    return info;
}

module.exports = {
    sendPasswordAccessEmail,
    sendAssignmentNotificationEmail,
    sendProfileUpdateRequestEmail,
    sendApprovedNotificationEmail,
};
