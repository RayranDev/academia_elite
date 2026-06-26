import { Resend } from "resend";

/**
 * Cliente de correo de bajo nivel (Capa lib). No tiene lógica de dominio: solo
 * envía. Los envíos concretos (credenciales, recuperación, etc.) viven en
 * `src/services/email.service.ts`.
 *
 * Modo dev/prueba:
 * - Sin `RESEND_API_KEY` → NO envía nada; loguea el contenido en consola para
 *   poder copiar links/códigos y completar el flujo localmente.
 * - Con `EMAIL_DEV_TO` → redirige TODO el correo a esa casilla. Útil porque el
 *   dominio de pruebas de Resend (`onboarding@resend.dev`) solo entrega al correo
 *   dueño de la cuenta.
 *
 * Un fallo de envío NO rompe el flujo del usuario: se registra y se sigue (las
 * credenciales, por ejemplo, también se muestran en pantalla como respaldo).
 */
export interface EmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

const apiKey = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM ?? "Academia Elite <onboarding@resend.dev>";
const DEV_TO = process.env.EMAIL_DEV_TO;

const cliente = apiKey ? new Resend(apiKey) : null;

export async function enviarEmail(params: EmailParams): Promise<void> {
  const destino = DEV_TO || params.to;

  if (!cliente) {
    console.info(
      `\n[email:dev] (sin RESEND_API_KEY) → ${destino}\n` +
        `  asunto: ${params.subject}\n` +
        `  ----- texto -----\n${params.text}\n  -----------------\n`,
    );
    return;
  }

  try {
    const { error } = await cliente.emails.send({
      from: FROM,
      to: destino,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    if (error) console.error("[email] fallo al enviar:", error);
  } catch (e) {
    console.error("[email] excepción al enviar:", e);
  }
}
