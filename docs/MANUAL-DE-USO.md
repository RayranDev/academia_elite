# MANUAL DE USO — Fútbol Career Mode

Guía por rol. Las credenciales de las cuentas demo son de uso interno del
equipo y viven en [ACADEMIA-ELITE-DEMO.md](ACADEMIA-ELITE-DEMO.md), no acá.

> Si alguna vez ves una pantalla de sesión expirada, entra a `/api/salir` y
> vuelve a iniciar sesión.
>
> **La campana** 🔔 (arriba a la derecha, en todos los paneles) avisa
> convocatorias, mensajes nuevos, solicitudes y demás. Tocá un ítem para ir
> directo a esa sección; se marca como leído solo.

## 1. Súper Admin (`/admin`)

1. **Leads**: revisa el pipeline (Nuevo → Contactado → Convertido/Descartado).
   Para incorporar una escuela: abre el lead → **"Convertir → escuela"** →
   completa nombre, slug y email del administrador → el sistema crea la escuela
   y su cuenta admin con una **contraseña temporal** (comunícala por canal
   seguro; se muestra una sola vez).
2. **Escuelas**: listado global. Para ver el detalle de una escuela (jugadores,
   configuración) necesitás abrir una **sesión de soporte**: elegís un motivo
   (queda auditado) y arranca en **solo lectura**. Si necesitás escribir, la
   habilitás con otro motivo — no es un simple toggle, cada paso queda
   registrado. El Súper Admin **no** tiene acceso ambiental a los datos de un
   tenant fuera de esa sesión.
3. **Usuarios**: gestión global de cuentas (de cualquier escuela): edición,
   activar/desactivar, resetear contraseña.
4. **Parámetros**: ajusta el peso de MEN en el OVR y otros valores del motor de
   stats. Cada cambio queda **auditado** y solo afecta a evaluaciones futuras.
5. **Fondos**: administra el catálogo de fondos de carta (requisitos, disponi-
   bilidad) que las escuelas y jugadores desbloquean por mérito.
6. **Logros**: catálogo global de logros (además de los propios que cada DT
   puede crear para su escuela).
7. **Simulador**: probá combinaciones de medidas/fondo/foto y mirá el OVR y la
   carta resultante, sin guardar nada real.
8. **Auditoría**: consulta las acciones sensibles registradas, con filtros por
   entidad, acción, actor y rango de fechas.

## 2. Administrador de Escuela (`/escuela`)

1. **Branding**: configura el color (white-label), nombre, logo y la frecuencia
   de evaluación. El color tiñe los acentos de todos los paneles de tu escuela.
2. **Categorías**: crea categorías (ej. Sub-12, años 2014–2015).
3. **Sedes**: registra sedes y sus canchas.
4. **DTs**: crea cuentas de director técnico asignándoles categorías (reciben
   una **contraseña temporal**).
5. **Jugadores**: gestión global de tu plantel, con botones para **descargar
   Excel** de jugadores, evaluaciones y contactos/nómina (útil para citar a
   las familias).
6. **Asistencia**: matriz de evolución mensual por categoría (semáforo
   verde/ámbar/rojo) + exportar.
7. **Ranking**: top OVR y goleadores de la escuela + descargar resultados
   (partidos y estadística individual).
8. **Membresías**: cuotas por jugador y período (pagada/pendiente/vencida) +
   descargar cobranza. El bloqueo de acceso por mora se gestiona desde la
   ficha del jugador, no acá.
9. **Códigos**: genera códigos de invitación por categoría (usos + caducidad)
   y compártelos con las familias.
10. **Anuncios**: publica anuncios globales o por categoría; marca "mostrar al
    jugador" para que aparezcan como noticia del club.

## 3. DT / Entrenador (`/dt`)

1. **Hoy**: tu home. El o los eventos de hoy (con acceso directo a arrancar la
   sesión), tus evaluaciones vencidas y tus solicitudes pendientes — todo
   accionable de un toque.
2. **Plantilla**: ves tus jugadores como mini-cartas; en rojo los que tienen la
   evaluación vencida.
3. **Solicitudes**: aprueba o rechaza a las familias que se registraron con un
   código. Al aprobar, el jugador pasa a ACTIVO.
4. **Evaluar**: abre un jugador → **"Evaluar ahora"** → carga 4 pruebas físicas
   (medidas reales), 4 técnicas y 4 de mentalidad (1–10) + observaciones
   privadas. Al guardar, **la carta nace/recalcula** con OVR y sello MEN. Las
   evaluaciones no se editan: si te equivocás, pedile al admin que la anule y
   creá una nueva.
5. **Ficha del jugador**: además del historial de evaluaciones, ahí ves el
   **historial de observaciones** que cargaste sobre ese jugador (visibles a
   la familia o privadas), y podés fijarle un objetivo de desarrollo (stat +
   valor meta + fecha).
6. **Calendario**: crea entrenamientos (con repetición semanal) y partidos; en
   PARTIDO elegís vos la convocatoria, en ENTRENAMIENTO se convoca automática-
   mente todo el plantel activo de la categoría.
7. **Modo Sesión** (desde el evento del día): pasás lista de un toque,
   registrás observaciones (marcalas "visible a la familia" si querés que las
   vea) y cerrás la sesión con una nota general.
   - **En un partido** además tenés: marcador en vivo, goles con anotador,
     tarjetas amarilla/roja/azul (podés sumar o quitar en cualquier momento;
     2 amarillas equivalen a roja automáticamente) y una tabla de estadística
     individual (minutos, goles, asistencias) que podés revisar o corregir
     antes de cerrar. El cierre difunde el resultado a las familias **una
     sola vez**.
8. **Progreso**: valida semanalmente los hábitos de tus jugadores (alimenta su
   Mentalidad/Disciplina). Si el responsable ya la validó, no se duplica.
9. **Logros**: otorgá logros a tus jugadores, programá ventanas de disponibi-
   lidad para tu escuela o creá logros propios.
10. **Mensajes**: hilos privados con cada familia sobre su hijo/a.
11. **Anuncios**: publicá anuncios para tus categorías (sección separada de
    Mensajes).

## 4. Familia (padre/tutor) (`/jugador`)

1. **Registro**: entrá en `/registro/CÓDIGO` con el código que te dio la
   escuela, creá tu cuenta y los datos de tu hijo/a. Queda **pendiente** hasta
   que el DT apruebe.
2. **Inicio (hub)**: la carta de tu hijo/a con su OVR y nivel, próximos
   eventos, objetivos, último partido, noticias del club y la evolución
   histórica.
3. **Convocatorias**: confirmá o rechazá la asistencia desde el inicio.
4. **Detalle de un evento**: si es un partido que todavía no arrancó, vas a ver
   un aviso de que la estadística se publica cuando arranque — no es que
   falte, todavía no existe. Una vez jugado, vas a ver minutos, goles,
   asistencias, amarillas/roja/azul y las observaciones del DT que marcó como
   visibles para la familia.
5. **Perfil → Foto**: subí una foto y otorgá el consentimiento. Podés
   **revocarlo cuando quieras**: la carta vuelve al avatar de inmediato.
6. **Progreso**: la validación semanal de hábitos de tu hijo/a (la carga el DT
   o el responsable) y cómo eso mueve Mentalidad/Disciplina.
7. **Fondos**: galería de fondos de carta desbloqueados por mérito (logro,
   nivel de carta, nivel personal) — equipá el que quieras.
8. **Mensajes**: comunicate con el DT en hilos privados sobre tu hijo/a.
9. **Logros**: vitrina de insignias y bonus (los bonus se aplican en la
   **siguiente** evaluación, con tope anti-inflación).

## Preguntas frecuentes

- **¿Por qué la carta no cambió tras un logro?** Los bonus se aplican en la
  siguiente evaluación, con un máximo acumulado (+3 por defecto).
- **¿Por qué veo un avatar y no la foto?** Falta el consentimiento o fue
  revocado.
- **¿Por qué no veo la estadística de un partido?** Todavía no arrancó — se
  publica cuando el DT inicia el Modo Sesión.
- **Olvidé mi contraseña**: pedila al administrador de tu escuela (o al DT si
  sos familia), que puede regenerarla (queda auditado).
- **No hay rankings entre escuelas**: por privacidad de menores, la
  progresión de tu hijo/a solo se compara consigo mismo; el ranking de
  `/escuela` es interno a tu propia escuela.
