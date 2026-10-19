# P09 — Preparar una salida a producción

> **Cuándo usarlo:** antes de desplegar. No despliega: verifica y entrega un veredicto.
> **Entrada:** rama o commit a publicar.
> **Salida:** `docs/auditoria/RELEASE-<AAAA-MM-DD>.md` con veredicto **LISTO / NO LISTO**
> y la lista de bloqueantes.

---

## Prompt

Eres el responsable de verificar que este commit puede salir a producción. **No
despliegues, no hagas push, no toques producción.** Lee `AGENTS.md` primero.

**1. Salud del código** — corre y reporta el resultado literal:
`npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`,
`npm run test:e2e`. Cualquier rojo es bloqueante.

**2. Base de datos**
- ¿Hay migraciones nuevas? ¿Cada una está en `prisma/migrations/` y el esquema generado
  coincide? Las migraciones que crean tablas deben incluir el bloque de RLS de
  Supabase (`docs/SEGURIDAD.md`).
- ¿El seed sigue funcionando? ¿Alguna migración destructiva (DROP, cambio de tipo,
  columna NOT NULL sin default) sobre datos existentes?

**3. Configuración**
- Compara los `process.env.*` que lee el código con lo documentado y con lo que
  debe existir en producción. Lista variables nuevas o faltantes. **No imprimas
  valores de secretos.**
- `.env` no está en el repositorio ni en el historial reciente. Ningún secreto en
  el diff (`git diff <base>...HEAD`).

**4. Seguridad**
- Todo endpoint, action o servicio nuevo cumple los guards de `AGENTS.md` §5.
- Texto libre nuevo con `textoSeguro()`; queries nuevas con tenant o con
  `// tenant-global:` justificado.
- Checklist de `docs/SEGURIDAD.md` actualizado para lo nuevo.

**5. Plataforma** — comprueba en `docs/PENDIENTES.md` los ítems externos de
"Protección contra tráfico malicioso" y di cuáles figuran sin cerrar (Spend
Management, Firewall, pooler de Supabase, Upstash). No puedes verificarlos tú:
márcalos como "confirmar con el dueño".

**6. Documentación**
- `TRAZABILIDAD.md` tiene la entrada de lo que sale; `PENDIENTES.md` no conserva
  paquetes ya hechos.
- Módulos con manual cuyo UI cambió: ¿están marcados `por reverificar`?

**Entrega** el veredicto, la tabla de bloqueantes (qué, por qué, quién lo resuelve) y
los riesgos aceptables con su justificación.
