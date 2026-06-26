# Nuevos Requerimientos y Análisis (Backlog)

Este documento recopila las correcciones, mejoras y puntos de análisis propuestos para la plataforma, sirviendo como base para los próximos sprints.

## 🛠️ Cambios y Correcciones (Action Items)

1. **Gestión Directa por el Super Admin**
   - **Problema actual**: El Super Admin no puede crear escuelas o perfiles directamente; depende del flujo de "lead" (formulario público).
   - **Solución**: Habilitar un panel en el dashboard del `SUPER_ADMIN` con un CRUD completo para dar de alta Escuelas, asignar el `ESCUELA_ADMIN` inicial, y crear perfiles libremente bajo motivos auditados.

2. **Gestión de Leads (Prospectos de Escuelas)**
   - **Problema actual**: Los datos de contacto de las escuelas interesadas no se pueden visualizar bien ni editar antes de la conversión.
   - **Solución**: Mejorar la tabla y vista de detalle de Leads. Agregar capacidad de agregar notas, cambiar estados (Ej: Contactado, En progreso) y editar la información básica antes de pasarlo a Escuela activa.

3. **Flujo de Registro y Login**
   - **Problema actual**: Al crear una cuenta (o registrarse), el flujo termina abruptamente sin una clara redirección al login.
   - **Solución**: Implementar una pantalla de "Registro Exitoso" con un botón primario claro para `[Volver al Login]` o redirección automática después de N segundos.

4. **Visibilidad de Notificaciones**
   - **Problema actual**: Las solicitudes y alertas no se ven reflejadas globalmente (ej: en el perfil del DT).
   - **Solución**: Unificar el sistema de notificaciones. Mostrar un ícono de campana en el layout principal (Navbar/Header) para que cualquier perfil (DT, Admin, Jugador) vea sus alertas pendientes, independientemente de la vista en la que se encuentre.

5. **Sanitización y Formateo de Nombres (Title Case)**
   - **Problema actual**: Los usuarios ingresan nombres en mayúsculas sostenidas (`JUAN`), minúsculas (`juan`), o mixtos, lo que rompe la estética de las cartas y tablas.
   - **Solución**: Aplicar formateo *Title Case* (Capitalización de la primera letra de cada palabra) en los esquemas de validación de Zod y antes de guardar en Prisma. Ej: `juan carlos` -> `Juan Carlos`.


---

## 🧠 Puntos de Análisis y Arquitectura

### 1. Nomenclatura Escalable de IDs (Ej: ESC001, DT001)
**Propuesta:** Usar IDs secuenciales y jerárquicos como `ESC001FAM000001JUG0000001`.

**Análisis Arquitectónico:**
*   **En la Base de Datos (NO recomendado para Primary Keys):** Usar IDs secuenciales predecibles expone la API a *Enumeration Attacks* (un usuario cambia el ID en la URL a `ESC002` y ve otra escuela). Además, si un Jugador cambia de Escuela, su ID jerárquico perdería sentido o requeriría una actualización compleja en cascada.
*   **La Solución Real:** Bajo el capó (Base de datos), **debemos mantener UUIDs v4** (ej: `123e4567-e89b-12d3...`) por seguridad y aislamiento multi-tenant. 
*   **Para la Vista (Altamente recomendado):** Podemos generar un "Código de Referencia" o "Matrícula" corto (Ej: `ESC-001`, `JUG-9452`) que sea un campo secundario único (`@unique`). Esto sirve exactamente para lo que mencionás: soporte técnico rápido, búsqueda humana y credenciales impresas.

### 2. Simplificación del Perfil de Jugador (Solo Carta)
**Propuesta:** Que el niño solo vea su carta para evitar distracciones con un perfil complejo.

**Análisis de Producto:**
*   **Excelente iniciativa.** El concepto clave acá es "Progressive Disclosure" (Revelación progresiva). El niño entra por la gamificación. Su vista principal (y casi única) debe ser el render de su carta tipo EA FC, brillante y destacada.
*   **Implementación:** Reducir la navegación para el rol `JUGADOR`. En vez de mostrar menús de configuración o estadísticas complejas, el *dashboard* del jugador renderiza la carta en pantalla completa, un botón para descargarla/compartirla, y un historial simple de cómo ha evolucionado su OVR (Overall Rating). Los padres sí tendrían una vista de gestión más completa.

### 3. Captura de Foto con Silueta y Fondo Transparente
**Propuesta:** Cámara in-app desde el celular con guía (silueta) y recorte de fondo automático.

**Análisis Técnico:**
*   **Captura y Silueta (Fácil):** Podemos usar HTML5 `<video>` y la API `navigator.mediaDevices.getUserMedia` para abrir la cámara directo en el navegador (sin instalar apps). Sobre ese video flotará un SVG semi-transparente con la silueta de cabeza/hombros para que el jugador se alinee.
*   **Remoción de Fondo (Complejidad Media/Alta):** El navegador por sí solo no quita fondos. Para esto tenemos dos opciones:
    1.  **Backend IA:** Al tomar la foto, se envía al servidor y usamos una API externa (como *remove.bg* o un modelo open-source en Python) para quitar el fondo y devolver el PNG transparente a la carta.
    2.  **Solución pragmática (MVP):** Pedir en las instrucciones que se paren frente a una pared de color sólido (verde/blanco) e intentar aplicar un filtro de recorte, aunque es menos preciso que la IA.
    *Recomendación:* Empezar con la guía de silueta + instrucciones de fondo neutro, y evaluar integrar IA de recorte de imagen en una segunda fase si la calidad no es suficiente.
