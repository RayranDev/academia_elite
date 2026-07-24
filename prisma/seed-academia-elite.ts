import type { PrismaClient } from "../src/generated/prisma/client";
import {
  computeStats,
  grupoEdadPorEdad,
  edadEnAnios,
  type MedidasEvaluacion,
} from "@/lib/stats-engine";
import { generarCodigoInvitacion, generarCodigoRef } from "../src/lib/codes";
import type { Posicion } from "@/types";

/**
 * Escuela demo CURADA: "Academia Elite" (slug `elite`). A diferencia del seed
 * genérico, acá cada dato cuenta una historia clara para poder RECORRER lo
 * construido sin adivinar:
 *  - Categorías por año (Sub-8 → Sub-14) con nombres coherentes.
 *  - Plantel diseñado para mostrar los 4 niveles de carta (Bronce→Héroe).
 *  - Membresías en cada estado (al día / pendiente / vencida) → cobranza y su
 *    export dejan de estar vacíos.
 *  - Eventos con narrativa: un entrenamiento HOY (para "Iniciar sesión"), un
 *    partido próximo con convocatoria y un partido jugado con resultado + stats.
 *  - Contactos completos en la familia (teléfono + parentesco) → export de nómina.
 *
 * Reutiliza los catálogos globales (logros, fondos, parámetros) que ya creó el
 * seed principal, así que debe llamarse DESPUÉS de ellos. IDs con prefijo
 * `elite-` para que un re-seed no invalide sesiones JWT de desarrollo.
 */

const DIA = 24 * 60 * 60 * 1000;

/** Mismas medidas que el seed principal: `nivel` 0..1 escala la carta. */
function medidasNivel(nivel: number): MedidasEvaluacion {
  const t = (base: number, max: number) => base + (max - base) * nivel;
  return {
    sprint30mSeg: 6.5 - 2.0 * nivel,
    saltoVerticalCm: t(16, 50),
    agilidadIllinoisSeg: 21 - 5 * nivel,
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
}

interface DefJugador {
  nombre: string;
  apellido: string;
  cat: "sub8" | "sub10" | "sub12" | "sub14";
  posicion: Posicion;
  /** Objetivo de carta: 0 (Bronce) → ~1 (Héroe). */
  nivel: number;
  anioNac: number;
  estado?: "ACTIVO" | "PENDIENTE";
  consent?: boolean;
}

// Plantel curado: el `nivel` está calibrado para repartir los cuatro niveles de
// carta. Bautista (la familia) es la estrella, para que el hub luzca.
const PLANTEL: DefJugador[] = [
  // Sub-14 (la categoría de la familia)
  { nombre: "Bautista", apellido: "Ramírez", cat: "sub14", posicion: "DEL", nivel: 0.98, anioNac: 2012, consent: true },
  { nombre: "Thiago", apellido: "Fernández", cat: "sub14", posicion: "MED", nivel: 0.88, anioNac: 2012, consent: true },
  { nombre: "Lautaro", apellido: "Gómez", cat: "sub14", posicion: "DEF", nivel: 0.72, anioNac: 2013 },
  { nombre: "Ignacio", apellido: "Torres", cat: "sub14", posicion: "POR", nivel: 0.58, anioNac: 2013 },
  // Sub-12
  { nombre: "Dante", apellido: "Aguirre", cat: "sub12", posicion: "MED", nivel: 0.9, anioNac: 2014, consent: true },
  { nombre: "Valentín", apellido: "Silva", cat: "sub12", posicion: "DEL", nivel: 0.8, anioNac: 2014 },
  { nombre: "Benicio", apellido: "Morales", cat: "sub12", posicion: "MED", nivel: 0.66, anioNac: 2015 },
  { nombre: "Ciro", apellido: "Herrera", cat: "sub12", posicion: "DEF", nivel: 0.48, anioNac: 2015 },
  // Sub-10
  { nombre: "Bruno", apellido: "Navarro", cat: "sub10", posicion: "DEL", nivel: 0.62, anioNac: 2016 },
  { nombre: "Emilio", apellido: "Rojas", cat: "sub10", posicion: "MED", nivel: 0.2, anioNac: 2017 },
  { nombre: "Gael", apellido: "Ortiz", cat: "sub10", posicion: "DEF", nivel: 0.28, anioNac: 2017 },
  // Sub-8
  { nombre: "Tobías", apellido: "Cabrera", cat: "sub8", posicion: "MED", nivel: 0.15, anioNac: 2018 },
  { nombre: "León", apellido: "Ríos", cat: "sub8", posicion: "DEL", nivel: 0.22, anioNac: 2019 },
];

export async function crearAcademiaElite(
  db: PrismaClient,
  passwordHash: string,
): Promise<void> {
  // 1) Escuela + administración
  const escuela = await db.escuela.create({
    data: {
      id: "elite-escuela",
      nombre: "Academia Elite",
      slug: "elite",
      codigoRef: "ESC-ELITE1",
      colorPrimario: "#3B82F6",
      frecuenciaEvaluacionDias: 30,
    },
  });

  await db.user.create({
    data: {
      id: "elite-user-admin",
      email: "elite-admin@demo.app",
      passwordHash,
      nombre: "Dirección Academia Elite",
      rol: "ESCUELA_ADMIN",
      escuelaId: escuela.id,
      telefono: "+54 351 555 0100",
      emailVerificado: true,
      emailVerificadoEn: new Date(),
    },
  });

  const sede = await db.sede.create({
    data: { escuelaId: escuela.id, nombre: "Predio Elite", direccion: "Ruta 20 km 8" },
  });
  await db.cancha.createMany({
    data: [
      { sedeId: sede.id, nombre: "Cancha Principal" },
      { sedeId: sede.id, nombre: "Cancha Auxiliar" },
    ],
  });

  // 2) Categorías por año (nombres coherentes)
  const cats = {
    sub8: await db.categoria.create({ data: { id: "elite-cat-sub8", escuelaId: escuela.id, nombre: "Sub-8", anioDesde: 2018, anioHasta: 2019 } }),
    sub10: await db.categoria.create({ data: { id: "elite-cat-sub10", escuelaId: escuela.id, nombre: "Sub-10", anioDesde: 2016, anioHasta: 2017 } }),
    sub12: await db.categoria.create({ data: { id: "elite-cat-sub12", escuelaId: escuela.id, nombre: "Sub-12", anioDesde: 2014, anioHasta: 2015 } }),
    sub14: await db.categoria.create({ data: { id: "elite-cat-sub14", escuelaId: escuela.id, nombre: "Sub-14", anioDesde: 2012, anioHasta: 2013 } }),
  };

  // 3) DT a cargo de las 4 categorías
  const dtUser = await db.user.create({
    data: {
      id: "elite-user-dt",
      email: "elite-dt@demo.app",
      passwordHash,
      nombre: "Prof. Martín Herrera",
      rol: "DT",
      escuelaId: escuela.id,
      telefono: "+54 351 555 0111",
      emailVerificado: true,
      emailVerificadoEn: new Date(),
    },
  });
  const entrenador = await db.entrenador.create({
    data: { id: "elite-entrenador", userId: dtUser.id, escuelaId: escuela.id },
  });
  await db.entrenadorCategoria.createMany({
    data: Object.values(cats).map((c) => ({ entrenadorId: entrenador.id, categoriaId: c.id })),
  });

  // 4) Familia (cuenta JUGADOR) con contacto completo → export de nómina
  const familiaUser = await db.user.create({
    data: {
      id: "elite-user-familia",
      email: "elite-familia@demo.app",
      passwordHash,
      nombre: "Familia Ramírez",
      rol: "JUGADOR",
      escuelaId: escuela.id,
      telefono: "+54 351 555 0199",
      emailVerificado: true,
      emailVerificadoEn: new Date(),
    },
  });

  // 5) Plantel
  const creados: { id: string; def: DefJugador }[] = [];
  let dorsal = 1;
  for (const def of PLANTEL) {
    const esFamilia = def.nombre === "Bautista";
    const j = await db.jugador.create({
      data: {
        escuelaId: escuela.id,
        categoriaId: cats[def.cat].id,
        codigoJugador: esFamilia ? "BAUTI25" : generarCodigoInvitacion(),
        codigoRef: esFamilia ? "JUG-BAUTI" : generarCodigoRef("JUG"),
        nombre: def.nombre,
        apellido: def.apellido,
        fechaNacimiento: new Date(def.anioNac, 4, 15),
        posicion: def.posicion,
        dorsal: dorsal++,
        estado: def.estado ?? "ACTIVO",
        padreUserId: esFamilia ? familiaUser.id : null,
        cuentaUserId: esFamilia ? familiaUser.id : null,
        parentescoAcudiente: esFamilia ? "Padre" : null,
        consentimientoFoto: def.consent ?? false,
        consentimientoFotoFecha: def.consent ? new Date() : null,
      },
    });
    creados.push({ id: j.id, def });
  }

  // 6) Evaluaciones (2 por jugador activo, progresión) → cartas y ranking
  for (const { id, def } of creados) {
    if (def.estado === "PENDIENTE") continue; // sin evaluar todavía
    const grupo = grupoEdadPorEdad(edadEnAnios(new Date(def.anioNac, 4, 15)));
    // Primera evaluación más floja, la última en el nivel objetivo.
    const niveles = [Math.max(0.2, def.nivel - 0.18), def.nivel];
    for (let k = 0; k < niveles.length; k++) {
      const medidas = medidasNivel(Math.min(niveles[k], 0.98));
      const r = computeStats(medidas, { posicion: def.posicion, grupoEdad: grupo });
      const fecha = new Date(Date.now() - (niveles.length - 1 - k) * 35 * DIA);
      const ev = await db.evaluacion.create({
        data: { escuelaId: escuela.id, jugadorId: id, entrenadorId: entrenador.id, fecha, ...medidas },
      });
      await db.statsCalculados.create({
        data: {
          escuelaId: escuela.id,
          jugadorId: id,
          evaluacionId: ev.id,
          rit: r.rit, tir: r.tir, pas: r.pas, reg: r.reg, def: r.def, fis: r.fis,
          men: r.men, ovr: r.ovr, nivel: r.nivel,
          bonusAplicado: r.bonusAplicado, versionFormula: r.versionFormula,
          createdAt: fecha,
        },
      });
    }
  }

  // 7) Membresías: cada estado representado (cobranza + export)
  const now = new Date();
  const periodo = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const periodoActual = periodo(now);
  const periodoAnterior = periodo(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const ESTADOS = ["PAGADA", "PENDIENTE", "VENCIDA"] as const;
  const activos = creados.filter((c) => c.def.estado !== "PENDIENTE");

  const membresias = activos.map((c, i) => ({
    escuelaId: escuela.id,
    jugadorId: c.id,
    periodo: periodoActual,
    estado: ESTADOS[i % ESTADOS.length] as string,
    monto: 45000,
  }));
  // Un par arrastra mora del período anterior (para la vista de vencidas).
  for (const c of activos.slice(0, 2)) {
    membresias.push({ escuelaId: escuela.id, jugadorId: c.id, periodo: periodoAnterior, estado: "VENCIDA", monto: 45000 });
  }
  await db.membresia.createMany({ data: membresias });

  // 8) Historial de entrenamientos con asistencia (8 semanas, TODAS las
  //    categorías). Sin esto la matriz de asistencia, la evolución mensual y el
  //    export salían con una sola columna. La tasa de presentes varía por
  //    categoría a propósito, para que el semáforo muestre verde/ámbar/rojo.
  const TASA_ASISTENCIA: Record<DefJugador["cat"], number> = {
    sub14: 92,
    sub12: 80,
    sub10: 64,
    sub8: 45,
  };
  for (const clave of ["sub8", "sub10", "sub12", "sub14"] as const) {
    const idsCat = creados.filter((c) => c.def.cat === clave).map((c) => c.id);
    for (let semana = 8; semana >= 1; semana--) {
      const inicio = new Date(Date.now() - semana * 7 * DIA);
      inicio.setHours(18, 0, 0, 0);
      const fin = new Date(inicio.getTime() + 90 * 60 * 1000);
      const ent = await db.evento.create({
        data: {
          escuelaId: escuela.id,
          categoriaId: cats[clave].id,
          tipo: "ENTRENAMIENTO",
          titulo: "Entrenamiento semanal",
          inicio,
          fin,
          sesionIniciadaAt: inicio,
          sesionCerradaAt: fin,
        },
      });
      await db.asistencia.createMany({
        data: idsCat.map((jugadorId, i) => {
          // Determinista (mismo seed → mismos datos), pero con variación real.
          const puntaje = (i * 37 + semana * 13) % 100;
          const presente = puntaje < TASA_ASISTENCIA[clave];
          return {
            escuelaId: escuela.id,
            eventoId: ent.id,
            jugadorId,
            presente,
            justificado: !presente && puntaje % 3 === 0,
            llegoTarde: presente && puntaje % 11 === 0,
            marcadoAt: fin,
          };
        }),
      });
    }
  }

  // 9) Eventos con narrativa (categoría de la familia: Sub-14)
  const sub14Ids = creados.filter((c) => c.def.cat === "sub14").map((c) => c.id);
  const hoyA = (h: number, m = 0) => {
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  };

  // Entrenamiento HOY (para demostrar "Iniciar entrenamiento" desde el Hoy del DT).
  await db.evento.create({
    data: { escuelaId: escuela.id, categoriaId: cats.sub14.id, tipo: "ENTRENAMIENTO", titulo: "Entrenamiento — control y pase", inicio: hoyA(18), fin: hoyA(19, 30) },
  });
  // Dos entrenamientos próximos
  for (let k = 1; k <= 2; k++) {
    await db.evento.create({
      data: { escuelaId: escuela.id, categoriaId: cats.sub14.id, tipo: "ENTRENAMIENTO", titulo: `Entrenamiento técnico ${k}`, inicio: new Date(Date.now() + k * 2 * DIA), fin: new Date(Date.now() + k * 2 * DIA + 1.5 * 60 * 60 * 1000) },
    });
  }

  // Partido próximo con convocatoria a medio confirmar
  const proximo = await db.evento.create({
    data: { escuelaId: escuela.id, categoriaId: cats.sub14.id, tipo: "PARTIDO", titulo: "vs. Deportivo Andes", rival: "Deportivo Andes", esLocal: true, inicio: new Date(Date.now() + 3 * DIA), fin: new Date(Date.now() + 3 * DIA + 2 * 60 * 60 * 1000) },
  });
  await db.jugadorConvocado.createMany({ data: sub14Ids.map((jugadorId) => ({ eventoId: proximo.id, jugadorId })) });
  for (const jid of sub14Ids.slice(0, 2)) {
    await db.jugadorConvocado.update({
      where: { eventoId_jugadorId: { eventoId: proximo.id, jugadorId: jid } },
      data: { confirmacion: "CONFIRMADO", confirmadoEn: new Date() },
    });
  }

  // Partido jugado: resultado + asistencia + estadísticas (ranking / export)
  const jugado = await db.evento.create({
    data: {
      escuelaId: escuela.id, categoriaId: cats.sub14.id, tipo: "PARTIDO",
      titulo: "vs. Real Cuyo", rival: "Real Cuyo", esLocal: false,
      inicio: new Date(Date.now() - 6 * DIA), fin: new Date(Date.now() - 6 * DIA + 2 * 60 * 60 * 1000),
      resultadoLocal: 2, resultadoVisitante: 2,
      sesionIniciadaAt: new Date(Date.now() - 6 * DIA),
      sesionCerradaAt: new Date(Date.now() - 6 * DIA + 2 * 60 * 60 * 1000),
    },
  });
  await db.jugadorConvocado.createMany({ data: sub14Ids.map((jugadorId) => ({ eventoId: jugado.id, jugadorId, confirmacion: "CONFIRMADO" })) });
  await db.asistencia.createMany({
    data: sub14Ids.map((jugadorId, i) => ({ escuelaId: escuela.id, eventoId: jugado.id, jugadorId, presente: i !== sub14Ids.length - 1, justificado: i === sub14Ids.length - 1 })),
  });
  await db.estadisticaPartido.createMany({
    data: sub14Ids.map((jugadorId, i) => ({
      escuelaId: escuela.id, eventoId: jugado.id, jugadorId,
      titular: i < 4, minutos: i < 4 ? 70 : 25,
      goles: i === 0 ? 2 : 0, // Bautista, doblete (empate 2-2 de visitante)
      asistencias: i === 1 ? 1 : 0,
      amarillas: i === 2 ? 1 : 0, roja: false,
    })),
  });

  // 10) Anuncios
  await db.anuncio.createMany({
    data: [
      { escuelaId: escuela.id, categoriaId: null, autorRol: "ESCUELA_ADMIN", titulo: "Bienvenidos a Academia Elite", cuerpo: "Nueva temporada, mismos valores: esfuerzo, respeto y juego. ¡Vamos!", fijado: true },
      { escuelaId: escuela.id, categoriaId: cats.sub14.id, autorRol: "DT", titulo: "Empate 2-2 vs. Real Cuyo", cuerpo: "Gran carácter del equipo para empatar de visitante. Doblete de Bautista.", visibleJugador: true },
    ],
  });
}
