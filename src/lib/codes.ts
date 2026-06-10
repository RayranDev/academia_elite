// Generación de códigos de invitación cripto-seguros (Sección 7, CodigoInvitacion).
// Alfabeto sin caracteres ambiguos (0/O, 1/I/L) para dictado por voz/WhatsApp.
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generarCodigoInvitacion(longitud = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(longitud));
  let out = "";
  for (let i = 0; i < longitud; i++) {
    out += ALFABETO[bytes[i] % ALFABETO.length];
  }
  return out;
}
