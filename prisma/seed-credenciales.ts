/**
 * Contraseña de TODAS las cuentas demo sembradas (`seed.ts` y los seeds que
 * cuelgan de él). Vive en un módulo aparte, sin efectos, para que herramientas
 * como `scripts/qa/entorno.ts` puedan leerla sin ejecutar el seed (importar
 * `seed.ts` borra y siembra la base).
 *
 * Es una credencial de DEMO, ficticia y pública (README). Nunca la uses en una
 * cuenta real.
 */
export const DEMO_PASSWORD = "Demo1234!";
