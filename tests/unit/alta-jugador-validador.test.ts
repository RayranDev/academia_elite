import { describe, it, expect } from "vitest";
import {
  altaJugadorSchema,
  altaJugadorDesdeFormData,
  hayAcudiente,
  erroresPorCampo,
  erroresDelPaso,
  pasoDeCampo,
  PASOS_ALTA,
} from "@/lib/validators/alta-jugador";

function form(campos: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(campos)) fd.append(k, v);
  return fd;
}

const MINIMO = {
  nombre: "lucas",
  apellido: "garcía",
  fechaNacimiento: "2014-03-10",
  posicion: "DEL",
  categoriaId: "cat1",
};

const TODO = {
  ...MINIMO,
  dorsal: "9",
  genero: "M",
  tipoDocumento: "TI",
  numeroDocumento: "1023456789",
  eps: "Sura",
  rh: "O+",
  alergias: "Penicilina",
  condicionesMedicas: "Asma leve",
  aptoMedicoVence: "2027-01-15",
  contactoEmergenciaNombre: "rosa pérez",
  contactoEmergenciaTelefono: "300 123 4567",
  contactoEmergenciaParentesco: "Madre",
  autorizaTraslado: "on",
  autorizaDatosSalud: "on",
  acudienteNombre: "rosa pérez",
  acudienteEmail: "  Rosa@Correo.COM ",
  acudienteTelefono: "3001234567",
  acudienteParentesco: "Madre",
  acudienteTipoDocumento: "CC",
  acudienteNumeroDocumento: "52123456",
  acudienteDireccion: "Calle 1 # 2-3",
  acudienteAutoriza: "on",
};

const parsear = (campos: Record<string, string>) =>
  altaJugadorSchema.safeParse(altaJugadorDesdeFormData(form(campos)));

describe("alta completa: lo mínimo alcanza", () => {
  it("solo identidad básica es válido: ficha y acudiente son opcionales", () => {
    const r = parsear(MINIMO);
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.nombre).toBe("Lucas");
    expect(r.data.dorsal).toBeUndefined();
    expect(r.data.genero).toBeUndefined();
    // Ningún dato de salud es obligatorio (Ley 1581).
    expect(r.data.autorizaDatosSalud).toBe(false);
    expect(r.data.eps).toBeNull();
    expect(r.data.rh).toBeNull();
    expect(r.data.alergias).toBeNull();
    expect(r.data.condicionesMedicas).toBeNull();
    expect(r.data.aptoMedicoVence).toBeNull();
    expect(hayAcudiente(r.data)).toBe(false);
  });
});

describe("alta completa: cada campo del formulario llega hasta el resultado", () => {
  // Guarda contra el renombre silencioso: safeParse deja pasar una clave
  // mal escrita y el dato se guarda vacío sin que falle nada más.
  it("mapea y normaliza todos los campos", () => {
    const r = parsear(TODO);
    expect(r.success).toBe(true);
    if (!r.success) return;
    const d = r.data;
    expect(d).toMatchObject({
      nombre: "Lucas",
      apellido: "García",
      posicion: "DEL",
      categoriaId: "cat1",
      dorsal: 9,
      genero: "M",
      tipoDocumento: "TI",
      numeroDocumento: "1023456789",
      eps: "Sura",
      rh: "O+",
      alergias: "Penicilina",
      condicionesMedicas: "Asma leve",
      contactoEmergenciaNombre: "Rosa Pérez",
      contactoEmergenciaTelefono: "300 123 4567",
      contactoEmergenciaParentesco: "Madre",
      autorizaTraslado: true,
      autorizaDatosSalud: true,
      acudienteNombre: "Rosa Pérez",
      acudienteEmail: "rosa@correo.com",
      acudienteTelefono: "3001234567",
      acudienteParentesco: "Madre",
      acudienteTipoDocumento: "CC",
      acudienteNumeroDocumento: "52123456",
      acudienteDireccion: "Calle 1 # 2-3",
      acudienteAutoriza: true,
      contactoEsAcudiente: false,
    });
    expect(d.fechaNacimiento).toBeInstanceOf(Date);
    expect(d.aptoMedicoVence).toBeInstanceOf(Date);
  });

  it("el mapper emite solo campos que algún paso del formulario valida", () => {
    const emitidos = Object.keys(altaJugadorDesdeFormData(new FormData()));
    const cubiertos = new Set(PASOS_ALTA.flatMap((p) => p.campos as readonly string[]));
    const sueltos = emitidos.filter((k) => !cubiertos.has(k));
    expect(sueltos).toEqual([]);
  });
});

describe("alta completa: identidad", () => {
  it("rechaza una fecha de nacimiento futura", () => {
    const r = parsear({ ...MINIMO, fechaNacimiento: "2999-01-01" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(erroresPorCampo(r.error.issues).fechaNacimiento).toBe(
        "La fecha de nacimiento no puede ser futura.",
      );
    }
  });

  it("el dorsal vacío es válido, el 0 o el 101 no", () => {
    expect(parsear({ ...MINIMO, dorsal: "" }).success).toBe(true);
    expect(parsear({ ...MINIMO, dorsal: "0" }).success).toBe(false);
    expect(parsear({ ...MINIMO, dorsal: "101" }).success).toBe(false);
  });

  it("exige nombre, apellido, fecha, posición y categoría", () => {
    const r = altaJugadorSchema.safeParse(altaJugadorDesdeFormData(new FormData()));
    expect(r.success).toBe(false);
    if (r.success) return;
    const campos = Object.keys(erroresPorCampo(r.error.issues));
    expect(campos).toEqual(
      expect.arrayContaining(["nombre", "apellido", "fechaNacimiento", "posicion", "categoriaId"]),
    );
  });
});

describe("alta completa: texto libre sanitizado (textoSeguro)", () => {
  const PELIGROSO = "<script>alert(1)</script>";

  it.each([
    "nombre",
    "alergias",
    "condicionesMedicas",
    "eps",
    "contactoEmergenciaNombre",
    "acudienteNombre",
    "acudienteDireccion",
  ])("rechaza HTML en %s", (campo) => {
    const base = campo === "acudienteNombre" || campo === "acudienteDireccion"
      ? { ...MINIMO, acudienteNombre: "Rosa", acudienteEmail: "r@x.co", acudienteAutoriza: "on" }
      : MINIMO;
    const r = parsear({ ...base, [campo]: PELIGROSO });
    expect(r.success).toBe(false);
  });
});

describe("alta completa: acudiente", () => {
  it("si se carga algún dato del acudiente, exige nombre, correo y autorización", () => {
    const r = parsear({ ...MINIMO, acudienteTelefono: "3001234567" });
    expect(r.success).toBe(false);
    if (r.success) return;
    const e = erroresPorCampo(r.error.issues);
    expect(e.acudienteNombre).toBeDefined();
    expect(e.acudienteEmail).toMatch(/usuario con el que va a ingresar/);
    expect(e.acudienteAutoriza).toBeDefined();
  });

  it("con nombre, correo y autorización es válido", () => {
    const r = parsear({
      ...MINIMO,
      acudienteNombre: "Rosa",
      acudienteEmail: "rosa@correo.com",
      acudienteAutoriza: "on",
    });
    expect(r.success).toBe(true);
  });

  it("rechaza un correo inválido", () => {
    const r = parsear({
      ...MINIMO,
      acudienteNombre: "Rosa",
      acudienteEmail: "no-es-un-correo",
      acudienteAutoriza: "on",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(erroresPorCampo(r.error.issues).acudienteEmail).toBe(
        "El correo del acudiente no es válido.",
      );
    }
  });

  it("usar el acudiente como contacto de emergencia exige haber cargado al acudiente", () => {
    const r = parsear({ ...MINIMO, contactoEsAcudiente: "on" });
    expect(r.success).toBe(false);
    if (!r.success) expect(erroresPorCampo(r.error.issues).contactoEsAcudiente).toBeDefined();
  });

  it("el documento fiscal del acudiente no admite RC ni TI (son del menor)", () => {
    const r = parsear({
      ...MINIMO,
      acudienteNombre: "Rosa",
      acudienteEmail: "rosa@correo.com",
      acudienteAutoriza: "on",
      acudienteTipoDocumento: "TI",
    });
    expect(r.success).toBe(false);
  });
});

describe("validación por paso", () => {
  it("erroresDelPaso deja solo los campos de ese paso", () => {
    const errores = {
      nombre: "Nombre requerido.",
      eps: "x",
      acudienteEmail: "y",
    };
    expect(erroresDelPaso(errores, 0)).toEqual({ nombre: "Nombre requerido." });
    expect(erroresDelPaso(errores, 1)).toEqual({ eps: "x" });
    expect(erroresDelPaso(errores, 2)).toEqual({ acudienteEmail: "y" });
  });

  it("pasoDeCampo ubica cada campo y devuelve -1 si no es de ningún paso", () => {
    expect(pasoDeCampo("nombre")).toBe(0);
    expect(pasoDeCampo("alergias")).toBe(1);
    expect(pasoDeCampo("acudienteNombre")).toBe(2);
    expect(pasoDeCampo("inexistente")).toBe(-1);
  });

  it("erroresPorCampo se queda con el primer mensaje de cada campo", () => {
    expect(
      erroresPorCampo([
        { path: ["nombre"], message: "a" },
        { path: ["nombre"], message: "b" },
        { path: ["apellido"], message: "c" },
      ]),
    ).toEqual({ nombre: "a", apellido: "c" });
  });
});
