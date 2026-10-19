# Guía de Operación, Configuración y Despliegue

Este documento describe la infraestructura, configuración ambiental, comandos de mantenimiento, estrategia de datos semilla (*seeding*), suites de pruebas y tareas programadas en producción para Fútbol Career Mode.

---

## 1. Variables de Entorno Requeridas

Las variables deben configurarse en el archivo `.env` local y en el panel de variables de entorno de Vercel/plataforma de hosting.

| Variable | Tipo | Propósito y Descripción |
|---|---|---|
| `DATABASE_URL` | Secreto | Cadena de conexión PostgreSQL con pooler transaccional (ej. Supabase PgBouncer en puerto `6543` con `?pgbouncer=true`). Utilizada por la aplicación en tiempo de ejecución. |
| `DIRECT_URL` | Secreto | Cadena de conexión directa a PostgreSQL (puerto `5432`). Requerida obligatoriamente por Prisma para ejecutar migraciones DDL (`migrate deploy`) y scripts de seed (`prisma db seed`). |
| `AUTH_SECRET` | Secreto | Clave criptográfica aleatoria de 32+ bytes para el cifrado y firma de tokens JWT de sesión en NextAuth v5. |
| `AUTH_URL` / `NEXTAUTH_URL` | Config | URL canónica pública de la aplicación (ej. `http://localhost:3000` en local o `https://academiaelite.app` en producción). |
| `CRON_SECRET` | Secreto | Token Bearer estático utilizado por Vercel Cron para autenticar la ejecución de endpoints programados en `/api/cron/*`. |
| `SUPABASE_URL` | Config | Endpoint REST del proyecto Supabase (ej. `https://xxxx.supabase.co`). |
| `SUPABASE_SERVICE_ROLE_KEY`| Secreto | Credencial administrativa de Supabase con permisos de Service Role para gestionar la subida y lectura de fotografías privadas de menores y comprobantes de pago en Storage. |
| `UPSTASH_REDIS_REST_URL` | Config | Endpoint REST de la base de datos Redis serverless en Upstash. |
| `UPSTASH_REDIS_REST_TOKEN` | Secreto | Token de autenticación para Upstash Redis, utilizado por el limitador de tasa (*rate limit*) en login, registro y formularios de captación. |
| `RESEND_API_KEY` | Secreto | Clave de API del proveedor de correo transaccional Resend para despacho de códigos OTP, enlaces de contraseña y notificaciones. |
| `EMAIL_FROM` | Config | Remitente verificado en formato `Nombre <correo@dominio.com>`. |
| `EMAIL_DEV_TO` | Config | Correo de captura de pruebas en entornos no productivos para evitar envíos a correos reales de alumnos. |
| `EMAIL_EQUIPO` | Config | Buzón interno donde se notifican altas de leads comerciales y alertas del sistema. |

---

## 2. Comandos Operativos

El gestor de paquetes oficial del proyecto es **npm** sobre **Node.js 22+**.

```bash
# Instalación de dependencias (ejecuta prisma generate y copia assets de WebAssembly)
npm install

# Servidor de desarrollo con Turbopack (http://localhost:3000)
npm run dev

# Verificación de tipos TypeScript estricto (debe quedar LIMPIO, sin errores)
npm run typecheck

# Análisis estático de código con ESLint (debe quedar LIMPIO, sin warnings)
npm run lint

# Ejecución de pruebas unitarias con Vitest (570 tests)
npm run test

# Pruebas unitarias en modo interactivo/watch
npm run test:watch

# Ejecución de pruebas End-to-End con Playwright (en puerto 3100 contra esquema aislado)
npm run test:e2e

# Aplicar migraciones pendientes de base de datos
npx prisma migrate deploy

# Cargar base de datos semilla demo (idempotente)
npm run db:seed

# Cargar datos sintéticos de evolución histórica deportiva
npm run db:seed:evolucion

# Reinicio completo de base de datos local (PELIGRO: borra tablas y re-ejecuta migraciones + seed)
npm run db:reset

# Compilación de producción estándar
npm run build

# Comando de compilación utilizado en Vercel (migraciones automáticas + build)
npm run vercel-build
```

---

## 3. Estrategia de Datos Semilla (`prisma/seed.ts`)

El script de seed es **completamente idempotente** y está diseñado para dejar un entorno de desarrollo o *staging* listo para usar sin requerir pasos manuales adicionales:

1. **Limpieza en Cascada**: Purgado de tablas respetando la integridad referencial (auditorías, notificaciones, asistencias, evaluaciones, cuotas, jugadores, sedes, usuarios).
2. **Catálogos Globales**:
   - Parámetros del motor de stats v1.1 (`ParametroFormula`).
   - Percentiles físicos de referencia por grupo de edad (Sub-8 a Sub-16).
   - Catálogo global de logros, insignias y fondos cosméticos.
   - Conceptos estándar del sistema (Matrícula, Mensualidad, Torneo).
3. **Escuela Curada Demo**:
   - Crea la academia modelo **"Academia Élite"** (`slug: academia-elite`).
   - Genera los 4 roles principales con credenciales estándar documentadas (`Demo1234!`):
     - Super Administrador (`admin@plataforma.com`)
     - Administrador de Escuela (`admin@academiaelite.com`)
     - Director Técnico (`dt@academiaelite.com`)
     - Tutor / Familiar de Alumno (`padre@familia.com`)
4. **Muestra Deportiva y Financiera**:
   - 3 Categorías (Sub-10, Sub-12, Sub-14) con canchas y sedes físicas.
   - Alumnos con fichas médicas, cartas en diferentes niveles (Bronce, Plata, Oro, Héroe), evaluaciones históricas, agenda de partidos con resultados y cuotas pagadas/pendientes.

---

## 4. Estrategia de Pruebas Automatizadas

La suite de validación de calidad comprende dos niveles independientes:

### 4.1 Pruebas Unitarias y de Integración (`npm run test`)
- Motor: **Vitest**.
- Alcance: 50 suites de pruebas con más de 570 casos evaluados en milisegundos.
- Cobertura crítica:
  - Pureza del motor de estadísticas (`compute.test.ts`, `weights.test.ts`, `normalize.test.ts`).
  - Guards de seguridad y control de acceso (`guards.test.ts`).
  - Test guardián de aislamiento multi-tenant (`aislamiento-tenant.test.ts`).
  - Lógica de cálculo de cuotas, descuentos comerciales y aranceles.
  - Sanitización de texto libre contra inyecciones XSS.

### 4.2 Pruebas End-to-End (`npm run test:e2e`)
- Motor: **Playwright**.
- Aislamiento de Base de Datos: Para evitar corromper datos de producción o del entorno local, los tests E2E configuran automáticamente un esquema PostgreSQL temporal aislado (`e2e`) dentro de Supabase mediante variables de entorno en el script de arranque.
- Flujos cubiertos:
  - Autenticación y redirección por rol en `proxy.ts`.
  - Carga y visualización de la carta del jugador.
  - Creación de evaluaciones por parte del DT.
  - Gestión de solicitudes y bloqueo de alumnos morosos.

---

## 5. Tareas Programadas y Procesos en Segundo Plano (Crons)

El sistema aprovecha los Vercel Crons configurados en `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/men-diario",
      "schedule": "0 5 * * *"
    },
    {
      "path": "/api/cron/limpiar-notificaciones",
      "schedule": "0 0 1 * *"
    }
  ]
}
```

1. **Curva de Desarrollo Nocturna (`/api/cron/men-diario`)**:
   - Frecuencia: Todos los días a las 05:00 UTC (medianoche en Colombia).
   - Función: Recorre todas las escuelas activas, evalúa la constancia de asistencia y cumplimiento semanal de los deportistas, ajusta el atributo MEN de la carta y actualiza el OVR dinámico sin requerir intervención del DT.
2. **Purga de Notificaciones Antiguas (`/api/cron/limpiar-notificaciones`)**:
   - Frecuencia: Día 1 de cada mes a las 00:00 UTC.
   - Función: Elimina registros de notificaciones marcadas como leídas con antigüedad superior a 90 días, optimizando el tamaño de la base de datos.
