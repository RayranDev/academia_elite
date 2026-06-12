// Catálogo global de logros (G6): ~52 logros divididos por posición
// (POR/DEF/MED/DEL) + generales. Mezcla INSIGNIA/BONUS con el stat acorde.

interface LogroSeed {
  codigo: string;
  nombre: string;
  descripcion: string;
  tipo: "INSIGNIA" | "BONUS";
  statBonus?: string;
  valorBonus?: number;
  repetible?: boolean;
  icono: string;
  posicion?: "POR" | "DEF" | "MED" | "DEL";
}

const GENERALES: LogroSeed[] = [
  { codigo: "ASISTENCIA_PERFECTA_SEMANA", nombre: "Asistencia perfecta", descripcion: "Asististe a todos los entrenamientos de la semana.", tipo: "BONUS", statBonus: "FIS", valorBonus: 1, repetible: true, icono: "calendar-check" },
  { codigo: "MENTE_DE_ACERO", nombre: "Mente de acero", descripcion: "Tu MEN subió en 2 evaluaciones seguidas.", tipo: "INSIGNIA", icono: "brain" },
  { codigo: "PRIMER_ORO", nombre: "Primer Oro", descripcion: "Tu carta alcanzó el nivel Oro.", tipo: "INSIGNIA", icono: "medal" },
  { codigo: "PRIMER_HEROE", nombre: "Primer Héroe", descripcion: "Tu carta alcanzó el nivel Héroe.", tipo: "INSIGNIA", icono: "crown" },
  { codigo: "CAPITAN_VESTUARIO", nombre: "Capitán de vestuario", descripcion: "Trabajo en equipo ≥ 9 en una evaluación.", tipo: "INSIGNIA", icono: "armband" },
  { codigo: "MEJOR_PROGRESO_MES", nombre: "Mejor progreso del mes", descripcion: "Fuiste quien más mejoró este mes.", tipo: "BONUS", statBonus: "RIT", valorBonus: 1, repetible: true, icono: "trending-up" },
  { codigo: "DEBUT", nombre: "Debut", descripcion: "Confirmaste tu primera convocatoria.", tipo: "INSIGNIA", icono: "whistle" },
  { codigo: "TEMPORADA_DE_HIERRO", nombre: "Temporada de hierro", descripcion: "10 asistencias seguidas.", tipo: "INSIGNIA", icono: "shield" },
  { codigo: "ESPIRITU_DE_EQUIPO", nombre: "Espíritu de equipo", descripcion: "Apoyaste a un compañero en un mal momento.", tipo: "BONUS", statBonus: "MEN", valorBonus: 1, repetible: true, icono: "hand-heart" },
  { codigo: "JUEGO_LIMPIO_MES", nombre: "Juego limpio del mes", descripcion: "Un mes completo sin faltas ni reclamos.", tipo: "BONUS", statBonus: "MEN", valorBonus: 1, repetible: true, icono: "scale" },
  { codigo: "LIDER_CALENTAMIENTO", nombre: "Líder del calentamiento", descripcion: "Dirigiste el calentamiento del equipo.", tipo: "INSIGNIA", repetible: true, icono: "flame" },
  { codigo: "CONSTANCIA_TRIMESTRE", nombre: "Constancia de trimestre", descripcion: "Tres meses seguidos sin faltar a evaluaciones.", tipo: "INSIGNIA", icono: "calendar-days" },
];

const PORTEROS: LogroSeed[] = [
  { codigo: "PORTERIA_INVICTA", nombre: "Portería invicta", descripcion: "Partido completo sin recibir goles.", tipo: "BONUS", statBonus: "DEF", valorBonus: 1, repetible: true, icono: "shield-check", posicion: "POR" },
  { codigo: "ATAJADA_CLAVE", nombre: "Atajada clave", descripcion: "Una atajada que salvó el partido.", tipo: "BONUS", statBonus: "FIS", valorBonus: 1, repetible: true, icono: "hand", posicion: "POR" },
  { codigo: "REY_DEL_ACHIQUE", nombre: "Rey del achique", descripcion: "Salidas perfectas en los mano a mano.", tipo: "INSIGNIA", icono: "move", posicion: "POR" },
  { codigo: "SAQUE_PRECISO", nombre: "Saque preciso", descripcion: "Iniciaste un ataque con un saque exacto.", tipo: "BONUS", statBonus: "PAS", valorBonus: 1, repetible: true, icono: "target", posicion: "POR" },
  { codigo: "MURALLA_DEL_MES", nombre: "Muralla del mes", descripcion: "Mejor portero del mes en tu escuela.", tipo: "INSIGNIA", repetible: true, icono: "brick-wall", posicion: "POR" },
  { codigo: "PENAL_ATAJADO", nombre: "Penal atajado", descripcion: "Le ganaste el duelo al pateador.", tipo: "BONUS", statBonus: "MEN", valorBonus: 1, repetible: true, icono: "ban", posicion: "POR" },
  { codigo: "VOZ_DE_MANDO", nombre: "Voz de mando", descripcion: "Ordenaste la defensa durante todo el partido.", tipo: "INSIGNIA", icono: "megaphone", posicion: "POR" },
  { codigo: "REFLEJOS_FELINOS", nombre: "Reflejos felinos", descripcion: "Reacción imposible bajo los tres palos.", tipo: "BONUS", statBonus: "RIT", valorBonus: 1, repetible: true, icono: "zap", posicion: "POR" },
  { codigo: "GUANTES_DE_ORO", nombre: "Guantes de oro", descripcion: "Mejor portero de la temporada.", tipo: "INSIGNIA", icono: "award", posicion: "POR" },
  { codigo: "SIN_MIEDO", nombre: "Sin miedo", descripcion: "Te lanzaste a los pies para salvar un gol.", tipo: "INSIGNIA", repetible: true, icono: "heart", posicion: "POR" },
];

const DEFENSAS: LogroSeed[] = [
  { codigo: "MURO_DEFENSIVO", nombre: "Muro defensivo", descripcion: "Ningún delantero pudo superarte en el partido.", tipo: "BONUS", statBonus: "DEF", valorBonus: 1, repetible: true, icono: "brick-wall", posicion: "DEF" },
  { codigo: "ENTRADA_LIMPIA", nombre: "Entrada limpia", descripcion: "Quite perfecto sin falta en el área.", tipo: "INSIGNIA", repetible: true, icono: "check-circle", posicion: "DEF" },
  { codigo: "DUELO_AEREO_GANADO", nombre: "Duelo aéreo ganado", descripcion: "Dominaste el juego aéreo del partido.", tipo: "BONUS", statBonus: "FIS", valorBonus: 1, repetible: true, icono: "arrow-up", posicion: "DEF" },
  { codigo: "SALIDA_JUGADA", nombre: "Salida jugada", descripcion: "Saliste jugando con calidad bajo presión.", tipo: "BONUS", statBonus: "PAS", valorBonus: 1, repetible: true, icono: "git-branch", posicion: "DEF" },
  { codigo: "DEFENSA_DEL_MES", nombre: "Defensa del mes", descripcion: "Mejor defensa del mes en tu escuela.", tipo: "INSIGNIA", repetible: true, icono: "shield", posicion: "DEF" },
  { codigo: "CIERRE_SALVADOR", nombre: "Cierre salvador", descripcion: "Cruce providencial que evitó un gol cantado.", tipo: "BONUS", statBonus: "MEN", valorBonus: 1, repetible: true, icono: "shield-alert", posicion: "DEF" },
  { codigo: "MARCAJE_PERFECTO", nombre: "Marcaje perfecto", descripcion: "Anulaste al mejor jugador rival.", tipo: "INSIGNIA", repetible: true, icono: "user-x", posicion: "DEF" },
  { codigo: "LATERAL_INCANSABLE", nombre: "Lateral incansable", descripcion: "Subiste y bajaste la banda todo el partido.", tipo: "BONUS", statBonus: "RIT", valorBonus: 1, repetible: true, icono: "repeat", posicion: "DEF" },
  { codigo: "CAPITAN_DE_ZAGA", nombre: "Capitán de zaga", descripcion: "Lideraste la línea defensiva con la voz.", tipo: "INSIGNIA", icono: "armband", posicion: "DEF" },
  { codigo: "BLOQUEO_HEROICO", nombre: "Bloqueo heroico", descripcion: "Pusiste el cuerpo para tapar un remate.", tipo: "INSIGNIA", repetible: true, icono: "octagon", posicion: "DEF" },
];

const MEDIOS: LogroSeed[] = [
  { codigo: "DUENO_DEL_MEDIOCAMPO", nombre: "Dueño del mediocampo", descripcion: "Controlaste el ritmo del partido completo.", tipo: "INSIGNIA", repetible: true, icono: "gauge", posicion: "MED" },
  { codigo: "ASISTENCIA_DE_LUJO", nombre: "Asistencia de lujo", descripcion: "Pase de gol que rompió toda la defensa.", tipo: "BONUS", statBonus: "PAS", valorBonus: 1, repetible: true, icono: "send", posicion: "MED" },
  { codigo: "VISION_DE_JUEGO", nombre: "Visión de juego", descripcion: "Viste pases que nadie más vio.", tipo: "INSIGNIA", icono: "eye", posicion: "MED" },
  { codigo: "RECUPERADOR_INCANSABLE", nombre: "Recuperador incansable", descripcion: "Recuperaste más balones que nadie.", tipo: "BONUS", statBonus: "DEF", valorBonus: 1, repetible: true, icono: "magnet", posicion: "MED" },
  { codigo: "MOTOR_DEL_EQUIPO", nombre: "Motor del equipo", descripcion: "Corriste por dos durante todo el partido.", tipo: "BONUS", statBonus: "FIS", valorBonus: 1, repetible: true, icono: "battery-charging", posicion: "MED" },
  { codigo: "PASE_ENTRE_LINEAS", nombre: "Pase entre líneas", descripcion: "Rompiste líneas rivales con un pase filtrado.", tipo: "BONUS", statBonus: "PAS", valorBonus: 1, repetible: true, icono: "git-merge", posicion: "MED" },
  { codigo: "CONTROL_ORIENTADO", nombre: "Control orientado", descripcion: "Primer toque perfecto para escapar de la presión.", tipo: "BONUS", statBonus: "REG", valorBonus: 1, repetible: true, icono: "compass", posicion: "MED" },
  { codigo: "MEDIO_DEL_MES", nombre: "Mediocampista del mes", descripcion: "Mejor mediocampista del mes en tu escuela.", tipo: "INSIGNIA", repetible: true, icono: "medal", posicion: "MED" },
  { codigo: "CEREBRO_TACTICO", nombre: "Cerebro táctico", descripcion: "Entendiste y ejecutaste el plan a la perfección.", tipo: "INSIGNIA", icono: "brain", posicion: "MED" },
  { codigo: "CAMBIO_DE_RITMO", nombre: "Cambio de ritmo", descripcion: "Aceleraste el juego cuando el equipo lo pedía.", tipo: "BONUS", statBonus: "RIT", valorBonus: 1, repetible: true, icono: "fast-forward", posicion: "MED" },
];

const DELANTEROS: LogroSeed[] = [
  { codigo: "GOLEADOR_DEL_PARTIDO", nombre: "Goleador del partido", descripcion: "Marcaste el gol (o goles) que definió el partido.", tipo: "BONUS", statBonus: "TIR", valorBonus: 1, repetible: true, icono: "goal", posicion: "DEL" },
  { codigo: "DOBLETE", nombre: "Doblete", descripcion: "Dos goles en un mismo partido.", tipo: "INSIGNIA", repetible: true, icono: "plus-circle", posicion: "DEL" },
  { codigo: "HAT_TRICK", nombre: "Hat-trick", descripcion: "Tres goles en un mismo partido.", tipo: "INSIGNIA", repetible: true, icono: "crown", posicion: "DEL" },
  { codigo: "DEFINICION_PERFECTA", nombre: "Definición perfecta", descripcion: "Definiste con categoría un mano a mano.", tipo: "BONUS", statBonus: "TIR", valorBonus: 1, repetible: true, icono: "crosshair", posicion: "DEL" },
  { codigo: "DESMARQUE_LETAL", nombre: "Desmarque letal", descripcion: "Te escapaste de la marca en el momento justo.", tipo: "BONUS", statBonus: "RIT", valorBonus: 1, repetible: true, icono: "wind", posicion: "DEL" },
  { codigo: "REGATE_DECISIVO", nombre: "Regate decisivo", descripcion: "Un regate que dejó al rival en el piso.", tipo: "BONUS", statBonus: "REG", valorBonus: 1, repetible: true, icono: "shuffle", posicion: "DEL" },
  { codigo: "DELANTERO_DEL_MES", nombre: "Delantero del mes", descripcion: "Mejor delantero del mes en tu escuela.", tipo: "INSIGNIA", repetible: true, icono: "star", posicion: "DEL" },
  { codigo: "PRESION_ALTA", nombre: "Presión alta", descripcion: "Primer defensor: presionaste cada salida rival.", tipo: "BONUS", statBonus: "FIS", valorBonus: 1, repetible: true, icono: "activity", posicion: "DEL" },
  { codigo: "GOL_COLECTIVO", nombre: "Gol colectivo", descripcion: "Cerraste una jugada de equipo de más de 5 pases.", tipo: "INSIGNIA", repetible: true, icono: "users", posicion: "DEL" },
  { codigo: "INSTINTO_GOLEADOR", nombre: "Instinto goleador", descripcion: "Apareciste donde tenías que aparecer.", tipo: "INSIGNIA", icono: "radar", posicion: "DEL" },
];

export const CATALOGO_LOGROS = [
  ...GENERALES,
  ...PORTEROS,
  ...DEFENSAS,
  ...MEDIOS,
  ...DELANTEROS,
].map((l) => ({
  codigo: l.codigo,
  nombre: l.nombre,
  descripcion: l.descripcion,
  tipo: l.tipo,
  statBonus: l.statBonus ?? null,
  valorBonus: l.valorBonus ?? null,
  repetible: l.repetible ?? false,
  icono: l.icono,
  posicion: l.posicion ?? null,
}));
