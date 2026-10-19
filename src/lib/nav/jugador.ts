import type { NavItem } from "@/components/shell/Sidebar";

/**
 * Menú del panel de la familia. Vive acá y no inline en el layout para poder
 * probarlo (íconos que existen, rutas sin repetir, una sola sección activa por
 * ruta, qué queda cuando la cuenta está bloqueada).
 *
 * Orden: las 4 primeras entradas son las que la barra inferior móvil deja a la
 * mano (`TabBarMovil`); el resto va en "Más". "Eventos" va justo después de
 * esas 4 para NO sacar de la barra a Pagos ni a Mensajes (que son lo que más
 * se consulta desde el celular); en escritorio el aside lo muestra de todos
 * modos, a un paso del calendario.
 */
const NAV_JUGADOR: NavItem[] = [
  { href: "/jugador", label: "Inicio", icon: "inicio" },
  { href: "/jugador/calendario", label: "Calendario", icon: "calendario" },
  { href: "/jugador/pagos", label: "Pagos", icon: "pagos" },
  { href: "/jugador/mensajes", label: "Mensajes", icon: "mensajes" },
  { href: "/jugador/eventos", label: "Eventos", icon: "eventos" },
  { href: "/jugador/logros", label: "Logros", icon: "logros" },
  { href: "/jugador/fondos", label: "Fondos", icon: "fondos" },
  { href: "/jugador/progreso", label: "Progreso", icon: "progreso" },
  { href: "/jugador/perfil", label: "Perfil", icon: "perfil" },
  { href: "/jugador/cuenta", label: "Mi cuenta", icon: "cuenta" },
];

/**
 * Bloqueado: solo "Mensajes" y "Pagos" quedan en el nav — el resto rebota a
 * /bloqueado. Pagos se deja a propósito: si el bloqueo es por mora, es la única
 * pantalla que le sirve a la familia para salir de ahí (ver el estado de cuenta
 * y reportar lo que ya pagó).
 */
export function navJugador(bloqueado: boolean): NavItem[] {
  return bloqueado
    ? NAV_JUGADOR.filter(
        (n) => n.href === "/jugador/mensajes" || n.href === "/jugador/pagos",
      )
    : NAV_JUGADOR;
}
