# Arquitectura del Sistema

## 1. Principios y Arquitectura por Capas

**Fútbol Career Mode** sigue una arquitectura por capas estricta e unidireccional. La regla dorada del proyecto es: **nunca se saltan capas**. Ningún componente de la interfaz llama directamente a un repositorio de base de datos; ninguna Server Action construye consultas Prisma directas; y ningún modelo generado por el ORM se expone crudo a los componentes visuales.

```
+-----------------------------------------------------------+
| 1. UI / Componentes & Páginas (RSC / "use client")         |
|    src/app/**/page.tsx  |  src/components/**               |
+-----------------------------------------------------------+
                              | (invoca Server Action o lee RSC)
                              v
+-----------------------------------------------------------+
| 2. Frontera de Entrada: Server Actions / Route Handlers   |
|    src/actions/**.actions.ts  |  src/app/api/**/route.ts  |
|    - Valida AuthContext (sesión)                          |
|    - Valida inputs externos con esquemas Zod              |
|    - Aplica Rate Limiting distribuido (Upstash Redis)     |
|    - Mapea excepciones de dominio con mapError()          |
+-----------------------------------------------------------+
                              | (invoca con AuthContext y DTO tipado)
                              v
+-----------------------------------------------------------+
| 3. Capa de Negocio y Dominio: Servicios                   |
|    src/services/**.service.ts                             |
|    - Aplica Guards de RBAC (Barrera 2 de Seguridad)       |
|    - Aplica aislamiento multi-tenant (assertTenant)       |
|    - Orquesta transacciones ($transaction)                |
|    - Invoca al motor puro (stats-engine)                  |
|    - Registra eventos sensibles en AuditLog               |
+-----------------------------------------------------------+
                              | (llama métodos del repositorio con escuelaId)
                              v
+-----------------------------------------------------------+
| 4. Capa de Acceso a Datos: Repositorios                   |
|    src/repositories/**.repository.ts                      |
|    - Consultas Prisma tipadas                             |
|    - Filtro forzoso por escuelaId o // tenant-global:     |
|    - Proyecciones limpias (select / include acotados)     |
+-----------------------------------------------------------+
                              | (ejecuta sobre el pooler)
                              v
+-----------------------------------------------------------+
| 5. Persistencia: Prisma Client & PostgreSQL               |
|    src/generated/prisma  |  Supabase PostgreSQL           |
+-----------------------------------------------------------+
```

---

## 2. Responsabilidades por Capa

### Capa 1: UI / Presentación (`src/app/`, `src/components/`)
- **React Server Components (RSC) por defecto**: Toda página o componente de renderizado estático se ejecuta en el servidor, cargando datos mediante invocaciones directas a servicios de lectura con `await requireAuthContext()` o `requirePanelUser()`.
- **Client Components selectivos (`"use client"`)**: Reservados exclusivamente para elementos que requieran estado interactivo (`useState`, `useTransition`), manejo de eventos de usuario, canvas, recortes de imágenes (`react-easy-crop`) o animaciones de `framer-motion`.
- **Consumo de DTOs planos**: La interfaz jamás recibe instancias complejas de modelos Prisma (que incluyen tipos especiales como `Decimal`). Todos los datos recibidos son objetos JavaScript puros tipados en `src/types/` y convertidos mediante mappers (`src/lib/mappers/`).

### Capa 2: Frontera de Entrada (`src/actions/`, `src/app/api/`)
- **Extracción segura de identidad**: Construye el objeto `AuthContext` leyendo la sesión criptográfica activa (JWT de Auth.js) mediante `requireAuthContext()`. **Nunca** confía en identificadores de usuario o escuela enviados en el cuerpo del request.
- **Validación con Zod**: Toda entrada pasa por un esquema Zod estricto (`src/lib/validators/`). Los campos de texto libre aplican obligatoriamente el sanitizador `textoSeguro()` (`src/lib/validators/sanitizar.ts`) que rechaza HTML, scripts y etiquetas maliciosas en profundidad.
- **Contrato uniforme `ActionResult<T>`**: Las Server Actions retornan siempre una estructura discriminada:
  ```typescript
  export type ActionResult<T = void> =
    | { ok: true; data?: T }
    | { ok: false; error: string };
  ```
- **Mapeo de errores seguro (`mapError`)**: Las excepciones no controladas se capturan en un bloque `try/catch` y se pasan por `mapError(e)` (`src/lib/action-result.ts`), el cual re-lanza señales de control de Next.js (`NEXT_REDIRECT`, `NEXT_NOT_FOUND`) y oculta detalles internos de infraestructura o base de datos tras mensajes genéricos.

### Capa 3: Servicios de Dominio (`src/services/`)
- **Barrera 2 de Seguridad (La seguridad real)**: A diferencia del proxy que solo redirige por UX, los servicios aplican las aserciones de autorización no negociables:
  - `requireRole(ctx, roles)`: 403 Forbidden si el rol no tiene acceso.
  - `assertTenant(ctx, escuelaId)`: Cruce de tenant lanza `TenantMismatchError` que se traduce en **404 Not Found**, evitando confirmar la existencia del recurso a atacantes externos.
  - `assertSoportePuedeEscribir(ctx)` y `assertMotivoSoporte(ctx, motivo)`: Exigencia para el `SUPER_ADMIN` de contar con una sesión de soporte activa en modo escritura y con justificación registrada.
  - `assertOwnPlayer(ctx, jugadorId, propios)`: Garantiza que un padre o tutor solo acceda a los menores legalmente vinculados a su cuenta.
- **Orquestación pura**: Los servicios coordinan las llamadas a múltiples repositorios dentro de transacciones de base de datos (`db.$transaction`) cuando se requiere consistencia atómica.

### Capa 4: Repositorios de Acceso a Datos (`src/repositories/`)
- **Aislamiento Multi-Tenant**: Toda consulta que involucre un modelo con columna `escuelaId` exige explícitamente dicho parámetro en su bloque `where`:
  ```typescript
  where: { id, escuelaId }
  ```
  Las consultas legítimamente cross-tenant (como búsquedas por clave única en tablas globales o crons del sistema) deben estar comentadas explícitamente con `// tenant-global: <razón>`, lo cual es validado permanentemente por la prueba estricta `tests/unit/aislamiento-tenant.test.ts`.

### Capa 5: Base de Datos y Motor Puro
- **Cliente Prisma Autogenerado**: Ubicado en `src/generated/prisma/`. No se modifica manualmente.
- **Motor de Stats Puro (`src/lib/stats-engine/`)**: Módulo matemático totalmente desacoplado de React y Prisma. Mismas entradas producen siempre exactamente las mismas salidas sin efectos secundarios.

---

## 3. Las Dos Barreras de Seguridad

```
+-----------------------------------------------------------------------------------+
| BARRERA 1: Proxy UX (src/proxy.ts)                                                |
| - Inspecciona token JWT edge-safe en la petición HTTP.                            |
| - Si ruta protegida sin sesión -> Redirige a /login.                              |
| - Si usuario DT entra a /admin -> Redirige a /dt (solo UX amigable).              |
| - Emite cabecera Content-Security-Policy (CSP) estricta por ruta.                |
| * ADVERTENCIA: No es la seguridad real; un atacante puede alterar headers o rutas |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| BARRERA 2: Guards de Dominio en Servicios (src/lib/auth/guards.ts)                |
| - Construye AuthContext criptográfico en el servidor.                             |
| - requireRole(ctx, ['DT']) -> ForbiddenError (403).                               |
| - assertTenant(ctx, recurso.escuelaId) -> TenantMismatchError (404 Not Found).     |
| - assertOwnPlayer(ctx, jugadorId, hijos) -> 404 si intenta IDOR sobre otro niño.  |
| - assertSoportePuedeEscribir(ctx) -> Bloquea escritura al SUPER_ADMIN sin permiso.|
| - Inserción obligatoria en AuditLog para acciones sensibles.                      |
+-----------------------------------------------------------------------------------+
```

---

## 4. Traza Real Paso a Paso: Creación de un Objetivo de Desarrollo

Para ilustrar el cruce estricto de capas, a continuación se traza la ejecución real de fijación de un Objetivo Deportivo de un DT para un jugador, desde el clic en pantalla hasta la escritura en PostgreSQL.

### Paso 1: Interfaz de Usuario (Componente Cliente)
**Archivo**: `src/components/dt/ObjetivoForm.tsx` (Líneas 23-45)
El entrenador selecciona el atributo (ej. "TIR"), el valor meta ("75") y la fecha límite ("2026-11-30") en el formulario interactivo. Al pulsar "Guardar objetivo", el componente despacha la mutación mediante el hook `useEnvioAccion`:
```typescript
const { enviar, pendiente, resultado } = useEnvioAccion(crearObjetivoAction);
...
<form onSubmit={enviar}>
  <input type="hidden" name="jugadorId" value={jugadorId} />
  ...
```

### Paso 2: Server Action (Frontera de Entrada)
**Archivo**: `src/actions/dt.actions.ts` (Líneas 63-81)
Se ejecuta en el entorno servidor (Node.js/Next.js):
```typescript
export async function crearObjetivoAction(formData: FormData): Promise<ActionResult> {
  try {
    // 1. Obtiene la identidad real de la sesión (Barrera 1 -> Contexto)
    const ctx = await requireAuthContext();

    // 2. Valida la estructura y tipos con Zod
    const parsed = objetivoSchema.safeParse({
      jugadorId: formData.get("jugadorId"),
      stat: formData.get("stat"),
      valorMeta: formData.get("valorMeta"),
      fechaLimite: formData.get("fechaLimite"),
    });
    if (!parsed.success) throw new ValidationError(primerError(parsed.error.issues));

    // 3. Invoca la capa de servicio
    await crearObjetivoDt(ctx, parsed.data);

    // 4. Invalida la caché del servidor para refrescar la ficha del jugador
    revalidatePath(`/dt/jugadores/${parsed.data.jugadorId}`);
    return { ok: true };
  } catch (e) {
    // 5. Mapea excepciones a contrato seguro sin exponer internals
    return mapError(e);
  }
}
```

### Paso 3: Servicio de Dominio (Lógica y Seguridad)
**Archivo**: `src/services/objetivo.service.ts` (Líneas 15-40)
Aplica la lógica de negocio y las verificaciones de autorización:
```typescript
export async function crearObjetivoDt(ctx: AuthContext, input: ObjetivoInput): Promise<void> {
  // 1. Verifica rol DT y obtiene el alcance de sus categorías
  const { escuelaId, entrenadorId, categoriaIds } = await categoriasDelDt(ctx);

  // 2. Verifica existencia y pertenencia del menor al tenant y al DT (Barrera 2)
  const jugador = await obtenerJugador(escuelaId, input.jugadorId);
  if (!jugador || !categoriaIds.includes(jugador.categoriaId)) {
    // Retorna 404 estricto para no confirmar existencia ante IDOR
    throw new NotFoundError("Jugador no encontrado.");
  }

  // 3. Valida reglas deportivas (la meta debe ser un número entero entre 1 y 99)
  if (input.valorMeta < 1 || input.valorMeta > 99) {
    throw new ValidationError("La meta debe estar entre 1 y 99.");
  }

  // 4. Delega la persistencia al repositorio
  await crearObjetivo(escuelaId, {
    jugadorId: input.jugadorId,
    entrenadorId,
    stat: input.stat,
    valorMeta: input.valorMeta,
    fechaLimite: new Date(input.fechaLimite),
  });
}
```

### Paso 4: Repositorio (Acceso a Datos Multi-Tenant)
**Archivo**: `src/repositories/objetivo.repository.ts` (Líneas 10-28)
Construye la mutación Prisma garantizando que la entidad lleve el `escuelaId` del tenant:
```typescript
export function crearObjetivo(
  escuelaId: string,
  datos: {
    jugadorId: string;
    entrenadorId: string;
    stat: string;
    valorMeta: number;
    fechaLimite: Date;
  },
) {
  return db.objetivoJugador.create({
    data: {
      escuelaId, // Tenant scoping obligatorio
      jugadorId: datos.jugadorId,
      entrenadorId: datos.entrenadorId,
      stat: datos.stat,
      valorMeta: datos.valorMeta,
      fechaLimite: datos.fechaLimite,
    },
  });
}
```

### Paso 5: Base de Datos PostgreSQL
**Motor**: Supabase PostgreSQL vía `@prisma/adapter-pg`.
Prisma ejecuta una sentencia `INSERT INTO "ObjetivoJugador"` vinculando la clave foránea `escuelaId` y `jugadorId`. La tabla cuenta con Row Level Security (RLS) habilitado como defensa en profundidad a nivel de almacenamiento.
