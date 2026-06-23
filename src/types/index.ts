// Union types que reemplazan a los enums (SQLite no soporta enums nativos).
// Estos son la fuente de verdad para validación Zod y tipado en toda la app.

import type { AvatarConfigV2 } from "@/lib/avatar/toon-head";

export const ROLES = ["SUPER_ADMIN", "ESCUELA_ADMIN", "DT", "JUGADOR"] as const;
export type Rol = (typeof ROLES)[number];

// Permisos (ROL-SUPER-ADMIN.md M4): la indirección "acción → permiso requerido"
// evita atar cada guard al string "SUPER_ADMIN". Hoy el SUPER_ADMIN tiene TODOS;
// mañana se pueden crear roles acotados (p. ej. SOPORTE, FACTURACION) con un
// subconjunto, sin tocar la lógica de cada acción.
export const PERMISOS = [
  "GESTIONAR_ESCUELAS", // crear/editar/suspender escuelas, categorías, usuarios admin
  "EDITAR_PARAMETROS_GLOBALES", // parámetros de fórmula (globales y por escuela)
  "EDITAR_CATALOGOS", // fondos, logros, simulador de carta
  "GESTIONAR_LEADS", // pipeline comercial
  "VER_FACTURACION", // membresías / morosidad
  "SOPORTE_TENANT", // sesión de soporte y operaciones destructivas de tenant
  "VER_AUDITORIA", // leer / exportar el AuditLog y el dashboard de plataforma
] as const;
export type Permiso = (typeof PERMISOS)[number];

// Prioridad de una notificación: gobierna el destaque visual en la campana.
export const PRIORIDADES = ["baja", "media", "alta", "critica"] as const;
export type Prioridad = (typeof PRIORIDADES)[number];

export const POSICIONES = ["POR", "DEF", "MED", "DEL"] as const;
export type Posicion = (typeof POSICIONES)[number];

export const ESTADOS_JUGADOR = [
  "PENDIENTE",
  "ACTIVO",
  "INACTIVO",
  "ELIMINADO", // lógico, reversible, solo Súper Admin
] as const;
export type EstadoJugador = (typeof ESTADOS_JUGADOR)[number];

export const TIPOS_BLOQUEO = [
  "PAGO",
  "COMPORTAMIENTO",
  "CONTACTA_DT",
  "PERSONALIZADO",
] as const;
export type TipoBloqueo = (typeof TIPOS_BLOQUEO)[number];

export const NIVELES = ["BRONCE", "PLATA", "ORO", "HEROE"] as const;
export type Nivel = (typeof NIVELES)[number];

export const TIPOS_EVENTO = [
  "PARTIDO",
  "ENTRENAMIENTO",
  "EVALUACION",
  "OTRO",
] as const;
export type TipoEvento = (typeof TIPOS_EVENTO)[number];

export const CONFIRMACIONES = ["PENDIENTE", "CONFIRMADO", "RECHAZADO"] as const;
export type Confirmacion = (typeof CONFIRMACIONES)[number];

export const TIPOS_NOTIFICACION = [
  "EVALUACION_VENCIDA",
  "CONVOCATORIA",
  "MENSAJE",
  "LOGRO",
  "ANUNCIO",
  "SISTEMA",
] as const;
export type TipoNotificacion = (typeof TIPOS_NOTIFICACION)[number];

export const TIPOS_LOGRO = ["INSIGNIA", "BONUS"] as const;
export type TipoLogro = (typeof TIPOS_LOGRO)[number];

export const STATS_CARTA = ["RIT", "TIR", "PAS", "REG", "DEF", "FIS"] as const;
export type StatCarta = (typeof STATS_CARTA)[number];

// MEN y OVR son objetivos válidos para ObjetivoJugador además de los stats base.
export const STATS_OBJETIVO = [...STATS_CARTA, "MEN", "OVR"] as const;
export type StatObjetivo = (typeof STATS_OBJETIVO)[number];

export const ESTADOS_OBJETIVO = ["ACTIVO", "CUMPLIDO", "VENCIDO"] as const;
export type EstadoObjetivo = (typeof ESTADOS_OBJETIVO)[number];

// Funnel comercial del lead (mini-CRM). CONVERTIDO y DESCARTADO conservan su
// semántica/lógica previa; el resto son etapas intermedias del seguimiento.
export const ESTADOS_LEAD = [
  "NUEVO",
  "CONTACTADO",
  "EN_SEGUIMIENTO",
  "RECONTACTAR",
  "NEGOCIACION",
  "PRUEBA_GRATUITA",
  "PENDIENTE_PAGO",
  "CONVERTIDO",
  "DESCARTADO",
  "NO_INTERESADO",
] as const;
export type EstadoLead = (typeof ESTADOS_LEAD)[number];

// DTO plano de la carta del jugador (nunca se expone el modelo Prisma a la UI).
export interface PlayerCardData {
  nombre: string;
  apellido?: string; // en la carta se muestra en línea propia, nunca truncado
  posicion: Posicion;
  ovr: number;
  nivel: Nivel;
  stats: {
    rit: number;
    tir: number;
    pas: number;
    reg: number;
    def: number;
    fis: number;
  };
  men: number;
  fotoUrl: string | null;
  escudoEscuelaUrl?: string;
  dorsal?: number;
  avatarConfig?: AvatarConfigV2 | null;
  fondoEstilo?: string | null; // CSS del fondo equipado: ES el fondo/estilo de TODA la carta
  fondoTexto?: string | null; // color de texto para contraste sobre el fondo equipado
  heroeEquipado?: boolean; // el marco Héroe (morado) solo aplica si está desbloqueado y equipado
}

// --- Avatar SVG editable (jugador) ---
// Config v2 (DiceBear v10 "toon-head"). La v1 vive en `@/lib/avatar/config`
// solo para migrar avatares antiguos.
export type AvatarConfig = AvatarConfigV2;
export type { AvatarConfigV2 };

