import type { NavItem } from "@/components/shell/Sidebar";

/**
 * Menú del panel del DT. Vive acá y no inline en el layout para poder probarlo
 * (íconos que existen, rutas sin repetir, una sola sección activa por ruta).
 *
 * Orden: las 4 primeras entradas son las que la barra inferior móvil deja a la
 * mano (`TabBarMovil`); el resto va en "Más". "Eventos" queda pegado a
 * "Calendario": son dos vistas del mismo dato (el calendario es por fecha, el
 * listado filtra por tipo y estado).
 */
export function navDt(solicitudesPendientes: number): NavItem[] {
  return [
    { href: "/dt", label: "Hoy", icon: "inicio" },
    { href: "/dt/plantilla", label: "Plantilla", icon: "plantilla" },
    { href: "/dt/perfil", label: "Mi perfil", icon: "perfil" },
    { href: "/dt/calendario", label: "Calendario", icon: "calendario" },
    { href: "/dt/eventos", label: "Eventos", icon: "eventos" },
    { href: "/dt/progreso", label: "Progreso", icon: "progreso" },
    { href: "/dt/logros", label: "Logros", icon: "logros" },
    { href: "/dt/mensajes", label: "Mensajes", icon: "mensajes" },
    { href: "/dt/anuncios", label: "Anuncios", icon: "anuncios" },
    {
      href: "/dt/solicitudes",
      label: "Solicitudes",
      icon: "solicitudes",
      badge: solicitudesPendientes,
    },
    { href: "/dt/cuenta", label: "Mi cuenta", icon: "cuenta" },
  ];
}
