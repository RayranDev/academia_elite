import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TERMINOS_VERSION } from "@/lib/legal";

export const metadata = {
  title: "Tratamiento de Datos y Habeas Data — Academia Elite",
  description:
    "Política de Tratamiento de Datos Personales y Habeas Data de Academia Elite.",
};

/**
 * Dato legal del Responsable que debe completarse con la información real de la
 * empresa antes de salir a producción (razón social, NIT, correo, etc.).
 */
function Dato({ children }: { children: string }) {
  return (
    <span className="rounded bg-surface-2 px-1 font-mono text-[0.9em] text-muted">
      {children}
    </span>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-bold text-foreground">{titulo}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  );
}

export default function LegalPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Volver
      </Link>

      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-pitch">
          Academia Elite
        </p>
        <h1 className="mt-1 text-3xl font-display italic uppercase">
          Política de Tratamiento de Datos y Habeas Data
        </h1>
        <p className="mt-2 text-xs text-muted">
          Versión {TERMINOS_VERSION}. Elaborada conforme a la Ley 1581 de 2012, el
          Decreto 1377 de 2013 y demás normas de protección de datos de Colombia.
        </p>
      </header>

      <div className="space-y-8">
        <Seccion titulo="1. Responsable del tratamiento">
          <p>
            El responsable del tratamiento de tus datos es{" "}
            <Dato>[Razón social]</Dato>, NIT <Dato>[NIT]</Dato>, con domicilio en{" "}
            <Dato>[Dirección, Ciudad]</Dato>, Colombia. Para cualquier asunto
            relacionado con tus datos podés escribir a{" "}
            <Dato>[correo de protección de datos]</Dato>.
          </p>
        </Seccion>

        <Seccion titulo="2. Qué datos tratamos">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <b>De la familia o tutor:</b> nombre, correo y teléfono.
            </li>
            <li>
              <b>Del menor (jugador):</b> nombre, apellido, fecha de nacimiento,
              posición, categoría y dorsal.
            </li>
            <li>
              <b>Dato sensible del menor:</b> su fotografía o imagen (protección
              reforzada, ver punto 4).
            </li>
            <li>
              <b>Datos deportivos del menor:</b> medidas físicas, técnicas y de
              mentalidad; estadísticas calculadas, evaluaciones y progreso.
            </li>
            <li>
              <b>Cuenta y seguridad:</b> email, contraseña (guardada cifrada con
              hash), rol y registros de auditoría.
            </li>
          </ul>
        </Seccion>

        <Seccion titulo="3. Para qué usamos tus datos">
          <p>Tratamos los datos únicamente para:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Prestar el servicio de gestión deportiva (cartas, evaluaciones, progreso, calendario, logros).</li>
            <li>Vincular a la familia con el perfil del menor y darle acceso a sus estadísticas.</li>
            <li>Gestionar la operación de las escuelas (categorías, entrenadores, eventos).</li>
            <li>Seguridad, prevención de fraude y auditoría de acciones sensibles.</li>
            <li>Cumplir obligaciones legales.</li>
          </ul>
          <p>
            <b>No</b> hacemos rankings públicos entre niños, ni perfilamiento con
            fines distintos a los deportivos internos, ni vendemos datos.
          </p>
        </Seccion>

        <Seccion titulo="4. Datos de niñas, niños y adolescentes">
          <p>
            El tratamiento de datos de menores solo procede atendiendo a su interés
            superior y con autorización de su representante legal. La plataforma
            aplica medidas reforzadas:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Las <b>fotos de menores nunca son públicas</b>: se sirven por un canal
              autenticado, solo al responsable o al personal con consentimiento
              vigente; sin permiso, no se muestran.
            </li>
            <li>
              La foto se procesa de forma segura: se validan sus bytes, se{" "}
              <b>eliminan los metadatos</b> (incluida la ubicación) y se guarda con
              nombre aleatorio.
            </li>
            <li>
              La autorización de la <b>fotografía</b> es específica, separada y{" "}
              <b>revocable en cualquier momento</b>: al revocarla, la foto se oculta
              al instante y la carta vuelve al avatar.
            </li>
            <li>No existe canal de mensajería directa entre adultos y menores.</li>
          </ul>
        </Seccion>

        <Seccion titulo="5. Tus derechos (Habeas Data)">
          <p>Como titular (o representante legal del menor) podés:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Conocer, actualizar y rectificar tus datos.</li>
            <li>Solicitar prueba de la autorización otorgada.</li>
            <li>Ser informado sobre el uso dado a tus datos.</li>
            <li>Revocar la autorización y/o solicitar la supresión del dato cuando no exista un deber legal de conservarlo.</li>
            <li>Presentar quejas ante la Superintendencia de Industria y Comercio (SIC).</li>
            <li>Acceder gratuitamente a tus datos.</li>
          </ul>
        </Seccion>

        <Seccion titulo="6. Cómo ejercer tus derechos">
          <p>
            Escribí a <Dato>[correo de protección de datos]</Dato> indicando tu
            identificación, la descripción del pedido y una dirección de contacto.
            Las consultas se atienden en un máximo de 10 días hábiles y los reclamos
            en un máximo de 15 días hábiles, en los términos de la Ley 1581 de 2012.
          </p>
        </Seccion>

        <Seccion titulo="7. Seguridad de la información">
          <p>
            Aplicamos, entre otras medidas: autenticación con contraseñas cifradas,
            control de acceso por roles, aislamiento entre escuelas, validación de
            toda la información que se ingresa, cabeceras de seguridad, registro de
            auditoría de acciones sensibles y protección reforzada de las fotos de
            menores.
          </p>
        </Seccion>

        <Seccion titulo="8. Conservación y encargados">
          <p>
            Conservamos los datos mientras exista la relación con la escuela o
            familia y el tiempo que exija la ley; cumplido el fin, se suprimen o
            anonimizan. Los proveedores de infraestructura (hosting) tratan los datos
            solo por nuestra instrucción y bajo obligaciones de seguridad y
            confidencialidad. Los avatares se generan en nuestro propio servidor, sin
            servicios externos.
          </p>
        </Seccion>

        <Seccion titulo="9. Autorización">
          <p className="rounded-lg border border-subtle bg-surface-2 px-4 py-3 text-foreground">
            «Autorizo de manera previa, expresa e informada a{" "}
            <Dato>[Razón social]</Dato> para tratar mis datos personales y, en mi
            calidad de representante legal, los de mi hijo(a) menor de edad, con las
            finalidades descritas en esta Política. Declaro que se me informó sobre
            mis derechos como titular (conocer, actualizar, rectificar, revocar y
            suprimir) y el canal para ejercerlos. La autorización para el uso de{" "}
            <b>fotografías</b> del menor es opcional y puedo otorgarla o revocarla en
            cualquier momento desde la plataforma.»
          </p>
        </Seccion>

        <Seccion titulo="10. Vigencia">
          <p>
            Esta Política rige desde su publicación. Cualquier cambio sustancial se
            comunicará por los canales habituales.
          </p>
        </Seccion>
      </div>
    </main>
  );
}
