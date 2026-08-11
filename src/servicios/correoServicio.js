const nodemailer = require("nodemailer");
const dns = require("dns");

// Forzar a Node.js a resolver primero IPv4 para conectarse a Gmail SMTP (evita ENETUNREACH IPv6 en Render)
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Ignorar en entornos sin soporte
}

// Configuración del transportador Nodemailer
const crearTransportador = () => {
  const usuario = process.env.CORREO_USUARIO;
  let clave = process.env.CORREO_CLAVE;

  if (!usuario || !clave) {
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: parseInt(process.env.CORREO_PUERTO || "587", 10),
    secure: false, // 587 usa STARTTLS (compatible con Render)
    lookup: (hostname, options, callback) => {
      dns.lookup(hostname, { family: 4 }, callback);
    },
    auth: {
      user: usuario,
      pass: claveLimpia
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000
  });
};

/**
 * Envía un código OTP de 6 dígitos para verificación de registro.
 * @param {string} correoDestino - Correo Gmail del usuario.
 * @param {string} codigo - Código de 6 dígitos.
 */
const enviarCodigoVerificacion = async (correoDestino, codigo) => {
  const transportador = crearTransportador();

  // Fallback de desarrollo si aún no se han configurado credenciales en el .env
  if (!transportador) {
    console.log("\n==========================================");
    console.log("⚠️ [MODO DESARROLLO - CORREO NO CONFIGURADO]");
    console.log(`✉️ Código de verificación para ${correoDestino}: [ ${codigo} ]`);
    console.log("Configura CORREO_USUARIO y CORREO_CLAVE en tu .env para envío real.");
    console.log("==========================================\n");
    return true;
  }

  const remitente = process.env.CORREO_REMITENTE || `"SubastasPro" <${process.env.CORREO_USUARIO}>`;

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
                  <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #10b981; letter-spacing: -0.5px;">
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
                    Gracias por registrarte en SubastasPro. Usa el siguiente código de verificación para completar la creación de tu cuenta:
                  </p>
                </td>
              </tr>
              <!-- OTP Box -->
              <tr>
                <td align="center" style="padding-bottom: 24px;">
                  <div style="background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 18px 24px; display: inline-block; letter-spacing: 10px; font-size: 32px; font-weight: 800; color: #10b981; text-align: center;">
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
    const info = await transportador.sendMail({
      from: remitente,
      to: correoDestino,
      subject: `${codigo} es tu código de verificación de SubastasPro`,
      html: plantillaHtml
    });

    console.log(`✉️ Correo de verificación enviado con éxito a ${correoDestino} (ID: ${info.messageId})`);
    return true;
  } catch (error) {
    console.error(`❌ [Nodemailer Error] No se pudo enviar correo a ${correoDestino}:`, error.message);
    throw new Error(`Error al enviar el correo con el código: ${error.message}`);
  }
};

/**
 * Envía un código OTP de 6 dígitos para recuperación de contraseña.
 * @param {string} correoDestino - Correo Gmail del usuario.
 * @param {string} codigo - Código de 6 dígitos.
 */
const enviarCodigoRecuperacion = async (correoDestino, codigo) => {
  const transportador = crearTransportador();

  if (!transportador) {
    console.log("\n==========================================");
    console.log("⚠️ [MODO DESARROLLO - CORREO NO CONFIGURADO]");
    console.log(`🔑 Código de RECUPERACIÓN DE CONTRASEÑA para ${correoDestino}: [ ${codigo} ]`);
    console.log("Configura CORREO_USUARIO y CORREO_CLAVE en tu .env para envío real.");
    console.log("==========================================\n");
    return true;
  }

  const remitente = process.env.CORREO_REMITENTE || `"SubastasPro" <${process.env.CORREO_USUARIO}>`;

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
                    Restablecer tu contraseña
                  </h2>
                  <p style="margin: 0; font-size: 14px; color: #94a3b8; line-height: 1.5;">
                    Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Ingresa el siguiente código de seguridad de 6 dígitos:
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
    const info = await transportador.sendMail({
      from: remitente,
      to: correoDestino,
      subject: `${codigo} es tu código para restablecer tu contraseña en SubastasPro`,
      html: plantillaHtml
    });

    console.log(`✉️ Correo de recuperación enviado con éxito a ${correoDestino} (ID: ${info.messageId})`);
    return true;
  } catch (error) {
    console.error(`❌ [Nodemailer Error] No se pudo enviar correo de recuperación a ${correoDestino}:`, error.message);
    throw new Error(`Error al enviar el correo de recuperación: ${error.message}`);
  }
};

module.exports = {
  enviarCodigoVerificacion,
  enviarCodigoRecuperacion
};
