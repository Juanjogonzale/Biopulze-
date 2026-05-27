import nodemailer from "nodemailer";

export const enviarCodigoEmail = async (correo, codigo) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: correo,
      subject: "Código de verificación BioPulse",
      text: `Tu código de verificación es: ${codigo}`,
      html: `<p>Tu código de verificación es: <strong>${codigo}</strong></p>`
    });
    console.log(`[Email] Código enviado a ${correo}`);
  } catch (error) {
    console.error("Error enviando email:", error.message);
  }
};