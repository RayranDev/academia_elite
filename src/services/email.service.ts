import { enviarEmail } from "@/lib/email/resend";
import * as plantillas from "@/lib/email/plantillas";

/**
 * Capa de dominio del correo (Capa 3). Cada función arma su plantilla y delega
 * en el cliente de bajo nivel. No accede a la BD: recibe ya los datos resueltos
 * (links/códigos los generan los servicios de auth, que viven en su propia capa).
 *
 * El rate limiting de los flujos disparados por el usuario (recuperación, OTP,
 * reenvíos) vive en sus acciones/servicios, no acá: este módulo solo envía.
 */

/** Alta de cuenta: código para que el responsable fije su contraseña (+ enlace de comodidad). */
export async function enviarSetPassword(
  to: string,
  nombre: string,
  codigo: string,
  url: string,
): Promise<void> {
  await enviarEmail({ to, ...plantillas.setPassword(nombre, codigo, url) });
}

/** Recuperación de contraseña (código). */
export async function enviarRecuperacion(to: string, codigo: string): Promise<void> {
  await enviarEmail({ to, ...plantillas.recuperacion(codigo) });
}

/** Verificación de correo tras el registro (código). */
export async function enviarVerificacion(
  to: string,
  nombre: string,
  codigo: string,
): Promise<void> {
  await enviarEmail({ to, ...plantillas.verificacion(nombre, codigo) });
}

/** Código de un solo uso para login/acción sensible. */
export async function enviarOtp(to: string, codigo: string): Promise<void> {
  await enviarEmail({ to, ...plantillas.otp(codigo) });
}

/** Código para confirmar un cambio de correo. Se envía al correo NUEVO. */
export async function enviarCodigoCambioEmail(
  to: string,
  codigo: string,
): Promise<void> {
  await enviarEmail({ to, ...plantillas.cambioEmail(codigo) });
}

/** Envío de un código de invitación a una familia. */
export async function enviarCodigoInvitacion(
  to: string,
  codigo: string,
  escuela: string,
  categoria: string,
): Promise<void> {
  await enviarEmail({
    to,
    ...plantillas.codigoInvitacion(codigo, escuela, categoria),
  });
}

/** Acuse al interesado del formulario de contacto. */
export async function enviarConfirmacionLead(
  to: string,
  nombre: string,
): Promise<void> {
  await enviarEmail({ to, ...plantillas.confirmacionLead(nombre) });
}

/** Aviso interno al equipo de un nuevo lead. */
export async function enviarAvisoLeadEquipo(datos: {
  nombreEscuela: string;
  contactoNombre: string;
  contactoEmail: string;
  telefono: string;
  ciudad?: string;
  mensaje?: string;
}): Promise<void> {
  const to = process.env.EMAIL_EQUIPO;
  if (!to) return; // sin buzón de equipo configurado, no es un error: se omite.
  await enviarEmail({ to, ...plantillas.avisoLeadEquipo(datos) });
}
