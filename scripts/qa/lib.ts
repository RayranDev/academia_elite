import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import net from "node:net";
import path from "node:path";

/**
 * Utilidades compartidas por `entorno.ts` y `detener.ts`.
 * Ver `scripts/qa/README.md` para el panorama completo.
 */

/** Único schema que este entorno puede tocar. Nunca se parametriza. */
export const SCHEMA_QA = "qa";

export const RAIZ = path.resolve(__dirname, "..", "..");
export const DIR_QA = path.join(RAIZ, "scratch", "qa");
export const DIR_UPLOADS = path.join(DIR_QA, "uploads");
/** Carpeta de build del entorno QA, relativa a la raíz (la lee `next.config.ts`). */
export const DIST_DIR_QA = "scratch/qa/next";
export const RUTA_ENTORNO = path.join(DIR_QA, "entorno.json");
export const RUTA_LOG = path.join(DIR_QA, "servidor.log");

export interface CuentaDemo {
  correo: string;
  rol: string;
  escuela: string | null;
}

export interface EntornoQa {
  puerto: number;
  url: string;
  pid: number;
  schema: string;
  uploads: string;
  passwordDemo: string;
  cuentas: CuentaDemo[];
  iniciadoEn: string;
}

export function leerEntorno(): EntornoQa | null {
  if (!existsSync(RUTA_ENTORNO)) return null;
  try {
    return JSON.parse(readFileSync(RUTA_ENTORNO, "utf8")) as EntornoQa;
  } catch {
    return null;
  }
}

export function borrarEntorno(): void {
  rmSync(RUTA_ENTORNO, { force: true });
}

export function pidVivo(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    // EPERM: existe pero no es nuestro; ESRCH: no existe.
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

/**
 * ¿Ese pid es quien escucha en ese puerto? Protege contra la reutilización de
 * pids: un `entorno.json` viejo podría apuntar a un pid que el sistema ya le
 * dio a OTRO proceso, y no queremos matar procesos ajenos.
 */
export function escuchaEnPuerto(pid: number, puerto: number): boolean {
  try {
    if (process.platform === "win32") {
      const salida = execFileSync("netstat", ["-ano", "-p", "TCP"], {
        encoding: "utf8",
        windowsHide: true,
      });
      return salida.split(/\r?\n/).some((linea) => {
        const c = linea.trim().split(/\s+/);
        return (
          c.length >= 5 &&
          c[3] === "LISTENING" &&
          c[1].endsWith(`:${puerto}`) &&
          Number(c[4]) === pid
        );
      });
    }
    const salida = execFileSync(
      "lsof",
      ["-nP", `-iTCP:${puerto}`, "-sTCP:LISTEN", "-t"],
      { encoding: "utf8" },
    );
    return salida.split(/\s+/).some((p) => Number(p) === pid);
  } catch {
    // netstat/lsof no disponible o sin coincidencias.
    return false;
  }
}

/** True si el puerto está libre para escuchar en este equipo. */
export function puertoLibre(puerto: number): Promise<boolean> {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => resolve(false));
    srv.once("listening", () => srv.close(() => resolve(true)));
    srv.listen(puerto);
  });
}

/** Termina SOLO ese proceso y su árbol de hijos. */
export function matarArbol(pid: number): void {
  if (process.platform === "win32") {
    execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }
  try {
    // El servidor se lanza como líder de su propio grupo (detached).
    process.kill(-pid, "SIGTERM");
  } catch {
    process.kill(pid, "SIGTERM");
  }
}

export const dormir = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
