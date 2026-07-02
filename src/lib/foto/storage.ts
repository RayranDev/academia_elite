import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Almacenamiento de archivos subidos (fotos de jugadores y escudos) en
 * Supabase Storage, bucket PRIVADO. Se accede con la service role key
 * (server-only, bypassa RLS): los archivos NUNCA se exponen por URL pública
 * ni firmada — siempre se sirven a través de las rutas `/api/archivos/*`,
 * que aplican sesión, tenant y consentimiento.
 *
 * Las claves de objeto son los nombres UUID que ya persisten `fotoUrl` /
 * `logoUrl` (sin ruta), idénticos a los usados en la fase de disco local.
 */
const BUCKET = "archivos";

let cliente: SupabaseClient | null = null;

function storage() {
  if (!cliente) {
    const url = process.env.SUPABASE_URL;
    // Proyectos nuevos de Supabase emiten "secret key" (sb_secret_...);
    // los viejos, "service_role". Ambas sirven: acceso total server-only.
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) {
      throw new Error(
        "SUPABASE_URL y SUPABASE_SECRET_KEY (o SUPABASE_SERVICE_ROLE_KEY) son requeridas para el storage.",
      );
    }
    cliente = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cliente.storage.from(BUCKET);
}

/** Evita path traversal: solo nombres de archivo simples (UUID.ext). */
function nombreValido(nombre: string): boolean {
  return !(nombre.includes("/") || nombre.includes("\\") || nombre.includes(".."));
}

function contentTypeDe(nombre: string): string {
  return nombre.endsWith(".png") ? "image/png" : "image/webp";
}

export async function guardarFoto(nombre: string, buf: Buffer): Promise<void> {
  if (!nombreValido(nombre)) {
    throw new Error("Nombre de archivo inválido.");
  }
  const { error } = await storage().upload(nombre, buf, {
    contentType: contentTypeDe(nombre),
    upsert: true,
  });
  if (error) {
    throw new Error(`No se pudo guardar el archivo: ${error.message}`);
  }
}

export async function leerFoto(nombre: string): Promise<Buffer | null> {
  if (!nombreValido(nombre)) return null;
  const { data, error } = await storage().download(nombre);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

/**
 * Borra un archivo (best-effort: un fallo no rompe el flujo del usuario).
 * Se usa al re-subir para no acumular huérfanos en el bucket.
 */
export async function borrarFoto(nombre: string | null | undefined): Promise<void> {
  if (!nombre || !nombreValido(nombre)) return;
  try {
    await storage().remove([nombre]);
  } catch {
    // El huérfano queda; no es motivo para fallar la subida nueva.
  }
}
