import { describe, it, expect } from "vitest";
import { altaJugadorSchema, altaJugadorDesdeFormData } from "@/lib/validators/alta-jugador";
import {
  alcanceDeRol,
  datosDeJugador,
  datosDeFamilia,
  fichaParaGuardar,
  fichaTieneDatos,
  resolverContactoEmergencia,
  detalleAuditoriaAlta,
} from "@/lib/jugadores/alta";
import { ForbiddenError } from "@/lib/errors";

const AHORA = new Date("2026-09-30T15:00:00.000Z");

function alta(campos: Record<string, string>) {
  const fd = new FormData();
  const base = {
    nombre: "Lucas",
    apellido: "García",
    fechaNacimiento: "2014-03-10",
    posicion: "DEL",
    categoriaId: "cat1",
  };
  for (const [k, v] of Object.entries({ ...base, ...campos })) fd.append(k, v);
  const r = altaJugadorSchema.safeParse(altaJugadorDesdeFormData(fd));
  if (!r.success) throw new Error(JSON.stringify(r.error.issues));
  return r.data;
}

const SALUD = {
  tipoDocumento: "TI",
  numeroDocumento: "1023456789",
  eps: "Sura",
  rh: "O+",
  alergias: "Penicilina",
  condicionesMedicas: "Asma",
  aptoMedicoVence: "2027-01-15",
  contactoEmergenciaNombre: "Rosa Pérez",
  contactoEmergenciaTelefono: "3001234567",
  contactoEmergenciaParentesco: "Madre",
  autorizaTraslado: "on",
};

describe("alcanceDeRol", () => {
  it("el DT tiene alcance acotado; escuela y soporte, completo", () => {
    expect(alcanceDeRol("DT")).toBe("DT");
    expect(alcanceDeRol("ESCUELA_ADMIN")).toBe("ESCUELA");
    expect(alcanceDeRol("SUPER_ADMIN")).toBe("ESCUELA");
  });

  it("la familia no da de alta jugadores", () => {
    expect(() => alcanceDeRol("JUGADOR")).toThrow(ForbiddenError);
  });
});

describe("fichaParaGuardar: consentimiento de salud", () => {
  it("sin autorización descarta TODO dato de salud aunque venga en el request", () => {
    const f = fichaParaGuardar(alta(SALUD), "ESCUELA", AHORA);
    expect(f.eps).toBeNull();
    expect(f.rh).toBeNull();
    expect(f.alergias).toBeNull();
    expect(f.condicionesMedicas).toBeNull();
    expect(f.aptoMedicoVence).toBeNull();
    expect(f.autorizaDatosSalud).toBe(false);
    expect(f.autorizacionDatosSaludEn).toBeNull();
  });

  it("documento y contacto de emergencia no dependen del consentimiento de salud", () => {
    const f = fichaParaGuardar(alta(SALUD), "ESCUELA", AHORA);
    expect(f.tipoDocumento).toBe("TI");
    expect(f.numeroDocumento).toBe("1023456789");
    expect(f.contactoEmergenciaNombre).toBe("Rosa Pérez");
    expect(f.autorizaTraslado).toBe(true);
  });

  it("con autorización la escuela guarda la ficha completa y sella la fecha", () => {
    const f = fichaParaGuardar(alta({ ...SALUD, autorizaDatosSalud: "on" }), "ESCUELA", AHORA);
    expect(f).toMatchObject({
      eps: "Sura",
      rh: "O+",
      alergias: "Penicilina",
      condicionesMedicas: "Asma",
      autorizaDatosSalud: true,
    });
    expect(f.aptoMedicoVence).toBeInstanceOf(Date);
    expect(f.autorizacionDatosSaludEn).toEqual(AHORA);
  });
});

describe("fichaParaGuardar: alcance del DT (lo decide el servidor, no la UI)", () => {
  it("el DT no guarda documento, EPS, RH ni condiciones aunque vengan en el request", () => {
    const f = fichaParaGuardar(alta({ ...SALUD, autorizaDatosSalud: "on" }), "DT", AHORA);
    expect(f.tipoDocumento).toBeNull();
    expect(f.numeroDocumento).toBeNull();
    expect(f.eps).toBeNull();
    expect(f.rh).toBeNull();
    expect(f.condicionesMedicas).toBeNull();
  });

  it("el DT sí guarda lo que ve en cancha: alergias, apto médico, emergencia y traslado", () => {
    const f = fichaParaGuardar(alta({ ...SALUD, autorizaDatosSalud: "on" }), "DT", AHORA);
    expect(f.alergias).toBe("Penicilina");
    expect(f.aptoMedicoVence).toBeInstanceOf(Date);
    expect(f.contactoEmergenciaNombre).toBe("Rosa Pérez");
    expect(f.autorizaTraslado).toBe(true);
    expect(f.autorizaDatosSalud).toBe(true);
  });

  it("el DT sin autorización tampoco guarda alergias ni apto", () => {
    const f = fichaParaGuardar(alta(SALUD), "DT", AHORA);
    expect(f.alergias).toBeNull();
    expect(f.aptoMedicoVence).toBeNull();
  });
});

describe("contacto de emergencia", () => {
  const ACUDIENTE = {
    acudienteNombre: "Rosa Pérez",
    acudienteEmail: "rosa@correo.com",
    acudienteTelefono: "3001234567",
    acudienteParentesco: "Madre",
    acudienteAutoriza: "on",
  };

  it("con 'usar acudiente' copia nombre, teléfono y parentesco", () => {
    const c = resolverContactoEmergencia(alta({ ...ACUDIENTE, contactoEsAcudiente: "on" }));
    expect(c).toEqual({
      contactoEmergenciaNombre: "Rosa Pérez",
      contactoEmergenciaTelefono: "3001234567",
      contactoEmergenciaParentesco: "Madre",
    });
  });

  it("lo que el usuario escribió a mano gana sobre el acudiente", () => {
    const c = resolverContactoEmergencia(
      alta({ ...ACUDIENTE, contactoEsAcudiente: "on", contactoEmergenciaNombre: "Tío Juan" }),
    );
    expect(c.contactoEmergenciaNombre).toBe("Tío Juan");
    expect(c.contactoEmergenciaTelefono).toBe("3001234567");
  });

  it("sin 'usar acudiente' no copia nada", () => {
    const c = resolverContactoEmergencia(alta(ACUDIENTE));
    expect(c.contactoEmergenciaNombre).toBeNull();
    expect(c.contactoEmergenciaTelefono).toBeNull();
  });
});

describe("datosDeJugador y datosDeFamilia", () => {
  it("el parentesco del acudiente solo se guarda si hay acudiente", () => {
    expect(datosDeJugador(alta({}))).toMatchObject({ parentescoAcudiente: null });
    // Un parentesco suelto ya cuenta como acudiente y pide nombre y correo (lo
    // rechaza el schema): el camino válido es con el acudiente completo.
    const conAcudiente = alta({
      acudienteNombre: "Rosa",
      acudienteEmail: "rosa@correo.com",
      acudienteParentesco: "Madre",
      acudienteAutoriza: "on",
    });
    expect(datosDeJugador(conAcudiente).parentescoAcudiente).toBe("Madre");
  });

  it("sin acudiente no hay cuenta de familia", () => {
    expect(datosDeFamilia(alta({}))).toBeNull();
  });

  it("con acudiente arma la cuenta con sus datos fiscales opcionales", () => {
    const f = datosDeFamilia(
      alta({
        acudienteNombre: "Rosa Pérez",
        acudienteEmail: "rosa@correo.com",
        acudienteAutoriza: "on",
        acudienteTipoDocumento: "CC",
        acudienteNumeroDocumento: "52123456",
      }),
    );
    expect(f).toEqual({
      nombre: "Rosa Pérez",
      email: "rosa@correo.com",
      telefono: null,
      tipoDocumento: "CC",
      numeroDocumento: "52123456",
      direccion: null,
    });
  });
});

describe("auditoría del alta", () => {
  it("dice qué se cargó pero no copia valores sensibles", () => {
    const ficha = fichaParaGuardar(
      alta({ ...SALUD, autorizaDatosSalud: "on" }),
      "ESCUELA",
      AHORA,
    );
    const detalle = detalleAuditoriaAlta({ ficha, familia: "CREADA", motivoSoporte: "Alta asistida" });
    expect(detalle).toContain("Alta asistida");
    expect(detalle).toContain("ficha=si");
    expect(detalle).toContain("salud=autorizada");
    expect(detalle).toContain("familia=creada");
    expect(detalle).toContain("autorizacionAcudiente=declarada por quien da de alta");
    for (const valor of ["Sura", "Penicilina", "Asma", "1023456789", "3001234567"]) {
      expect(detalle).not.toContain(valor);
    }
  });

  it("una ficha vacía se audita como ficha=no", () => {
    const ficha = fichaParaGuardar(alta({}), "ESCUELA", AHORA);
    expect(fichaTieneDatos(ficha)).toBe(false);
    expect(detalleAuditoriaAlta({ ficha, familia: "NINGUNA" })).toBe(
      "ficha=no · salud=no · familia=ninguna",
    );
  });
});
