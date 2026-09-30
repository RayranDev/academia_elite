import type { SVGProps } from "react";

// Íconos propios de las observaciones rápidas del DT. Rejilla de 24 px, trazo de
// 1.75 px con extremos redondeados y un relleno suave (opacidad baja) que toma
// el color del texto: heredan `currentColor`, así que funcionan en tema oscuro
// y claro. Reemplazan a los emojis del sistema, que cambian según el dispositivo
// y no se pueden teñir con la marca (AGENTS.md §6 bis).

type PropsIcono = Omit<SVGProps<SVGSVGElement>, "children">;

function Base({ children, ...props }: PropsIcono & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Gran actitud: una llama con núcleo encendido (energía, ganas). */
export function IconoActitud(props: PropsIcono) {
  return (
    <Base {...props}>
      <path d="M13.2 2.9c.3 3.4 4.3 5.2 4.3 10.6a5.5 5.5 0 0 1-11 0c0-2.6 1.3-4.3 2.9-5.7.3 1.8 1 2.7 2 3.3.1-2.9.6-5.5 1.8-8.2Z" />
      <path
        d="M12 19.3a2.5 2.5 0 0 1-2.5-2.5c0-1.4 1.2-2.4 2.5-3.9 1.3 1.5 2.5 2.5 2.5 3.9a2.5 2.5 0 0 1-2.5 2.5Z"
        fill="currentColor"
        fillOpacity={0.28}
      />
    </Base>
  );
}

/** Mejoró el perfil débil: una diana con una flecha que sube. */
export function IconoMejora(props: PropsIcono) {
  return (
    <Base {...props}>
      <circle cx="12" cy="15.2" r="6.6" />
      <circle cx="12" cy="15.2" r="3.1" strokeOpacity={0.55} />
      <circle cx="12" cy="15.2" r="1.1" fill="currentColor" stroke="none" />
      <path d="M12 6.4V2.8" />
      <path d="M8.9 5.7 12 2.6l3.1 3.1" />
    </Base>
  );
}

/** Desconcentrado: una nube a la deriva con rayas de viento. */
export function IconoDistraccion(props: PropsIcono) {
  return (
    <Base {...props}>
      <path
        d="M7.6 13.6a3.5 3.5 0 0 1-.5-6.96 5 5 0 0 1 9.6-.6 3.8 3.8 0 0 1 .5 7.56Z"
        fill="currentColor"
        fillOpacity={0.14}
      />
      <path d="M3.5 17.4h9.5" />
      <path d="M16.5 17.4h4" />
      <path d="M7.5 20.8h10" />
    </Base>
  );
}

/** Buen compañero: dos jugadores, el de adelante relleno, hombro con hombro. */
export function IconoCompanerismo(props: PropsIcono) {
  return (
    <Base {...props}>
      <circle cx="9" cy="8" r="3.1" fill="currentColor" fillOpacity={0.22} />
      <path d="M3.2 20.3v-1a5.8 5.8 0 0 1 11.6 0v1Z" fill="currentColor" fillOpacity={0.22} />
      <path d="M14.6 5.3a3 3 0 0 1 0 5.4" />
      <path d="M17 14.2a5.6 5.6 0 0 1 3.9 5.1v1" />
    </Base>
  );
}
