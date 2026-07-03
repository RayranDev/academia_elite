import { z } from "zod";
import { formatearNombre } from "@/lib/texto/formatear-nombre";
import { textoSeguro } from "@/lib/validators/sanitizar";

// Validadores del autoservicio de "Mi cuenta" (JUGADOR / DT): editar el nombre
// y cambiar el email con confirmación por código enviado al correo nuevo.

export const actualizarNombreSchema = z.object({
  nombre: textoSeguro({ min: 2, max: 120, error: "Nombre requerido." }).transform(
    formatearNombre,
  ),
});

export const solicitarCambioEmailSchema = z.object({
  email: z.email({ error: "Email inválido." }).trim().toLowerCase(),
});

export const confirmarCambioEmailSchema = z.object({
  codigo: z
    .string()
    .trim()
    .regex(/^\d{6}$/, { error: "El código son 6 dígitos." }),
});
