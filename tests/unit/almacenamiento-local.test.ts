import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// `storage.ts` es `server-only` y trae el cliente de Supabase: en el modo local
// nunca debe usarse. Si algún camino llegara a crearlo, el mock lo delata.
const { crearClienteSupabase } = vi.hoisted(() => ({
  crearClienteSupabase: vi.fn(() => {
    throw new Error("No debe usarse Supabase en modo local.");
  }),
}));
vi.mock("server-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({ createClient: crearClienteSupabase }));

import {
  directorioLocalDesdeEnv,
  nombreValido,
} from "@/lib/foto/almacenamiento-local";
import { borrarFoto, guardarFoto, leerFoto } from "@/lib/foto/storage";

let dir: string;
const ENV_ORIGINAL = { ...process.env };

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "almacenamiento-local-"));
  delete process.env.SUPABASE_URL;
  delete process.env.VERCEL;
  process.env.ALMACENAMIENTO_LOCAL_DIR = dir;
  crearClienteSupabase.mockClear();
});

afterEach(async () => {
  process.env = { ...ENV_ORIGINAL };
  await rm(dir, { recursive: true, force: true });
});

describe("directorioLocalDesdeEnv", () => {
  it("devuelve null si la variable no está o está vacía", () => {
    expect(directorioLocalDesdeEnv({})).toBeNull();
    expect(directorioLocalDesdeEnv({ ALMACENAMIENTO_LOCAL_DIR: "  " })).toBeNull();
  });

  it("devuelve la ruta absoluta cuando está definida", () => {
    expect(directorioLocalDesdeEnv({ ALMACENAMIENTO_LOCAL_DIR: dir })).toBe(path.resolve(dir));
  });

  it("lanza si convive con SUPABASE_URL (configuración ambigua)", () => {
    expect(() =>
      directorioLocalDesdeEnv({
        ALMACENAMIENTO_LOCAL_DIR: dir,
        SUPABASE_URL: "https://x.supabase.co",
      }),
    ).toThrow(/ambigua/i);
  });

  it("un SUPABASE_URL vacío no cuenta como definido", () => {
    expect(
      directorioLocalDesdeEnv({ ALMACENAMIENTO_LOCAL_DIR: dir, SUPABASE_URL: "" }),
    ).toBe(path.resolve(dir));
  });

  it("lanza en Vercel", () => {
    expect(() =>
      directorioLocalDesdeEnv({ ALMACENAMIENTO_LOCAL_DIR: dir, VERCEL: "1" }),
    ).toThrow(/Vercel/);
  });
});

describe("nombreValido", () => {
  it("rechaza path traversal y vacíos", () => {
    for (const malo of ["", "../x.webp", "a/b.webp", "a\\b.webp", ".."]) {
      expect(nombreValido(malo)).toBe(false);
    }
    expect(nombreValido("3f2a.webp")).toBe(true);
  });
});

describe("storage en modo local", () => {
  it("guarda, lee y borra en el directorio, sin tocar Supabase", async () => {
    const buf = Buffer.from("contenido de prueba");
    await guardarFoto("abc.webp", buf);
    expect((await readFile(path.join(dir, "abc.webp"))).equals(buf)).toBe(true);

    expect((await leerFoto("abc.webp"))?.equals(buf)).toBe(true);

    await borrarFoto("abc.webp");
    expect(await leerFoto("abc.webp")).toBeNull();
    expect(crearClienteSupabase).not.toHaveBeenCalled();
  });

  it("crea el directorio si no existe", async () => {
    process.env.ALMACENAMIENTO_LOCAL_DIR = path.join(dir, "anidado", "uploads");
    await guardarFoto("x.png", Buffer.from("png"));
    expect((await leerFoto("x.png"))?.toString()).toBe("png");
  });

  it("rechaza nombres con path traversal al guardar y al leer", async () => {
    await expect(guardarFoto("../fuera.webp", Buffer.from("x"))).rejects.toThrow(/inválido/);
    await writeFile(path.join(path.dirname(dir), "secreto.txt"), "no");
    expect(await leerFoto("../secreto.txt")).toBeNull();
    await rm(path.join(path.dirname(dir), "secreto.txt"), { force: true });
  });

  it("leer un archivo inexistente devuelve null", async () => {
    expect(await leerFoto("no-existe.webp")).toBeNull();
  });

  it("borrar un archivo inexistente no lanza", async () => {
    await expect(borrarFoto("no-existe.webp")).resolves.toBeUndefined();
    await expect(borrarFoto(null)).resolves.toBeUndefined();
  });

  it("falla ruidoso si además hay SUPABASE_URL", async () => {
    process.env.SUPABASE_URL = "https://x.supabase.co";
    await expect(guardarFoto("a.webp", Buffer.from("x"))).rejects.toThrow(/ambigua/i);
    await expect(leerFoto("a.webp")).rejects.toThrow(/ambigua/i);
    expect(crearClienteSupabase).not.toHaveBeenCalled();
  });
});

describe("storage sin ALMACENAMIENTO_LOCAL_DIR", () => {
  it("conserva el comportamiento actual: usa Supabase (y exige sus claves)", async () => {
    delete process.env.ALMACENAMIENTO_LOCAL_DIR;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SECRET_KEY;
    await expect(guardarFoto("a.webp", Buffer.from("x"))).rejects.toThrow(/SUPABASE_URL/);
  });
});
