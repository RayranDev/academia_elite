import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import {
  computeStats,
  grupoEdadPorEdad,
  edadEnAnios,
  RANGOS_POR_GRUPO,
  PRUEBAS_FISICAS,
  claveRango,
  ETIQUETA_PRUEBA,
  type GrupoEdad,
  type MedidasEvaluacion,
} from "@/lib/stats-engine";
import { CATALOGO_LOGROS } from "./seed-logros";
import { generarCodigoInvitacion, generarCodigoRef } from "../src/lib/codes";
import { FONDOS_PRESETS } from "@/lib/cartas/fondos-presets";
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

// El seed corre por la conexión directa (5432), no por el pooler.
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DIRECT_URL o DATABASE_URL requerida para el seed.");
}
const adapter = new PrismaPg({ connectionString });
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
  await db.estadisticaPartido.deleteMany();
  await db.jugadorConvocado.deleteMany();
  await db.evento.deleteMany();
  await db.statsCalculados.deleteMany();
  await db.evaluacion.deleteMany();
  await db.objetivoJugador.deleteMany();
  await db.progresoSemanal.deleteMany();
  await db.logroJugador.deleteMany();
  await db.logroEscuela.deleteMany();
  await db.logro.deleteMany();
  await db.codigoInvitacion.deleteMany();
  await db.entrenadorCategoria.deleteMany();
  await db.fondoDesbloqueado.deleteMany();
  await db.jugador.deleteMany();
  await db.entrenador.deleteMany();
  await db.cancha.deleteMany();
  await db.sede.deleteMany();
  await db.categoria.deleteMany();
  await db.lead.deleteMany();
  await db.parametroFormula.deleteMany();
  await db.parametroEscuela.deleteMany();
  await db.fondoCarta.deleteMany();
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
      codigoRef: "ESC-DEMO1",
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
        codigoJugador: esCuentaDemo ? "LUCAS25" : generarCodigoInvitacion(),
        codigoRef: esCuentaDemo ? "JUG-LUCAS" : generarCodigoRef("JUG"),
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

  // 8) Parámetros de fórmula: peso de MEN + rangos físicos por grupo de edad
  //    (G8: editables por el Súper Admin; el motor cae al embebido si faltan).
  const parametros: { clave: string; valor: number; descripcion: string }[] = [
    { clave: "PESO_MEN_EN_OVR", valor: 0.1, descripcion: "Peso de MEN en el OVR (0.10)." },
    // M8: umbrales de nivel editables (curva ajustable). Bronce <65 · Plata 65 ·
    // Oro 75 · Héroe 85. Subir a Plata es más fácil que llegar a Héroe.
    { clave: "UMBRAL_PLATA", valor: 65, descripcion: "OVR mínimo para nivel Plata." },
    { clave: "UMBRAL_ORO", valor: 75, descripcion: "OVR mínimo para nivel Oro." },
    { clave: "UMBRAL_HEROE", valor: 85, descripcion: "OVR mínimo para nivel Héroe." },
  ];
  for (const grupo of Object.keys(RANGOS_POR_GRUPO) as GrupoEdad[]) {
    for (const prueba of PRUEBAS_FISICAS) {
      const r = RANGOS_POR_GRUPO[grupo][prueba];
      const etiqueta = ETIQUETA_PRUEBA[prueba];
      const [mejor, peor] = r.inverso ? ["mínimo (mejor marca)", "máximo (peor marca)"] : ["mínimo (peor marca)", "máximo (mejor marca)"];
      parametros.push(
        { clave: claveRango(prueba, grupo, "MIN"), valor: r.min, descripcion: `${etiqueta} · ${grupo} · ${mejor}.` },
        { clave: claveRango(prueba, grupo, "MAX"), valor: r.max, descripcion: `${etiqueta} · ${grupo} · ${peor}.` },
      );
    }
  }
  await db.parametroFormula.createMany({ data: parametros });

  // 9) Catálogo de logros (~52, divididos por posición — G6).
  await db.logro.createMany({ data: CATALOGO_LOGROS });

  // 9.a) Catálogo de fondos de carta desbloqueables por méritos (configurable
  //      por requisito: SIEMPRE / LOGRO / NIVEL_CARTA / NIVEL_PERSONAL).
  await db.fondoCarta.deleteMany();
  await db.fondoCarta.createMany({
    data: [
      // El `estilo` es el fondo de TODA la carta; `colorTexto` da contraste.
      { codigo: "CLASICO", nombre: "Clásico", descripcion: "El fondo de siempre.", estilo: "linear-gradient(160deg,#0b1220 0%,#1e293b 60%,#0b1220 100%)", colorTexto: "#e5e7eb", requisitoTipo: "SIEMPRE", requisitoValor: null, orden: 0 },
      { codigo: "COBRE", nombre: "Cobre", descripcion: "Edición cobre.", estilo: "linear-gradient(160deg,#8a5a34 0%,#d99a63 30%,#7a4a27 60%,#b87a47 100%)", colorTexto: "#fdeede", requisitoTipo: "NIVEL_PERSONAL", requisitoValor: "2", orden: 1 },
      { codigo: "ESMERALDA", nombre: "Esmeralda", descripcion: "Constancia semana a semana.", estilo: "linear-gradient(160deg,#065f46 0%,#10b981 35%,#064e3b 70%,#022c22 100%)", colorTexto: "#ecfdf5", requisitoTipo: "NIVEL_PERSONAL", requisitoValor: "4", orden: 2 },
      { codigo: "PLATA_LUX", nombre: "Plata lux", descripcion: "Cuando tu carta llega a Plata.", estilo: "linear-gradient(160deg,#9aa6b6 0%,#eef3f8 30%,#9aa6b6 60%,#d4dde7 100%)", colorTexto: "#1b2433", requisitoTipo: "NIVEL_CARTA", requisitoValor: "PLATA", orden: 3 },
      { codigo: "DORADA", nombre: "Dorada", descripcion: "Cuando tu carta llega a Oro.", estilo: "linear-gradient(160deg,#b88a1d 0%,#f7d558 28%,#c89b25 55%,#ffe98c 80%,#8f6b12 100%)", colorTexto: "#3a2c05", requisitoTipo: "NIVEL_CARTA", requisitoValor: "ORO", orden: 4 },
      { codigo: "RUBI", nombre: "Rubí", descripcion: "Por tu liderazgo en el equipo.", estilo: "linear-gradient(160deg,#9f1239 0%,#e11d48 35%,#7f1d1d 70%,#3b0a18 100%)", colorTexto: "#ffe4e6", requisitoTipo: "LOGRO", requisitoValor: "CAPITAN_VESTUARIO", orden: 5 },
      { codigo: "LEYENDA", nombre: "Leyenda", descripcion: "Solo para héroes.", estilo: "conic-gradient(from 180deg at 50% 50%, #4c1d95, #7c3aed, #f0abfc, #6d4cdf, #4c1d95)", colorTexto: "#f5d0ff", requisitoTipo: "NIVEL_CARTA", requisitoValor: "HEROE", orden: 6 },
    ],
  });

  // 9.a.bis) Presets curados con efectos (metálico/hielo/trama) del motor de
  //          efectos. Mismo catálogo que ofrece el creador como plantillas.
  await db.fondoCarta.createMany({
    data: FONDOS_PRESETS.map((p) => ({
      codigo: p.codigo,
      nombre: p.nombre,
      descripcion: p.descripcion,
      estilo: p.estilo,
      colorTexto: p.colorTexto,
      requisitoTipo: p.requisitoTipo,
      requisitoValor: p.requisitoValor,
      orden: p.orden,
      efecto: p.efecto,
      efectoParams:
        p.efectoParams === null ? Prisma.JsonNull : (p.efectoParams as Prisma.InputJsonValue),
    })),
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

  // 9.e) Eventos, convocatorias, asistencia, resultado (categoría de Lucas: Sub-10).
  const sub10Ids = jugadoresCreados.filter((j) => j.index < 5).map((j) => j.id);
  const enHoras = (h: number) => new Date(Date.now() + h * 60 * 60 * 1000);

  // 4 entrenamientos futuros
  for (let k = 1; k <= 4; k++) {
    await db.evento.create({
      data: {
        escuelaId: escuela.id,
        categoriaId: sub10.id,
        tipo: "ENTRENAMIENTO",
        titulo: `Entrenamiento técnico ${k}`,
        inicio: enHoras(k * 48),
        fin: enHoras(k * 48 + 1.5),
      },
    });
  }

  // Partido futuro con convocatoria a medio confirmar
  const partidoFuturo = await db.evento.create({
    data: {
      escuelaId: escuela.id,
      categoriaId: sub10.id,
      tipo: "PARTIDO",
      titulo: "vs. Academia Sur",
      rival: "Academia Sur",
      esLocal: true,
      inicio: enHoras(72),
      fin: enHoras(74),
    },
  });
  await db.jugadorConvocado.createMany({
    data: sub10Ids.map((jugadorId) => ({ eventoId: partidoFuturo.id, jugadorId })),
  });
  // Confirmar la mitad (los primeros 2)
  for (const jid of sub10Ids.slice(0, 2)) {
    await db.jugadorConvocado.update({
      where: { eventoId_jugadorId: { eventoId: partidoFuturo.id, jugadorId: jid } },
      data: { confirmacion: "CONFIRMADO", confirmadoEn: new Date() },
    });
  }

  // Partido pasado con asistencia y resultado
  const partidoPasado = await db.evento.create({
    data: {
      escuelaId: escuela.id,
      categoriaId: sub10.id,
      tipo: "PARTIDO",
      titulo: "vs. Club Norte",
      rival: "Club Norte",
      esLocal: true,
      inicio: new Date(Date.now() - 5 * DIA),
      fin: new Date(Date.now() - 5 * DIA + 2 * 60 * 60 * 1000),
      resultadoLocal: 3,
      resultadoVisitante: 1,
    },
  });
  await db.jugadorConvocado.createMany({
    data: sub10Ids.map((jugadorId) => ({
      eventoId: partidoPasado.id,
      jugadorId,
      confirmacion: "CONFIRMADO",
    })),
  });
  await db.asistencia.createMany({
    data: sub10Ids.map((jugadorId, i) => ({
      escuelaId: escuela.id,
      eventoId: partidoPasado.id,
      jugadorId,
      presente: i !== 4, // todos menos uno
    })),
  });
  // Estadística individual del partido pasado (demo del resumen del jugador).
  await db.estadisticaPartido.createMany({
    data: sub10Ids
      .filter((_, i) => i !== 4) // los que estuvieron presentes
      .map((jugadorId, i) => ({
        escuelaId: escuela.id,
        eventoId: partidoPasado.id,
        jugadorId,
        titular: i < 4,
        minutos: i < 4 ? 60 : 20,
        goles: i === 0 ? 2 : i === 1 ? 1 : 0,
        asistencias: i === 2 ? 1 : 0,
        amarillas: i === 3 ? 1 : 0,
        roja: false,
      })),
  });

  // 9.f) Conversación DT ↔ padre sobre Lucas, con 3 mensajes.
  await db.conversacion.create({
    data: {
      escuelaId: escuela.id,
      jugadorId: lucasId,
      asunto: "Progreso de Lucas",
      mensajes: {
        create: [
          { remitenteId: dtUser.id, cuerpo: "¡Hola! Lucas viene entrenando muy bien esta semana." },
          { remitenteId: padreUser.id, cuerpo: "¡Qué alegría! ¿En qué puede mejorar?" },
          { remitenteId: dtUser.id, cuerpo: "Trabajaremos el pase. Le puse un objetivo de PAS 75." },
        ],
      },
    },
  });

  // 9.g) Anuncios (1 global, 1 visible al jugador con la noticia del partido).
  await db.anuncio.createMany({
    data: [
      { escuelaId: escuela.id, categoriaId: null, autorRol: "ESCUELA_ADMIN", titulo: "Bienvenidos a la temporada", cuerpo: "Arranca una nueva temporada. ¡A entrenar con todo!", fijado: true },
      { escuelaId: escuela.id, categoriaId: sub10.id, autorRol: "DT", titulo: "Resultado: vs. Club Norte", cuerpo: "Ganamos 3-1 ante Club Norte. ¡Gran partido del equipo!", visibleJugador: true },
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
