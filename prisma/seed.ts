import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  computeStats,
  grupoEdadPorEdad,
  edadEnAnios,
  type MedidasEvaluacion,
} from "@/lib/stats-engine";
import type { Posicion } from "@/types";

/**
 * Seed determinista (Apéndice B del Plan Maestro).
 * Sprint 0: estructura base + los 4 usuarios (uno por rol) para verificar login
 * y RBAC. Las evaluaciones con stats, eventos y mensajes se añadirán en los
 * sprints que construyen esos módulos (4, 5 y 6), porque dependen del motor de
 * stats y de los servicios de dominio.
 *
 * Idempotente: limpia y recrea en cada ejecución (solo entorno local).
 * Contraseña demo para todos: "Demo1234!" (documentada en README).
 */

const url = process.env.DATABASE_URL ?? "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url });
const db = new PrismaClient({ adapter });

const DEMO_PASSWORD = "Demo1234!";

async function limpiar() {
  // Orden inverso de dependencias para respetar las FK.
  await db.auditLog.deleteMany();
  await db.notificacion.deleteMany();
  await db.mensaje.deleteMany();
  await db.conversacion.deleteMany();
  await db.anuncio.deleteMany();
  await db.asistencia.deleteMany();
  await db.jugadorConvocado.deleteMany();
  await db.evento.deleteMany();
  await db.statsCalculados.deleteMany();
  await db.evaluacion.deleteMany();
  await db.objetivoJugador.deleteMany();
  await db.logroJugador.deleteMany();
  await db.logro.deleteMany();
  await db.codigoInvitacion.deleteMany();
  await db.entrenadorCategoria.deleteMany();
  await db.jugador.deleteMany();
  await db.entrenador.deleteMany();
  await db.cancha.deleteMany();
  await db.sede.deleteMany();
  await db.categoria.deleteMany();
  await db.lead.deleteMany();
  await db.parametroFormula.deleteMany();
  await db.user.deleteMany();
  await db.escuela.deleteMany();
}

const POSICIONES = ["POR", "DEF", "MED", "DEL"] as const;

async function main() {
  console.log("🌱 Limpiando base…");
  await limpiar();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  // IDs fijos para las entidades con login: así un re-seed no invalida las
  // sesiones (JWT) ya emitidas en desarrollo.
  // 1) SUPER_ADMIN (sin escuela)
  await db.user.create({
    data: {
      id: "demo-user-superadmin",
      email: "admin@demo.app",
      passwordHash,
      nombre: "Súper Admin",
      rol: "SUPER_ADMIN",
    },
  });

  // 2) Escuela demo + su administrador
  const escuela = await db.escuela.create({
    data: {
      id: "demo-escuela",
      nombre: "Academia Demo",
      slug: "demo",
      colorPrimario: "#4ADE80",
      frecuenciaEvaluacionDias: 30,
    },
  });

  await db.user.create({
    data: {
      id: "demo-user-escuela",
      email: "escuela@demo.app",
      passwordHash,
      nombre: "Admin Academia Demo",
      rol: "ESCUELA_ADMIN",
      escuelaId: escuela.id,
    },
  });

  // 3) Sede + cancha
  const sede = await db.sede.create({
    data: {
      escuelaId: escuela.id,
      nombre: "Sede Central",
      direccion: "Av. del Estadio 100",
    },
  });
  await db.cancha.create({
    data: { sedeId: sede.id, nombre: "Cancha 1" },
  });

  // 4) Categorías Sub-10 y Sub-12
  const sub10 = await db.categoria.create({
    data: {
      id: "demo-cat-sub10",
      escuelaId: escuela.id,
      nombre: "Sub-10",
      anioDesde: 2016,
      anioHasta: 2017,
    },
  });
  const sub12 = await db.categoria.create({
    data: {
      id: "demo-cat-sub12",
      escuelaId: escuela.id,
      nombre: "Sub-12",
      anioDesde: 2014,
      anioHasta: 2015,
    },
  });

  // 5) DT asignado a ambas categorías
  const dtUser = await db.user.create({
    data: {
      id: "demo-user-dt",
      email: "dt@demo.app",
      passwordHash,
      nombre: "Diego Técnico",
      rol: "DT",
      escuelaId: escuela.id,
    },
  });
  const entrenador = await db.entrenador.create({
    data: { id: "demo-entrenador", userId: dtUser.id, escuelaId: escuela.id },
  });
  await db.entrenadorCategoria.createMany({
    data: [
      { entrenadorId: entrenador.id, categoriaId: sub10.id },
      { entrenadorId: entrenador.id, categoriaId: sub12.id },
    ],
  });

  // 6) Cuenta JUGADOR (gestionada por el padre) + su jugador
  const padreUser = await db.user.create({
    data: {
      id: "demo-user-padre",
      email: "jugador@demo.app",
      passwordHash,
      nombre: "Familia García",
      rol: "JUGADOR",
      escuelaId: escuela.id,
    },
  });

  // 7) 10 jugadores deterministas (8 ACTIVO, 1 PENDIENTE, 1 con eval vencida).
  const nombres = [
    ["Lucas", "García"],
    ["Mateo", "Pérez"],
    ["Thiago", "López"],
    ["Benjamín", "Díaz"],
    ["Valentino", "Ruiz"],
    ["Joaquín", "Sosa"],
    ["Bruno", "Méndez"],
    ["Tomás", "Castro"],
    ["Santino", "Romero"],
    ["Felipe", "Vega"],
  ];

  const jugadoresCreados: {
    id: string;
    posicion: string;
    fechaNacimiento: Date;
    index: number;
  }[] = [];

  for (let i = 0; i < nombres.length; i++) {
    const [nombre, apellido] = nombres[i];
    const categoriaId = i < 5 ? sub10.id : sub12.id;
    const estado = i === 9 ? "PENDIENTE" : "ACTIVO";
    // El primer jugador (Lucas García) es la cuenta del padre demo, con foto+consentimiento.
    const esCuentaDemo = i === 0;
    const fechaNacimiento = new Date(2015 - (i % 2), (i % 12) + 1, 10);
    const posicion = POSICIONES[i % POSICIONES.length];

    const j = await db.jugador.create({
      data: {
        escuelaId: escuela.id,
        categoriaId,
        nombre,
        apellido,
        fechaNacimiento,
        posicion,
        dorsal: i + 1,
        estado,
        padreUserId: esCuentaDemo ? padreUser.id : null,
        cuentaUserId: esCuentaDemo ? padreUser.id : null,
        consentimientoFoto: esCuentaDemo,
        consentimientoFotoFecha: esCuentaDemo ? new Date() : null,
      },
    });
    jugadoresCreados.push({ id: j.id, posicion, fechaNacimiento, index: i });
  }

  // 8) Parámetros de fórmula (rangos por grupo de edad + peso de MEN).
  const parametros: { clave: string; valor: number; descripcion: string }[] = [
    { clave: "PESO_MEN_EN_OVR", valor: 0.1, descripcion: "Peso de MEN en el OVR (0.10)." },
    // Sprint 4 ampliará con rangos por edad (RANGO_SPRINT_SUB12_MIN, etc.).
  ];
  await db.parametroFormula.createMany({ data: parametros });

  // 9) Catálogo de logros (seed de la Sección 11).
  await db.logro.createMany({
    data: [
      { codigo: "ASISTENCIA_PERFECTA_SEMANA", nombre: "Asistencia perfecta", descripcion: "Asististe a todos los entrenamientos de la semana.", tipo: "BONUS", statBonus: "FIS", valorBonus: 1, repetible: true, icono: "calendar-check" },
      { codigo: "MENTE_DE_ACERO", nombre: "Mente de acero", descripcion: "Tu MEN subió en 2 evaluaciones seguidas.", tipo: "INSIGNIA", icono: "brain" },
      { codigo: "PRIMER_ORO", nombre: "Primer Oro", descripcion: "Tu carta alcanzó el nivel Oro.", tipo: "INSIGNIA", icono: "medal" },
      { codigo: "CAPITAN_VESTUARIO", nombre: "Capitán de vestuario", descripcion: "Trabajo en equipo ≥ 9.", tipo: "INSIGNIA", icono: "armband" },
      { codigo: "MEJOR_PROGRESO_MES", nombre: "Mejor progreso del mes", descripcion: "Fuiste quien más mejoró este mes.", tipo: "BONUS", statBonus: "RIT", valorBonus: 1, repetible: true, icono: "trending-up" },
      { codigo: "DEBUT", nombre: "Debut", descripcion: "Confirmaste tu primera convocatoria.", tipo: "INSIGNIA", icono: "whistle" },
      { codigo: "TEMPORADA_DE_HIERRO", nombre: "Temporada de hierro", descripcion: "10 asistencias seguidas.", tipo: "INSIGNIA", icono: "shield" },
    ],
  });

  // 9.b) Evaluaciones de ejemplo (calculadas con el motor) para que las cartas
  //      ya existan en la demo. La última de cada jugador alimenta su carta.
  const DIA = 24 * 60 * 60 * 1000;
  const medidasNivel = (nivel: number): MedidasEvaluacion => {
    const t = (base: number, max: number) => base + (max - base) * nivel;
    return {
      sprint30mSeg: 6.5 - 2.0 * nivel, // menos = mejor
      saltoVerticalCm: t(16, 50),
      agilidadIllinoisSeg: 21 - 5 * nivel, // menos = mejor
      resistenciaYoyoNivel: t(4, 16),
      controlBalon: t(4, 9),
      pase: t(4, 9),
      tiro: t(3, 9),
      regate: t(4, 9),
      actitud: t(5, 9),
      concentracion: t(4, 9),
      trabajoEquipo: t(5, 10),
      resiliencia: t(4, 9),
    };
  };

  for (const jug of jugadoresCreados) {
    if (jug.index === 9) continue; // PENDIENTE: sin evaluaciones
    const vencido = jug.index === 8; // su última evaluación quedará "vencida"
    const grupo = grupoEdadPorEdad(edadEnAnios(jug.fechaNacimiento));
    const niveles = [0.45 + (jug.index % 3) * 0.05, 0.62 + (jug.index % 4) * 0.06];

    for (let k = 0; k < niveles.length; k++) {
      const medidas = medidasNivel(Math.min(niveles[k], 0.98));
      const r = computeStats(medidas, {
        posicion: jug.posicion as Posicion,
        grupoEdad: grupo,
      });
      const diasAtras = vencido ? 60 + (niveles.length - 1 - k) * 40 : (niveles.length - 1 - k) * 40;
      const fecha = new Date(Date.now() - diasAtras * DIA);

      const ev = await db.evaluacion.create({
        data: {
          escuelaId: escuela.id,
          jugadorId: jug.id,
          entrenadorId: entrenador.id,
          fecha,
          ...medidas,
        },
      });
      await db.statsCalculados.create({
        data: {
          escuelaId: escuela.id,
          jugadorId: jug.id,
          evaluacionId: ev.id,
          rit: r.rit, tir: r.tir, pas: r.pas, reg: r.reg, def: r.def, fis: r.fis,
          men: r.men, ovr: r.ovr, nivel: r.nivel,
          bonusAplicado: r.bonusAplicado, versionFormula: r.versionFormula,
          createdAt: fecha,
        },
      });
    }
  }

  // 9.c) Un logro BONUS sin consumir para Lucas (index 0): se aplicará en su
  //      próxima evaluación (demo del desglose anti-inflación).
  const logroBonus = await db.logro.findUnique({
    where: { codigo: "ASISTENCIA_PERFECTA_SEMANA" },
  });
  if (logroBonus) {
    await db.logroJugador.create({
      data: {
        escuelaId: escuela.id,
        jugadorId: jugadoresCreados[0].id,
        logroId: logroBonus.id,
        bonusConsumido: false,
      },
    });
  }
  // Una insignia obtenida para la vitrina.
  const insignia = await db.logro.findUnique({
    where: { codigo: "CAPITAN_VESTUARIO" },
  });
  if (insignia) {
    await db.logroJugador.create({
      data: {
        escuelaId: escuela.id,
        jugadorId: jugadoresCreados[0].id,
        logroId: insignia.id,
      },
    });
  }

  // 9.d) Objetivos de desarrollo para Lucas (2 activos + 1 cumplido).
  const lucasId = jugadoresCreados[0].id;
  const enDias = (d: number) => new Date(Date.now() + d * DIA);
  await db.objetivoJugador.createMany({
    data: [
      { escuelaId: escuela.id, jugadorId: lucasId, creadoPorEntrenadorId: entrenador.id, stat: "PAS", valorMeta: 75, fechaLimite: enDias(45), estado: "ACTIVO" },
      { escuelaId: escuela.id, jugadorId: lucasId, creadoPorEntrenadorId: entrenador.id, stat: "FIS", valorMeta: 80, fechaLimite: enDias(60), estado: "ACTIVO" },
      { escuelaId: escuela.id, jugadorId: lucasId, creadoPorEntrenadorId: entrenador.id, stat: "MEN", valorMeta: 70, fechaLimite: enDias(-10), estado: "CUMPLIDO" },
    ],
  });

  // 10) Leads en distintos estados (pipeline de la landing).
  await db.lead.createMany({
    data: [
      { nombreEscuela: "Escuela Norte", contactoNombre: "Ana Ruiz", contactoEmail: "ana@norte.com", ciudad: "Córdoba", estado: "NUEVO" },
      { nombreEscuela: "Club Sur", contactoNombre: "Pedro Gómez", contactoEmail: "pedro@sur.com", ciudad: "Rosario", estado: "CONTACTADO" },
      { nombreEscuela: "Academia Río", contactoNombre: "Laura Vega", contactoEmail: "laura@rio.com", ciudad: "Mendoza", estado: "CONVERTIDO" },
      { nombreEscuela: "Fútbol Total", contactoNombre: "Marcos Paz", contactoEmail: "marcos@total.com", ciudad: "La Plata", estado: "DESCARTADO" },
    ],
  });

  console.log("✅ Seed completado.");
  console.log("   Usuarios demo (contraseña: Demo1234!):");
  console.log("   • admin@demo.app    → SUPER_ADMIN");
  console.log("   • escuela@demo.app  → ESCUELA_ADMIN");
  console.log("   • dt@demo.app       → DT");
  console.log("   • jugador@demo.app  → JUGADOR (familia)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
