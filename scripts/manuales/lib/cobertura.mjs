// Cobertura: cruza las pantallas existentes con las rutas que declaran las fichas.
// Funciones puras (sin acceso a disco) para poder probarlas en vitest.

import { normalizarRuta } from "./rutas.mjs";

/**
 * @typedef {Object} RolCobertura
 * @property {string} id
 * @property {{ ruta: string, razon?: string }[]} [exclusiones]
 *
 * @typedef {Object} FichaCobertura
 * @property {string} rol Id del rol al que pertenece la ficha.
 * @property {string} modulo Nombre del módulo.
 * @property {string[]} rutas Rutas que la ficha declara documentar.
 *
 * @typedef {Object} CoberturaRol
 * @property {string} rol
 * @property {number} total Pantallas a documentar (sin contar las excluidas).
 * @property {{ ruta: string, modulos: string[] }[]} cubiertas
 * @property {string[]} sinDocumentar
 * @property {{ ruta: string, modulo: string }[]} inexistentes Rutas declaradas por una ficha que no existen en src/app.
 * @property {{ ruta: string, razon: string }[]} excluidas
 * @property {string[]} exclusionesSinRazon Rutas excluidas sin justificar (no se aceptan).
 * @property {number} porcentaje 0-100, redondeado a un decimal.
 */

/**
 * @param {RolCobertura[]} roles
 * @param {Record<string, string[]>} inventario Rutas existentes por id de rol.
 * @param {FichaCobertura[]} fichas
 * @returns {CoberturaRol[]}
 */
export function calcularCobertura(roles, inventario, fichas) {
  return roles.map((rol) => {
    const existentes = inventario[rol.id] ?? [];
    const claveExistentes = new Set(existentes.map(normalizarRuta));

    const exclusiones = rol.exclusiones ?? [];
    const exclusionesValidas = exclusiones.filter((e) => e.razon && e.razon.trim().length > 0);
    const exclusionesSinRazon = exclusiones
      .filter((e) => !e.razon || e.razon.trim().length === 0)
      .map((e) => e.ruta);
    const clavesExcluidas = new Set(exclusionesValidas.map((e) => normalizarRuta(e.ruta)));

    const fichasDelRol = fichas.filter((f) => f.rol === rol.id);

    /** @type {Map<string, Set<string>>} */
    const modulosPorRuta = new Map();
    /** @type {{ ruta: string, modulo: string }[]} */
    const inexistentes = [];

    for (const ficha of fichasDelRol) {
      for (const ruta of ficha.rutas) {
        const clave = normalizarRuta(ruta);
        if (!claveExistentes.has(clave)) {
          inexistentes.push({ ruta, modulo: ficha.modulo });
          continue;
        }
        if (!modulosPorRuta.has(clave)) modulosPorRuta.set(clave, new Set());
        modulosPorRuta.get(clave)?.add(ficha.modulo);
      }
    }

    const aDocumentar = existentes.filter((r) => !clavesExcluidas.has(normalizarRuta(r)));
    const cubiertas = aDocumentar
      .filter((r) => modulosPorRuta.has(normalizarRuta(r)))
      .map((ruta) => ({
        ruta,
        modulos: [...(modulosPorRuta.get(normalizarRuta(ruta)) ?? [])],
      }));
    const sinDocumentar = aDocumentar.filter((r) => !modulosPorRuta.has(normalizarRuta(r)));

    const excluidas = existentes
      .filter((r) => clavesExcluidas.has(normalizarRuta(r)))
      .map((ruta) => ({
        ruta,
        razon: exclusionesValidas.find((e) => normalizarRuta(e.ruta) === normalizarRuta(ruta))?.razon ?? "",
      }));

    const total = aDocumentar.length;
    const porcentaje = total === 0 ? 100 : Math.round((cubiertas.length / total) * 1000) / 10;

    return {
      rol: rol.id,
      total,
      cubiertas,
      sinDocumentar,
      inexistentes,
      excluidas,
      exclusionesSinRazon,
      porcentaje,
    };
  });
}

/**
 * ¿La cobertura tiene algo que corregir? (modo --estricto)
 * @param {CoberturaRol[]} cobertura
 */
export function hayProblemasDeCobertura(cobertura) {
  return cobertura.some(
    (c) => c.sinDocumentar.length > 0 || c.inexistentes.length > 0 || c.exclusionesSinRazon.length > 0,
  );
}
