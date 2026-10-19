# P07 — Seguridad a ciegas: aislamiento entre escuelas y datos de menores

> **Cuándo usarlo:** antes de sumar una escuela real, tras tocar autenticación, roles,
> `proxy.ts`, archivos o exportaciones.
> **Entrada:** app en local con **dos escuelas** de prueba y un usuario de cada rol en
> cada una · credenciales.
> **Salida:** `docs/auditoria/REPORTE-SEGURIDAD-<AAAA-MM-DD>.md`.
> **Datos sensibles:** son menores. Cualquier fuga es CRÍTICA.

**Antes de lanzarlo:** base de pruebas con dos escuelas y datos ficticios
(`npm run db:reset && npm run db:seed && npm run dev`). **Solo `localhost`.**

---

## Prompt

Eres un auditor de seguridad **externo**: no conoces el código. Tu objetivo es
conseguir, desde la interfaz y con peticiones HTTP, ver o modificar lo que **no te
corresponde**. Solo contra `http://localhost:<PUERTO>` y con datos ficticios.

No abras `src/`, `prisma/`, `tests/` ni `docs/` durante la prueba. Trabaja con las
credenciales que te doy:
- Escuela A: administrador, entrenador, familia · Escuela B: administrador,
  entrenador, familia · Súper Admin.

**Intentos obligatorios**
1. **Entre escuelas.** Con un usuario de A, recorrer la app y copiar los identificadores
   que aparecen en las URLs y en las descargas. Probarlos con la sesión de B y al revés,
   en pantallas, descargas (fotos, escudos, comprobantes, exportaciones de Excel) y en
   cualquier ruta `/api/...` que descubras. El resultado correcto es **404 uniforme**,
   sin confirmar que el recurso existe.
2. **Entre roles.** Con familia, entrar por URL directa a pantallas de entrenador,
   escuela y administración; con entrenador, a las de escuela y administración. Con
   familia, ver a un jugador que no es suyo (mismo colegio y otra categoría).
3. **Súper Admin.** ¿Puede ver o cambiar datos de una escuela sin abrir una sesión de
   soporte? ¿La sesión de soporte nace en solo lectura? ¿Escribir exige un motivo?
4. **Fotos de menores.** ¿Se pueden ver sin sesión, con sesión de otra escuela, o sin
   consentimiento? ¿La URL de la imagen es adivinable?
5. **Sesión.** Cerrar sesión y volver con "atrás"; reutilizar una sesión vieja;
   cambiar de rol sin volver a entrar.
6. **Entradas.** Pegar `<script>`, comillas, HTML y textos enormes en cada campo de
   texto libre y comprobar cómo se muestra después a otro rol.
7. **Enumeración.** Login, recuperación de clave y registro: ¿los mensajes revelan
   si un correo o código existe? Cuenta cuántas respuestas distintas ves.
8. **Límites de frecuencia.** Hacer ráfagas **acotadas** (máximo 700 peticiones) a la
   página pública, al login y a una exportación, y verificar que llega un `429` con
   `Retry-After`. No es una prueba de carga: no superes ese tope.

**Reglas:** ninguna acción fuera de `localhost`; nada de datos reales; no cambies
archivos del repositorio salvo el informe; no hagas commits.

**Entrega** el informe con, por cada intento: qué probaste, resultado esperado,
resultado observado, severidad (CRÍTICO si hay fuga de datos de menores o de otra
escuela) y pasos exactos para reproducir. Incluye lo que **sí resistió**, para dejar
constancia de qué se verificó, y lo que no pudiste probar.
