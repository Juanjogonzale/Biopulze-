export const enviarCodigoEmail = async (correo, codigo) => {
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
        textContent: `Tu código de verificación es: ${codigo}. Válido 10 minutos.`,
        htmlContent: `<p>Tu código es: <strong>${codigo}</strong></p><p>Válido 10 minutos.</p>`
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Brevo error:", data);
      return;
    }

    console.log(`[Email] Código enviado a ${correo}`);
  } catch (error) {
    console.error("Error enviando email:", error.message);
  }
};