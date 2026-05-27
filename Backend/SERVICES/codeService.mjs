/**
 * Envío del código 2FA por correo (Resend, gratis) o SMS (Twilio, prueba gratuita).
 * Si no hay configuración, el código se muestra en consola (desarrollo).
 */

import dotenv from "dotenv";
dotenv.config();

const generarMensaje = (codigo) =>
  `Tu código de verificación BioPulse es: ${codigo}. Válido 10 minutos.`;

// --- EMAIL: Resend (gratis 100/día) o nodemailer (SMTP) ---
async function enviarPorEmail(destino, codigo) {
  // 1) Resend (gratis: https://resend.com)
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const from = process.env.RESEND_FROM || "BioPulse <onboarding@resend.dev>";
      const { error } = await resend.emails.send({
        from,
        to: destino,
        subject: "Código de verificación BioPulse",
        text: generarMensaje(codigo),
        html: `<p>Tu código de verificación es: <strong>${codigo}</strong></p><p>Válido 10 minutos.</p>`
      });
      if (error) {
        console.error("Resend error:", error);
        return false;
      }
      return true;
    } catch (e) {
      console.error("Error enviando con Resend:", e.message);
      return false;
    }
  }

  // 2) Nodemailer (SMTP en .env, ej. Gmail)
  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  if (smtpHost && smtpUser && smtpPass) {
    try {
      const nodemailer = (await import("nodemailer")).default;
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });
      await transporter.sendMail({
        from: process.env.FROM_EMAIL?.trim() || smtpUser,
        to: destino,
        subject: "Código de verificación BioPulse",
        text: generarMensaje(codigo),
        html: `<p>Tu código de verificación es: <strong>${codigo}</strong></p><p>Válido 10 minutos.</p>`
      });
      console.log("[Email] Código enviado a", destino, "vía SMTP (Gmail)");
      return true;
    } catch (e) {
      console.error("Error SMTP (revisa usuario/contraseña de aplicación):", e.message);
      return false;
    }
  }

  // Sin configuración: solo consola (desarrollo)
  console.log(`[2FA] Código para ${destino}: ${codigo}`);
  return true;
}

// --- SMS: Twilio (prueba gratuita) ---
async function enviarPorSMS(telefono, codigo) {
  if (
    !process.env.TWILIO_ACCOUNT_SID ||
    !process.env.TWILIO_AUTH_TOKEN ||
    !process.env.TWILIO_PHONE_NUMBER
  ) {
    console.log(`[2FA SMS no configurado] Código para ${telefono}: ${codigo}`);
    return false;
  }

  try {
    const twilio = (await import("twilio")).default;
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    await client.messages.create({
      body: generarMensaje(codigo),
      from: process.env.TWILIO_PHONE_NUMBER,
      to: telefono
    });
    return true;
  } catch (e) {
    console.error("Error Twilio SMS:", e.message);
    return false;
  }
}

/**
 * Envía el código por el canal elegido.
 * @param {string} canal - 'email' | 'sms'
 * @param {string} correo - email del usuario
 * @param {string} telefono - teléfono del usuario (con código país, ej +57...)
 * @param {string} codigo - código de 6 dígitos
 * @returns {Promise<{ ok: boolean, fallback?: string }>}
 */
export async function enviarCodigo2FA(canal, correo, telefono, codigo) {
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.BREVO_API_KEY
      },
      body: JSON.stringify({
        sender: { name: "BioPulse", email: process.env.FROM_EMAIL },
        to: [{ email: correo }],
        subject: "Código de verificación BioPulse",
        textContent: `Tu código BioPulse es: ${codigo}. Válido 10 minutos.`,
        htmlContent: `<p>Tu código es: <strong>${codigo}</strong></p>`
      })
    });

    const data = await response.json();
    if (!response.ok) console.error("Brevo error:", data);
    else console.log(`[Email] Enviado a ${correo}`);
  } catch (e) {
    console.error("Error Brevo:", e.message);
  }
}