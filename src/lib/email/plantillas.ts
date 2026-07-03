/**
 * Plantillas de correo (funciones puras → `{ subject, html, text }`). Sin efectos
 * ni acceso a datos. Marca Academia Elite. El HTML usa estilos inline (los
 * clientes de correo no soportan hojas de estilo externas).
 */

export interface Plantilla {
  subject: string;
  html: string;
  text: string;
}

const MARCA = "Academia Elite";
const TAGLINE = "Donde nacen las estrellas";

function escapar(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(titulo: string, cuerpoHtml: string): string {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#070b14;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:22px;font-weight:800;font-style:italic;text-transform:uppercase;color:#f1f5f9;">${MARCA}</div>
      <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#4ade80;">${TAGLINE}</div>
    </div>
    <div style="background:#0f1623;border:1px solid #1f2937;border-radius:16px;padding:24px;color:#e5e7eb;font-size:14px;line-height:1.6;">
      <h1 style="margin:0 0 12px;font-size:18px;color:#f1f5f9;">${titulo}</h1>
      ${cuerpoHtml}
    </div>
    <p style="text-align:center;font-size:11px;color:#6b7280;margin-top:24px;">
      Si no esperabas este correo, podés ignorarlo con tranquilidad.
    </p>
  </div></body></html>`;
}

function boton(texto: string, url: string): string {
  return `<p style="text-align:center;margin:20px 0;"><a href="${url}" style="display:inline-block;background:#4ade80;color:#04140a;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:10px;">${texto}</a></p>`;
}

function enlaceCrudo(url: string): string {
  return `<p style="font-size:12px;color:#9ca3af;word-break:break-all;">${url}</p>`;
}

/** Muestra un código de 6 dígitos grande y legible. */
function bloqueCodigo(codigo: string): string {
  return `<p style="text-align:center;font-size:32px;font-weight:800;letter-spacing:8px;color:#4ade80;margin:16px 0;">${escapar(codigo)}</p>`;
}

/**
 * Alta de cuenta: código para que el responsable fije su propia contraseña.
 * `url` lleva a la página de activación con el correo precargado (comodidad); la
 * seguridad la da el código, que hay que tipear (no es un enlace clickeable que
 * abra la cuenta desde un buzón ajeno).
 */
export function setPassword(nombre: string, codigo: string, url: string): Plantilla {
  return {
    subject: `${codigo} — Activá tu cuenta en Academia Elite`,
    html: layout(
      `Hola ${escapar(nombre)}, activá tu cuenta`,
      `<p>Se creó una cuenta para vos en Academia Elite. Ingresá este código para fijar tu contraseña (vence en 24 horas y es de un solo uso):</p>
       ${bloqueCodigo(codigo)}
       <p>Podés hacerlo desde este enlace (te lleva con el correo ya cargado; el código lo ingresás vos):</p>
       ${boton("Activar mi cuenta", url)}
       ${enlaceCrudo(url)}`,
    ),
    text: `Hola ${nombre}, activá tu cuenta en Academia Elite.\nTu código para fijar la contraseña es: ${codigo}\n(Vence en 24 horas y es de un solo uso.)\nActivá acá: ${url}`,
  };
}

/** Recuperación: código para restablecer la contraseña. */
export function recuperacion(codigo: string): Plantilla {
  return {
    subject: `${codigo} — Restablecé tu contraseña — Academia Elite`,
    html: layout(
      "Restablecé tu contraseña",
      `<p>Pediste restablecer tu contraseña. Ingresá este código para elegir una nueva (vence en 30 minutos y es de un solo uso):</p>
       ${bloqueCodigo(codigo)}
       <p style="color:#9ca3af;">Si no fuiste vos, ignorá este correo: tu contraseña no cambia.</p>`,
    ),
    text: `Restablecé tu contraseña en Academia Elite.\nTu código es: ${codigo}\n(Vence en 30 minutos y es de un solo uso. Si no fuiste vos, ignoralo.)`,
  };
}

/** Verificación de correo tras registro (código). */
export function verificacion(nombre: string, codigo: string): Plantilla {
  return {
    subject: `${codigo} — Verificá tu correo — Academia Elite`,
    html: layout(
      `Hola ${escapar(nombre)}, confirmá tu correo`,
      `<p>Gracias por registrarte. Ingresá este código en la app para confirmar que este correo es tuyo (vence en 48 horas):</p>
       ${bloqueCodigo(codigo)}
       <p style="color:#9ca3af;">Si no fuiste vos, ignorá este correo.</p>`,
    ),
    text: `Hola ${nombre}, verificá tu correo en Academia Elite.\nTu código es: ${codigo}\n(Vence en 48 horas.)`,
  };
}

/** Código de un solo uso (login/acción sensible). */
export function otp(codigo: string): Plantilla {
  return {
    subject: `${codigo} es tu código de acceso — Academia Elite`,
    html: layout(
      "Tu código de acceso",
      `<p>Usá este código para continuar (vence en 10 minutos):</p>
       <p style="text-align:center;font-size:32px;font-weight:800;letter-spacing:8px;color:#4ade80;margin:16px 0;">${escapar(codigo)}</p>
       <p style="color:#9ca3af;">Si no lo solicitaste, ignorá este correo.</p>`,
    ),
    text: `Tu código de acceso a Academia Elite es: ${codigo}\n(Vence en 10 minutos. Si no lo solicitaste, ignoralo.)`,
  };
}

/** Código para confirmar un cambio de correo (se envía al correo NUEVO). */
export function cambioEmail(codigo: string): Plantilla {
  return {
    subject: `${codigo} — Confirmá tu nuevo correo en Academia Elite`,
    html: layout(
      "Confirmá tu nuevo correo",
      `<p>Pediste usar este correo en tu cuenta de Academia Elite. Ingresá este código para confirmarlo (vence en 10 minutos):</p>
       <p style="text-align:center;font-size:32px;font-weight:800;letter-spacing:8px;color:#4ade80;margin:16px 0;">${escapar(codigo)}</p>
       <p style="color:#9ca3af;">Si no lo solicitaste, ignorá este correo: tu cuenta sigue igual.</p>`,
    ),
    text: `Tu código para confirmar el nuevo correo en Academia Elite es: ${codigo}\n(Vence en 10 minutos. Si no lo solicitaste, ignoralo: tu cuenta sigue igual.)`,
  };
}

/** Envío de un código de invitación a una familia. */
export function codigoInvitacion(
  codigo: string,
  escuela: string,
  categoria: string,
): Plantilla {
  return {
    subject: `Tu código para registrarte en ${escuela}`,
    html: layout(
      `Te invitaron a ${escapar(escuela)}`,
      `<p>Usá este código para registrar a tu jugador en la categoría <strong>${escapar(categoria)}</strong>:</p>
       <p style="text-align:center;font-size:28px;font-weight:800;letter-spacing:6px;color:#4ade80;margin:16px 0;">${escapar(codigo)}</p>
       <p>Entrá a la plataforma, elegí "Registrarme con código" e ingresá ese código.</p>`,
    ),
    text: `Te invitaron a ${escuela} (categoría ${categoria}). Tu código de registro es: ${codigo}`,
  };
}

/** Acuse al interesado que dejó sus datos en el formulario de contacto. */
export function confirmacionLead(nombre: string): Plantilla {
  return {
    subject: "Recibimos tu solicitud — Academia Elite",
    html: layout(
      `¡Gracias, ${escapar(nombre)}!`,
      `<p>Recibimos tus datos. Muy pronto te vamos a contactar para mostrarte la plataforma con tus categorías.</p>
       <p>Donde nacen las estrellas ⚽</p>`,
    ),
    text: `¡Gracias, ${nombre}! Recibimos tus datos y muy pronto te contactaremos. — Academia Elite`,
  };
}

/** Aviso interno al equipo de un nuevo lead. */
export function avisoLeadEquipo(datos: {
  nombreEscuela: string;
  contactoNombre: string;
  contactoEmail: string;
  telefono: string;
  ciudad?: string;
  mensaje?: string;
}): Plantilla {
  const filas = [
    `Escuela: ${datos.nombreEscuela}`,
    `Contacto: ${datos.contactoNombre}`,
    `Email: ${datos.contactoEmail}`,
    `Teléfono: ${datos.telefono}`,
    datos.ciudad ? `Ciudad: ${datos.ciudad}` : null,
    datos.mensaje ? `Mensaje: ${datos.mensaje}` : null,
  ].filter(Boolean) as string[];
  return {
    subject: `Nuevo lead: ${datos.nombreEscuela}`,
    html: layout(
      "Nuevo lead",
      filas.map((f) => `<p style="margin:4px 0;">${escapar(f)}</p>`).join(""),
    ),
    text: filas.join("\n"),
  };
}
