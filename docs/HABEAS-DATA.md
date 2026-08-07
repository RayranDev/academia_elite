# Política de Tratamiento de Datos Personales y Habeas Data

**Plataforma:** Academia Elite — Fútbol Career Mode
**Última actualización:** 2026-08-01 · **Versión:** 1.0 (borrador)

> ⚠️ **AVISO LEGAL.** Este documento es un **borrador técnico** preparado por el
> equipo de desarrollo conforme a la **Ley 1581 de 2012**, el **Decreto 1377 de
> 2013** y demás normas concordantes de Colombia. **Debe ser revisado y aprobado
> por un abogado** y por el Oficial de Protección de Datos antes de publicarse.
> Los campos entre corchetes `[ ]` deben completarse con los datos reales del
> Responsable.

---

## 1. Identificación del Responsable del Tratamiento

- **Razón social:** [RAZÓN SOCIAL DE LA EMPRESA]
- **NIT:** [NIT]
- **Domicilio:** [DIRECCIÓN], [CIUDAD], Colombia
- **Correo para protección de datos:** [protecciondedatos@dominio.com]
- **Teléfono:** [TELÉFONO]
- **Sitio web:** academia-elite.app
- **Encargado(s) del Tratamiento:** proveedores de hosting/infraestructura y
  servicios técnicos que tratan datos por cuenta del Responsable (ver §12).

## 2. Marco legal

- **Constitución Política**, art. 15 (derecho al habeas data e intimidad).
- **Ley 1581 de 2012** (régimen general de protección de datos personales).
- **Decreto 1377 de 2013** (reglamentación parcial).
- **Ley 1266 de 2008** (datos financieros/crediticios — si aplica).
- Normas de la **Superintendencia de Industria y Comercio (SIC)**, autoridad de
  control.

## 3. Definiciones (art. 3 Ley 1581)

Titular, Tratamiento, Responsable, Encargado, Autorización, Dato personal, **Dato
sensible**, **Dato de niños, niñas y adolescentes (NNA)**, Aviso de privacidad,
Transferencia y Transmisión, conforme a la ley.

## 4. Datos personales que se tratan

| Categoría | Datos | Titular |
|---|---|---|
| Identificación de la familia/tutor | nombre, correo, teléfono | adulto responsable |
| Identificación del menor (jugador) | nombre, apellido, fecha de nacimiento, género (opcional), posición, categoría, dorsal | NNA (menor) |
| **Datos sensibles del menor — imagen** | **fotografía/imagen** del menor | NNA (menor) |
| **Datos sensibles del menor — salud** | EPS, RH, alergias, condiciones médicas, vencimiento del apto médico | NNA (menor) |
| Identificación oficial del menor | tipo y número de documento (RC/TI/CC/CE) | NNA (menor) |
| Contacto de emergencia | nombre, teléfono y parentesco de un contacto distinto al tutor registrado; autorización de traslado en caso de lesión | adulto designado por el tutor |
| Datos deportivos | medidas físicas, técnicas y de mentalidad; stats calculados; evaluaciones; progreso | NNA (menor) |
| Cuenta y seguridad | email, contraseña (hash bcrypt), rol, registros de auditoría | usuarios |
| Contacto comercial (leads) | nombre, escuela, email, teléfono, ciudad, mensaje | prospecto |

> La **fotografía** y los **datos de salud** de un menor son datos **sensibles**
> (arts. 5 y 6 Ley 1581: la salud es sensible por naturaleza; la imagen lo es
> porque permite identificar al menor) y reciben protección reforzada (§7).

## 5. Finalidades del Tratamiento

1. Prestar el servicio de gestión deportiva gamificada (cartas, evaluaciones,
   progreso, calendario, logros).
2. Vincular a la familia/tutor con el perfil del menor y darle acceso a sus
   estadísticas.
3. Gestionar la operación de las escuelas (categorías, DTs, eventos).
4. Seguridad, prevención de fraude y auditoría de acciones sensibles.
5. Contacto comercial con prospectos que dejan sus datos voluntariamente.
6. Cumplimiento de obligaciones legales.

**No** se realizan rankings públicos, perfilamiento con fines distintos a los
deportivos internos, ni venta de datos.

## 6. Autorización del Titular

- El Tratamiento requiere **autorización previa, expresa e informada** del Titular
  (art. 9 Ley 1581), recogida y **conservada como prueba** (registro con fecha).
- En el **registro** (familia/tutor) se solicita la aceptación de esta Política y
  del Aviso de Privacidad antes de crear la cuenta.
- La **fotografía del menor** exige una **autorización específica y separada**
  (consentimiento granular), que puede **revocarse en cualquier momento**.
- Los **datos de salud del menor** (EPS, RH, alergias, condiciones médicas)
  exigen, por la misma razón, una **autorización específica y separada** de la
  aceptación general de la Política. Es **opcional**: la escuela puede operar
  sin esta ficha, y la familia decide cargarla o no. Sin la autorización, esos
  campos no se muestran a nadie aunque estén guardados.

## 7. Tratamiento de datos de niños, niñas y adolescentes (NNA)

Conforme al art. 7 de la Ley 1581 y el Decreto 1377:

- El Tratamiento de datos de NNA solo procede cuando responde a su **interés
  superior** y respeta sus derechos fundamentales.
- La autorización la otorga el **representante legal** (padre/madre/tutor); el
  menor puede ser oído según su madurez.
- **Medidas reforzadas en la plataforma:**
  - Las **fotos de menores nunca son públicas**: se sirven por un endpoint
    autenticado, solo al responsable o al personal con consentimiento vigente; sin
    permiso responde 404.
  - La foto se procesa de forma segura: validación por *magic bytes*, **eliminación
    de metadatos EXIF** (incluida geolocalización), recompresión y nombre aleatorio.
  - **Revocar el consentimiento oculta la foto al instante** (la carta vuelve al
    avatar).
  - No existe canal de mensajería directo adulto↔menor.
  - No hay rankings ni exposición pública de métricas de menores.
  - Los **datos de salud del menor** (ficha administrativa/médica) exigen su
    propio consentimiento, registrado con fecha (`autorizaDatosSalud`,
    `autorizacionDatosSaludEn`) — el mismo mecanismo que la foto, aplicado a una
    categoría de dato distinta.
  - **Acceso restringido por rol, no solo por sesión.** El DT (entrenador en
    cancha) solo ve el contacto de emergencia, las alergias y la vigencia del
    apto médico — lo que necesita si un chico se lesiona en un partido de
    visitante. El documento de identidad y la EPS quedan reservados a
    `ESCUELA_ADMIN`. Es una restricción **adicional** al aislamiento
    multi-tenant: no toda persona con acceso legítimo al tenant accede a toda la
    ficha.
  - **La lectura de la ficha completa queda en `AuditLog`**, no solo su
    escritura: por su sensibilidad, se audita quién abrió la ficha (documento,
    EPS, condiciones médicas) de un menor y cuándo. Aplica a la vista dedicada
    de `ESCUELA_ADMIN`/`SUPER_ADMIN` — es una acción deliberada de consultar el
    expediente, no una visita rutinaria.
  - La vista **acotada** que ve el DT (alergias, apto médico, contacto de
    emergencia) es contexto incidental dentro de la ficha del jugador que ya
    usa para evaluar y convocar: se abre decenas de veces por sesión, así que
    auditar cada vista ahogaría el registro. Mismo criterio ya aplicado a la
    mora de cobranza que ve el DT: se deriva un valor acotado bajo su propia
    autorización, sin generar una entrada de auditoría por cada consulta.
  - Revocar la autorización oculta los campos de salud al instante, igual que
    la foto — el dato puede quedar guardado, pero deja de mostrarse.

## 8. Derechos del Titular (Habeas Data)

El Titular (o su representante legal, para NNA) puede:

- **Conocer, actualizar y rectificar** sus datos.
- Solicitar **prueba de la autorización** otorgada.
- Ser **informado** sobre el uso dado a sus datos.
- Presentar **quejas** ante la SIC por infracciones.
- **Revocar** la autorización y/o solicitar la **supresión** del dato cuando no
  exista deber legal o contractual de conservarlo.
- Acceder **gratuitamente** a sus datos.

## 9. Procedimiento para ejercer los derechos (consultas y reclamos)

- **Canal:** [protecciondedatos@dominio.com] (o el formulario habilitado).
- **Consultas:** se atienden en **máximo 10 días hábiles** (prorrogables 5 días
  hábiles más, art. 14).
- **Reclamos:** se tramitan en **máximo 15 días hábiles** (prorrogables 8 días
  hábiles, art. 15). Si está incompleto, se solicita completar en 5 días.
- El reclamo debe incluir: identificación del Titular, descripción de los hechos,
  dirección de contacto y documentos de soporte.

## 10. Medidas de seguridad (principio de seguridad, art. 4)

La plataforma aplica, entre otras:

- **Autenticación** con contraseñas en *hash* bcrypt (factor 12) y sesiones JWT.
- **Control de acceso por roles** y **aislamiento multi-tenant** (cada escuela
  solo ve lo suyo; el cruce de tenant responde 404).
- **Validación de toda entrada** (Zod) y defensa contra inyección de HTML/scripts;
  protección contra inyección de fórmulas en exportaciones.
- **Cabeceras de seguridad** (CSP, HSTS, X-Frame-Options, etc.).
- **Registro de auditoría** de acciones sensibles.
- **Protección reforzada de fotos de menores** (§7).
- Contraseñas temporales cripto-seguras, mostradas una sola vez, nunca
  almacenadas ni registradas en claro.
- Detalle técnico en [`SEGURIDAD.md`](SEGURIDAD.md).

> **Pendiente para producción:** RLS en la base de datos gestionada, cifrado en
> reposo del almacenamiento de fotos, copias de seguridad cifradas y registro de
> incidentes (ver §13).

## 11. Conservación de los datos

Los datos se conservan mientras exista la relación con la escuela/familia y el
tiempo adicional exigido por obligaciones legales o para la defensa de
reclamaciones. Cumplido el fin, se **suprimen o anonimizan**. (Definir períodos
concretos con asesoría legal.)

## 12. Encargados y transferencias/transmisiones

- Los proveedores de **infraestructura/hosting** y servicios técnicos actúan como
  **Encargados** y tratan los datos **solo** por instrucción del Responsable, bajo
  contrato de transmisión con cláusulas de seguridad y confidencialidad.
- Si hubiera **transferencia internacional**, se garantizará un nivel adecuado de
  protección o se obtendrá autorización del Titular, conforme a la ley.
- Hoy los avatares se generan **en el propio servidor** (sin API externa) para no
  exponer datos de menores.

## 13. Atención de incidentes de seguridad

Ante un incidente que afecte datos personales, el Responsable lo gestionará y, de
ser procedente, lo **reportará a la SIC** y a los Titulares afectados conforme a
la regulación vigente.

## 14. Aviso de Privacidad (resumen)

Cuando no sea posible poner a disposición esta Política completa, se entregará un
**Aviso de Privacidad** con: identidad del Responsable, finalidades, derechos del
Titular y canal de atención.

## 15. Vigencia

Esta Política rige desde su publicación. Las bases de datos se mantendrán vigentes
mientras dure la finalidad. Cualquier cambio sustancial se comunicará por los
canales habituales.

---

## Anexo A — Checklist de cumplimiento (estado en la plataforma)

| Requisito | Estado | Dónde |
|---|---|---|
| Autorización en el registro (aceptar política) | ✅ Implementado — se conserva **fecha y versión** de la política aceptada (`User.terminosAceptadosEn`, `terminosVersion`), como exige el art. 6 | `AceptarTerminos`, `registro.service`, `lib/legal` |
| Consentimiento específico para foto de menor | ✅ Implementado (otorgar/revocar) | `FotoConsentimiento` |
| Foto no pública + EXIF strip + acceso controlado | ✅ Implementado | `foto.service`, `process.ts` |
| Revocación oculta la foto al instante | ✅ Implementado | `actualizarConsentimiento` |
| Canal para derechos (consulta/reclamo) | ⛔ **Pendiente** (publicar correo y formulario) | — |
| Registro de auditoría | ✅ Implementado | `AuditLog` |
| Aislamiento multi-tenant | ✅ Implementado | guards/servicios |
| Validación anti-XSS / anti-inyección | ✅ Implementado | `validators/sanitizar`, `xlsx.protegerCelda` |
| Cifrado en reposo de fotos | ✅ Cubierto por el cifrado en reposo de Supabase Storage (bucket **privado**); no hay cifrado adicional a nivel de aplicación | Supabase Storage |
| RLS en BD gestionada | ✅ Implementado — habilitado en **todas** las tablas del esquema `public`; las migraciones que crean tablas reaplican el bloque | `enable_rls`, `enable_rls_observacion` |
| Política publicada y enlazada en la web | ✅ Implementado — `/legal` con versión visible, enlazada desde el footer y desde el registro | `Footer`, `AceptarTerminos`, `/legal` |
| Datos sensibles de salud (EPS, RH, alergias) | ✅ **Implementado** (2026-08-01) — consentimiento específico que gatea guardado Y lectura (`autorizaDatosSalud`); acceso restringido por rol (DT: solo emergencia/alergias/apto médico; ESCUELA_ADMIN: todo); lectura de la ficha completa auditada | `Jugador` (ficha), `gestion-jugadores.service.ts`, `AuditLog` |

## Anexo B — Texto sugerido de autorización (registro)

> «Autorizo de manera previa, expresa e informada a **[RAZÓN SOCIAL]** para tratar
> mis datos personales y, en mi calidad de representante legal, los de mi hijo(a)
> menor de edad, con las finalidades descritas en la Política de Tratamiento de
> Datos disponible en academia-elite.app. Declaro que se me informó sobre mis
> derechos como Titular (conocer, actualizar, rectificar, revocar y suprimir) y el
> canal para ejercerlos. La autorización para el uso de **fotografías** del menor
> es **opcional** y la puedo otorgar o revocar en cualquier momento desde la
> plataforma.»
