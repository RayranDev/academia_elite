import { describe, it, expect, vi } from "vitest";

// El servicio importa el repositorio, que a su vez instancia el cliente Prisma
// al importar `@/lib/db` (mismo patrón que auditoria-superadmin.test.ts): se
// mockea acá para no abrir la BD real y poder fijar la fila que "lee" el repo.
vi.mock("@/lib/db", () => ({
  db: { escuela: { findUnique: vi.fn() } },
}));

// El storage es `server-only` y habla con Supabase: se reemplaza por un fake
// que devuelve un buffer para cualquier nombre de archivo.
vi.mock("@/lib/foto/storage", () => ({
  leerFoto: vi.fn(async () => Buffer.from("png")),
}));

import { db } from "@/lib/db";
import { leerFoto } from "@/lib/foto/storage";
import { obtenerEscudoPublico, obtenerLandingPublica } from "@/services/landing.service";
import {
  aLandingPublicaDTO,
  rangoEdadCategoria,
  type EscuelaPublicaRow,
} from "@/lib/mappers/landing-publica";
import { landingSchema } from "@/lib/validators/landing";

// Mock genérico y sin tipar del lado Prisma: alcanza para fijar el valor que
// resuelve `findUnique`, sin pelear con los tipos generados de `GetPayload`.
const findUniqueMock = db.escuela.findUnique as unknown as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Validador
// ---------------------------------------------------------------------------

describe("landingSchema", () => {
  const base = { publicada: true };

  it("normaliza WhatsApp con separadores a solo dígitos", () => {
    const r = landingSchema.safeParse({ ...base, whatsapp: "+57 300 123 4567" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.whatsapp).toBe("573001234567");
  });

  it("rechaza un WhatsApp con menos de 8 dígitos", () => {
    const r = landingSchema.safeParse({ ...base, whatsapp: "12345" });
    expect(r.success).toBe(false);
  });

  it("normaliza Instagram desde @usuario y desde una URL completa", () => {
    const r1 = landingSchema.safeParse({ ...base, instagram: "@academia.elite" });
    expect(r1.success).toBe(true);
    if (r1.success) expect(r1.data.instagram).toBe("academia.elite");

    const r2 = landingSchema.safeParse({
      ...base,
      instagram: "https://www.instagram.com/academia.elite/",
    });
    expect(r2.success).toBe(true);
    if (r2.success) expect(r2.data.instagram).toBe("academia.elite");
  });

  it("rechaza un handle de Instagram con caracteres fuera del catálogo", () => {
    expect(landingSchema.safeParse({ ...base, instagram: "no valido!" }).success).toBe(
      false,
    );
  });

  it("rechaza un heroId que no está en el catálogo", () => {
    expect(
      landingSchema.safeParse({ ...base, heroId: "portada-inventada" }).success,
    ).toBe(false);
  });

  it("acepta un heroId del catálogo", () => {
    const r = landingSchema.safeParse({ ...base, heroId: "cancha-verde" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.heroId).toBe("cancha-verde");
  });

  it("campos de texto vacíos se guardan como null", () => {
    const r = landingSchema.safeParse({
      ...base,
      titular: "",
      descripcion: "",
      whatsapp: "",
      email: "",
      instagram: "",
      heroId: "",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.titular).toBeNull();
      expect(r.data.descripcion).toBeNull();
      expect(r.data.whatsapp).toBeNull();
      expect(r.data.email).toBeNull();
      expect(r.data.instagram).toBeNull();
      expect(r.data.heroId).toBeNull();
    }
  });

  it("rechaza HTML/script en el titular", () => {
    const r = landingSchema.safeParse({
      ...base,
      titular: "<script>alert(1)</script>",
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe("No se permite contenido HTML ni scripts.");
  });

  it("un titular demasiado largo muestra el mensaje propio, no el genérico de Zod", () => {
    const r = landingSchema.safeParse({ ...base, titular: "a".repeat(81) });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe("El titular no puede superar los 80 caracteres.");
  });

  it("rechaza un email inválido", () => {
    expect(landingSchema.safeParse({ ...base, email: "no-es-un-email" }).success).toBe(
      false,
    );
  });

  it("un email demasiado largo muestra el mensaje propio, no el genérico de Zod", () => {
    const emailLargo = `${"a".repeat(250)}@a.com`; // 256 caracteres
    const r = landingSchema.safeParse({ ...base, email: emailLargo });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe(
      "El email no puede superar los 254 caracteres.",
    );
  });

  it("acepta y normaliza un email válido a minúsculas", () => {
    const r = landingSchema.safeParse({ ...base, email: "Contacto@ESCUELA.com" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("contacto@escuela.com");
  });
});

// ---------------------------------------------------------------------------
// Rango de edad de una categoría
// ---------------------------------------------------------------------------

describe("rangoEdadCategoria", () => {
  it("categoría sin años -> null (no clasifica por edad)", () => {
    expect(rangoEdadCategoria(null, null, 2026)).toBeNull();
  });

  it("calcula el rango a partir de años de nacimiento", () => {
    // Sub-8: nacidos 2018–2019 -> en 2026 tienen 7 y 8 años.
    expect(rangoEdadCategoria(2018, 2019, 2026)).toBe("7-8 años");
    // Sub-14: nacidos 2012–2013 -> en 2026 tienen 13 y 14 años.
    expect(rangoEdadCategoria(2012, 2013, 2026)).toBe("13-14 años");
  });

  it("un único año de nacimiento da una edad puntual", () => {
    expect(rangoEdadCategoria(2018, 2018, 2026)).toBe("8 años");
  });

  it("solo anioDesde (edad máxima) o solo anioHasta (edad mínima)", () => {
    expect(rangoEdadCategoria(2018, null, 2026)).toBe("Hasta 8 años");
    expect(rangoEdadCategoria(null, 2019, 2026)).toBe("Desde 7 años");
  });
});

// ---------------------------------------------------------------------------
// Mapper: whitelist explícita (nunca filtra jugadores/cartas/fotos)
// ---------------------------------------------------------------------------

describe("aLandingPublicaDTO — whitelist", () => {
  const rowConDatosSensibles = {
    nombre: "Academia Test",
    slug: "test",
    logoUrl: null,
    colorPrimario: "#4ADE80",
    landingTitular: "Bienvenidos",
    landingDescripcion: "Descripción",
    landingHeroId: "cancha-verde",
    contactoWhatsapp: "573001234567",
    contactoEmail: "contacto@test.com",
    contactoInstagram: "test",
    categorias: [{ nombre: "Sub-14", anioDesde: 2012, anioHasta: 2013 }],
    sedes: [{ nombre: "Sede Central", direccion: "Calle 1" }],
    // Campos que NUNCA deben llegar a un visitante sin sesión (Sección 5
    // AGENTS.md): se agregan acá para probar que el mapper los descarta aunque
    // la fila de origen los traiga (ej. un `include` demasiado generoso aguas
    // arriba no debería filtrar nada por accidente).
    jugadores: [{ id: "j1", nombre: "Menor Ejemplo", fotoUrl: "foto.webp" }],
    entrenadores: [{ id: "e1", nombre: "DT Ejemplo" }],
    _count: { jugadores: 42 },
  } as unknown as EscuelaPublicaRow;

  it("solo expone los campos de escaparate + contacto", () => {
    const dto = aLandingPublicaDTO(rowConDatosSensibles);
    const claves = Object.keys(dto);
    expect(claves.sort()).toEqual(
      [
        "nombre",
        "slug",
        "tieneEscudo",
        "colorPrimario",
        "titular",
        "descripcion",
        "hero",
        "whatsappUrl",
        "email",
        "instagramUrl",
        "categorias",
        "sedes",
      ].sort(),
    );
    // @ts-expect-error — nunca debe existir esta clave en el DTO público.
    expect(dto.jugadores).toBeUndefined();
    // @ts-expect-error — nunca debe existir esta clave en el DTO público.
    expect(dto.entrenadores).toBeUndefined();
  });

  it("las categorías del DTO solo traen nombre + rango de edad", () => {
    const dto = aLandingPublicaDTO(rowConDatosSensibles);
    expect(dto.categorias).toEqual([{ nombre: "Sub-14", rangoEdad: expect.any(String) }]);
  });

  it("arma los links de contacto (wa.me / instagram) desde los datos crudos", () => {
    const dto = aLandingPublicaDTO(rowConDatosSensibles);
    expect(dto.whatsappUrl).toBe("https://wa.me/573001234567");
    expect(dto.instagramUrl).toBe("https://instagram.com/test");
    expect(dto.email).toBe("contacto@test.com");
  });

  it("sin contacto cargado, los links quedan en null (secciones se ocultan en la UI)", () => {
    const dto = aLandingPublicaDTO({
      ...rowConDatosSensibles,
      contactoWhatsapp: null,
      contactoInstagram: null,
      contactoEmail: null,
    });
    expect(dto.whatsappUrl).toBeNull();
    expect(dto.instagramUrl).toBeNull();
    expect(dto.email).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Servicio: resolución de estado (no-encontrada / en-construccion / publicada)
// ---------------------------------------------------------------------------

describe("obtenerLandingPublica — resolución de estado", () => {
  const filaBase = {
    nombre: "Academia Test",
    slug: "test",
    logoUrl: null,
    colorPrimario: "#4ADE80",
    activa: true,
    landingPublicada: false,
    landingTitular: null,
    landingDescripcion: null,
    landingHeroId: null,
    contactoWhatsapp: null,
    contactoEmail: null,
    contactoInstagram: null,
    categorias: [],
    sedes: [],
  };

  it("slug inexistente -> no-encontrada", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    const r = await obtenerLandingPublica("no-existe");
    expect(r.estado).toBe("no-encontrada");
  });

  it("escuela inactiva -> no-encontrada (mismo 404 que un slug inexistente)", async () => {
    findUniqueMock.mockResolvedValueOnce({ ...filaBase, activa: false });
    const r = await obtenerLandingPublica("test");
    expect(r.estado).toBe("no-encontrada");
  });

  it("activa pero sin publicar -> en-construccion, con solo nombre/marca", async () => {
    findUniqueMock.mockResolvedValueOnce({ ...filaBase, landingPublicada: false });
    const r = await obtenerLandingPublica("test");
    expect(r.estado).toBe("en-construccion");
    if (r.estado === "en-construccion") {
      expect(r.nombre).toBe("Academia Test");
      expect(r.colorPrimario).toBe("#4ADE80");
      expect(r.tieneEscudo).toBe(false);
    }
  });

  it("en-construccion con escudo cargado -> tieneEscudo true (sin exponer la key cruda)", async () => {
    findUniqueMock.mockResolvedValueOnce({
      ...filaBase,
      landingPublicada: false,
      logoUrl: "escudo-1.png",
    });
    const r = await obtenerLandingPublica("test");
    expect(r.estado).toBe("en-construccion");
    if (r.estado === "en-construccion") {
      expect(r.tieneEscudo).toBe(true);
      // @ts-expect-error — nunca debe existir esta clave: solo el booleano.
      expect(r.logoUrl).toBeUndefined();
    }
  });

  it("activa y publicada -> publicada, con el DTO completo", async () => {
    findUniqueMock.mockResolvedValueOnce({
      ...filaBase,
      landingPublicada: true,
      landingTitular: "Bienvenidos",
      contactoWhatsapp: "573001234567",
    });
    const r = await obtenerLandingPublica("test");
    expect(r.estado).toBe("publicada");
    if (r.estado === "publicada") {
      expect(r.data.titular).toBe("Bienvenidos");
      expect(r.data.whatsappUrl).toBe("https://wa.me/573001234567");
    }
  });

  it("escudo público: escuela activa con logo -> lo sirve, aunque no haya publicado", async () => {
    findUniqueMock.mockResolvedValueOnce({ ...filaBase, logoUrl: "escudo-1.png" });
    const buf = await obtenerEscudoPublico("test");
    expect(buf).not.toBeNull();
    expect(leerFoto).toHaveBeenCalledWith("escudo-1.png");
  });

  it("escudo público: escuela inactiva -> null, sin leer el archivo", async () => {
    vi.mocked(leerFoto).mockClear();
    findUniqueMock.mockResolvedValueOnce({ ...filaBase, activa: false, logoUrl: "escudo-1.png" });
    expect(await obtenerEscudoPublico("test")).toBeNull();
    expect(leerFoto).not.toHaveBeenCalled();
  });

  it("escudo público: slug inexistente o sin logo -> null", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    expect(await obtenerEscudoPublico("no-existe")).toBeNull();
    findUniqueMock.mockResolvedValueOnce({ ...filaBase, logoUrl: null });
    expect(await obtenerEscudoPublico("test")).toBeNull();
  });
});
