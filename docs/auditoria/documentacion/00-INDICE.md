# Documentación Integral — Fútbol Career Mode

## Visión general de la documentación

Este repositorio documental recopila la especificación arquitectónica, técnica, funcional y operativa completa de la plataforma **Fútbol Career Mode** (`academia_elite`), generada directamente a partir del análisis del código fuente y los esquemas de base de datos activos al 18 de octubre de 2026.

La plataforma es un sistema web multi-tenant diseñado para la gamificación y gestión integral del fútbol formativo infantil y juvenil (fútbol base). El sistema procesa mediciones físicas y técnicas reales realizadas por entrenadores en campo, ejecuta un motor de cálculo matemático determinista puro para derivar atributos futbolísticos (Ritmo, Tiro, Pase, Regate, Defensa, Físico y Mentalidad) junto a una valoración general (OVR 1–99), y genera una carta coleccionable dinámica inspirada en los cromos de videojuegos deportivos (EA FC) dividida en cuatro niveles: Bronce, Plata, Oro y Héroe.

Dado que la plataforma custodia información privada y sensible de niños, niñas y adolescentes (NNA), el sistema implementa una arquitectura defensiva en capas con aislamiento multi-tenant estricto por escuela deportiva, control de acceso basado en roles (RBAC) y sesiones de auditoría trazables.

---

## Estructura de documentos

La documentación se divide en 10 volúmenes especializados:

1. **[01-INVENTARIO-POR-ROL.md](01-INVENTARIO-POR-ROL.md)**:
   Catálogo exhaustivo de todas las pantallas de la aplicación (`src/app/**/page.tsx`), organizadas por rol (`SUPER_ADMIN`, `ESCUELA_ADMIN`, `DT`, `JUGADOR`, público y bloqueado). Detalla para cada ruta su propósito operativo, qué ve el usuario, qué acciones puede ejecutar, qué Server Actions o servicios dispara y las reglas de negocio que aplican.

2. **[02-FLUJOS.md](02-FLUJOS.md)**:
   Diagramas de secuencia y estados en formato Mermaid que ilustran los flujos operativos clave de punta a punta: alta asistida de jugadores, registro con código, ciclo de evaluación deportiva y nacimiento de la carta, curva de desarrollo diario de mentalidad (MEN), modo sesión de entrenamientos y partidos, cobranzas/membresías/bloqueo por mora, mensajería interna, catálogo de fondos y sesión de soporte administrativo.

3. **[03-ARQUITECTURA.md](03-ARQUITECTURA.md)**:
   Descripción de la arquitectura estricta por capas (`UI/RSC → Actions → Services → Repositories → Prisma`), responsabilidades por capa, diseño de barreras de seguridad (Proxy UX vs Guards de dominio), manejo de DTOs planos y traza detallada paso a paso de una mutación real desde el componente visual hasta la base de datos PostgreSQL.

4. **[04-MODELO-DE-DATOS.md](04-MODELO-DE-DATOS.md)**:
   Diagrama Entidad-Relación (ER) completo en Mermaid y glosario exhaustivo de los 45 modelos Prisma que componen la base de datos, explicando su significado en el negocio, claves primarias/foráneas, índices de aislamiento y estrategias de integridad referencial.

5. **[05-ACTIONS-Y-ENDPOINTS.md](05-ACTIONS-Y-ENDPOINTS.md)**:
   Catálogo técnico exhaustivo de todas las Server Actions (`src/actions/`) y Route Handlers (`src/app/api/`), detallando roles permitidos, guards aplicados, esquema de validación Zod de entrada, tipo de salida (`ActionResult<T>`) y efectos colaterales (auditoría, correo, invalidación de caché).

6. **[06-MOTOR-DE-STATS.md](06-MOTOR-DE-STATS.md)**:
   Especificación matemática y funcional del motor de stats puro (`src/lib/stats-engine/`): normalización lineal y sigmoidea de pruebas físicas, escala de notas técnicas, pesos ponderados por posición táctica, derivación especializada para porteros, cálculo de mentalidad (MEN), bonus por logros y umbrales de carta con ejemplos numéricos verificados.

7. **[07-SEGURIDAD-Y-PERMISOS.md](07-SEGURIDAD-Y-PERMISOS.md)**:
   Matriz de control de acceso Rol × Recurso, políticas de aislamiento multi-tenant, mecanismo de sesión de soporte del Súper Admin sin acceso ambiental (M2), protección criptográfica y servicio seguro de fotografías de menores y comprobantes bancarios, política de sanitización de texto libre y registro en `AuditLog`.

8. **[08-OPERACION.md](08-OPERACION.md)**:
   Guía de despliegue y administración técnica: variables de entorno requeridas, comandos de terminal de mantenimiento, configuración del pooler de Supabase y conexiones directas, migraciones de esquema, tareas cron automatizadas en Vercel y suites de pruebas automatizadas.

9. **[09-AUDITORIA-DOCS.md](09-AUDITORIA-DOCS.md)**:
   Auditoría crítica de la documentación preexistente del proyecto (`docs/` y `AGENTS.md`), señalando discrepancias concretas entre lo que afirman los documentos y lo que ejecuta el código fuente activo, con evidencia `archivo:línea` de ambos lados.

10. **[10-MEJORAS.md](10-MEJORAS.md)**:
    Catálogo de oportunidades de mejora funcional, técnica y de experiencia de usuario detectadas durante el proceso de documentación, priorizadas por impacto y esfuerzo estimado.

---

## Cómo leer esta documentación

- **Si eres un desarrollador nuevo en el equipo**: Comienza por [03-ARQUITECTURA.md](03-ARQUITECTURA.md) y [04-MODELO-DE-DATOS.md](04-MODELO-DE-DATOS.md) para comprender la estructura general y las restricciones de diseño.
- **Si trabajas en seguridad o compliance**: Revisa [07-SEGURIDAD-Y-PERMISOS.md](07-SEGURIDAD-Y-PERMISOS.md) y la auditoría de discrepancias en [09-AUDITORIA-DOCS.md](09-AUDITORIA-DOCS.md).
- **Si vas a implementar una nueva pantalla o funcionalidad**: Consulta [01-INVENTARIO-POR-ROL.md](01-INVENTARIO-POR-ROL.md), [02-FLUJOS.md](02-FLUJOS.md) y el catálogo de [05-ACTIONS-Y-ENDPOINTS.md](05-ACTIONS-Y-ENDPOINTS.md).
- **Si necesitas ajustar fórmulas o métricas**: Lee [06-MOTOR-DE-STATS.md](06-MOTOR-DE-STATS.md).
