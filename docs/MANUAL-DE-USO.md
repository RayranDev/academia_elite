# MANUAL DE USO — Fútbol Career Mode

Guía por rol. Usuarios demo (entorno local), contraseña **`Demo1234!`**:
`admin@demo.app` · `escuela@demo.app` · `dt@demo.app` · `jugador@demo.app`.

> Si alguna vez ves una pantalla de sesión expirada, entra a `/api/salir` y
> vuelve a iniciar sesión.

## 1. Súper Admin (`/admin`)

1. Entra en `/login` → te redirige a `/admin`.
2. **Leads**: revisa el pipeline (Nuevo → Contactado → Convertido/Descartado).
   Para incorporar una escuela: abre el lead → **"Convertir → escuela"** →
   completa nombre, slug y email del administrador → el sistema crea la escuela
   y su cuenta admin con una **contraseña temporal** (comunícala por canal
   seguro; se muestra una sola vez).
3. **Parámetros**: ajusta el peso de MEN en el OVR. Cada cambio queda **auditado**
   y solo afecta a evaluaciones futuras.
4. **Auditoría**: consulta las acciones sensibles registradas.

## 2. Administrador de Escuela (`/escuela`)

1. **Branding**: configura el color (white-label), nombre, logo y la frecuencia
   de evaluación. El color tiñe los acentos de todos los paneles de tu escuela.
2. **Categorías**: crea categorías (ej. Sub-12, años 2014–2015).
3. **Sedes**: registra sedes y sus canchas.
4. **DTs**: crea cuentas de director técnico asignándoles categorías (reciben una
   **contraseña temporal**).
5. **Códigos**: genera códigos de invitación por categoría (usos + caducidad) y
   compártelos con las familias.
6. **Anuncios**: publica anuncios globales o por categoría; marca "mostrar al
   jugador" para que aparezcan como noticia del club.

## 3. DT / Entrenador (`/dt`)

1. **Plantilla**: ves tus jugadores como mini-cartas; en **rojo** los que tienen
   la evaluación vencida. KPIs arriba.
2. **Solicitudes**: aprueba o rechaza a las familias que se registraron con un
   código. Al aprobar, el jugador pasa a ACTIVO.
3. **Evaluar**: abre un jugador → **"Evaluar ahora"** → carga 4 pruebas físicas
   (medidas reales), 4 técnicas y 4 de mentalidad (1–10) + observaciones
   privadas. Al guardar, **la carta nace/recalcula** con OVR y sello MEN. Las
   evaluaciones no se editan: si te equivocas, pide al admin que la anule y crea
   una nueva.
4. **Objetivos**: desde la ficha del jugador fija metas (stat + valor + fecha).
5. **Calendario**: crea entrenamientos (con repetición semanal) y partidos;
   convoca jugadores; el día del evento **pasa lista** y, si fue partido, **carga
   el resultado** (genera noticia del club y avisa a las familias).
6. **Mensajes**: abre hilos privados con cada familia y publica anuncios.

## 4. Familia (padre/tutor) (`/jugador`)

1. **Registro**: entra en `/registro/CÓDIGO` con el código que te dio la escuela,
   crea tu cuenta y los datos de tu hijo/a. Queda **pendiente** hasta que el DT
   apruebe.
2. **Inicio (hub)**: la carta de tu hijo/a con su OVR y nivel, próximos eventos,
   objetivos, último partido, noticias del club y la evolución histórica.
3. **Convocatorias**: confirma o declina la asistencia desde el inicio.
4. **Perfil → Foto**: sube una foto y otorga el consentimiento. Puedes **revocarlo
   cuando quieras**: la carta vuelve al avatar de inmediato.
5. **Mensajes**: comunícate con el DT en hilos privados sobre tu hijo/a.
6. **Logros**: vitrina de insignias y bonus (los bonus se aplican en la
   **siguiente** evaluación, con tope anti-inflación).

## Preguntas frecuentes

- **¿Por qué la carta no cambió tras un logro?** Los bonus se aplican en la
  siguiente evaluación, con un máximo acumulado (+3 por defecto).
- **¿Por qué veo un avatar y no la foto?** Falta el consentimiento o fue revocado.
- **Olvidé mi contraseña** (Fase 1): pídela al administrador de tu escuela, que
  puede regenerarla (queda auditado).
- **No hay rankings**: la progresión compara al jugador solo consigo mismo.
