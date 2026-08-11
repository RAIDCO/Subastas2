const https = require("https");

/**
 * Servicio de envío de correo electrónico mediante Brevo HTTP API (Port 443 - HTTPS).
 * Totalmente inmune a bloqueos y timeouts de puertos SMTP (465/587) en Render.
 */
const despacharCorreo = (opciones) => {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.BREVO_API_KEY;

    // Fallback de desarrollo si aún no se ha configurado la API Key de Brevo
    if (!apiKey) {
      console.log("\n==========================================");
      console.log("⚠️ [MODO DESARROLLO - FALTA BREVO_API_KEY]");
      console.log(`✉️ Correo para: ${opciones.to}`);
      console.log(`📌 Asunto: ${opciones.subject}`);
      console.log("==========================================\n");
      return resolve(true);
    }

    const remitenteCorreo = process.env.CORREO_USUARIO || process.env.BREVO_SENDER_EMAIL || 'tandapp.oficial@gmail.com';
    const remitenteNombre = process.env.BREVO_SENDER_NAME || 'SubastasPro';

    const payload = JSON.stringify({
      sender: { name: remitenteNombre, email: remitenteCorreo },
      to: [{ email: opciones.to }],
      subject: opciones.subject,
      htmlContent: opciones.html
    });

    const reqOptions = {
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'content-type': 'application/json',
        'accept': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✅ [Brevo API] Correo enviado exitosamente a ${opciones.to}`);
          resolve(true);
        } else {
          console.error('❌ [Brevo API Error]:', res.statusCode, body);
          reject(new Error(`Brevo API respondió con estado ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (err) => {
      console.error('❌ Error de red contactando a Brevo API:', err);
      reject(err);
    });

    req.write(payload);
    req.end();
  });
};

/**
 * Envía un código OTP de 6 dígitos para verificación de registro.
 * @param {string} correoDestino - Correo del usuario.
 * @param {string} codigo - Código de 6 dígitos.
 */
const enviarCodigoVerificacion = async (correoDestino, codigo) => {
  const plantillaHtml = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Código de Verificación - SubastasPro</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #090d16; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #f8fafc;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #090d16; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" max-width="500" cellspacing="0" cellpadding="0" style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; max-width: 500px;">
              <!-- Header -->
              <tr>
                <td align="center" style="padding-bottom: 24px;">
                  <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #d97706; letter-spacing: -0.5px;">
                    🔨 SubastasPro
                  </h1>
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="text-align: center; padding-bottom: 24px;">
                  <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #ffffff;">
                    Verifica tu dirección de correo
                  </h2>
                  <p style="margin: 0; font-size: 14px; color: #94a3b8; line-height: 1.5;">
                    Gracias por registrarte en SubastasPro. Usa el siguiente código de verificación para completar tu cuenta:
                  </p>
                </td>
              </tr>
              <!-- OTP Box -->
              <tr>
                <td align="center" style="padding-bottom: 24px;">
                  <div style="background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 18px 24px; display: inline-block; letter-spacing: 10px; font-size: 32px; font-weight: 800; color: #d97706; text-align: center;">
                    ${codigo}
                  </div>
                </td>
              </tr>
              <!-- Notice -->
              <tr>
                <td style="text-align: center; padding-bottom: 12px;">
                  <p style="margin: 0; font-size: 13px; color: #64748b;">
                    Este código expira en <strong>10 minutos</strong>. No compartas este código con nadie.
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="border-top: 1px solid #1e293b; padding-top: 20px; text-align: center;">
                  <p style="margin: 0; font-size: 12px; color: #475569;">
                    Si no solicitaste este código, puedes ignorar este mensaje.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    return await despacharCorreo({
      to: correoDestino,
      subject: `${codigo} es tu código de verificación de SubastasPro`,
      html: plantillaHtml
    });
  } catch (error) {
    console.error(`❌ No se pudo enviar correo de verificación a ${correoDestino}:`, error.message);
    throw new Error(`Error al enviar el correo con el código: ${error.message}`);
  }
};

/**
 * Envía un código OTP de 6 dígitos para recuperación de contraseña.
 * @param {string} correoDestino - Correo del usuario.
 * @param {string} codigo - Código de 6 dígitos.
 */
const enviarCodigoRecuperacion = async (correoDestino, codigo) => {
  const plantillaHtml = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recuperación de Contraseña - SubastasPro</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #090d16; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #f8fafc;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #090d16; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" max-width="500" cellspacing="0" cellpadding="0" style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; max-width: 500px;">
              <!-- Header -->
              <tr>
                <td align="center" style="padding-bottom: 24px;">
                  <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #d97706; letter-spacing: -0.5px;">
                    🔨 SubastasPro
                  </h1>
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="text-align: center; padding-bottom: 24px;">
                  <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #ffffff;">
                    Restablecer Contraseña
                  </h2>
                  <p style="margin: 0; font-size: 14px; color: #94a3b8; line-height: 1.5;">
                    Has solicitado restablecer tu contraseña. Usa el siguiente código de verificación:
                  </p>
                </td>
              </tr>
              <!-- OTP Box -->
              <tr>
                <td align="center" style="padding-bottom: 24px;">
                  <div style="background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 18px 24px; display: inline-block; letter-spacing: 10px; font-size: 32px; font-weight: 800; color: #d97706; text-align: center;">
                    ${codigo}
                  </div>
                </td>
              </tr>
              <!-- Notice -->
              <tr>
                <td style="text-align: center; padding-bottom: 12px;">
                  <p style="margin: 0; font-size: 13px; color: #64748b;">
                    Este código expira en <strong>10 minutos</strong>. Si no solicitaste este cambio, te recomendamos asegurar tu cuenta.
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="border-top: 1px solid #1e293b; padding-top: 20px; text-align: center;">
                  <p style="margin: 0; font-size: 12px; color: #475569;">
                    © SubastasPro. Todos los derechos reservados.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    return await despacharCorreo({
      to: correoDestino,
      subject: `${codigo} es tu código para restablecer tu contraseña en SubastasPro`,
      html: plantillaHtml
    });
  } catch (error) {
    console.error(`❌ No se pudo enviar correo de recuperación a ${correoDestino}:`, error.message);
    throw new Error(`Error al enviar el correo de recuperación: ${error.message}`);
  }
};

module.exports = {
  enviarCodigoVerificacion,
  enviarCodigoRecuperacion
};
