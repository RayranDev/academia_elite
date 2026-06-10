import type { Variants, Transition } from "framer-motion";

/**
 * Presets de animación centralizados (Sección 5.4). Toda animación de la app
 * pasa por aquí. El respeto a prefers-reduced-motion se hace con el prop
 * `useReducedMotion()` de framer-motion en cada componente y, globalmente, con
 * la media query en globals.css.
 */

export const spring: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 24,
};

export const easeOut: Transition = {
  duration: 0.5,
  ease: [0.16, 1, 0.3, 1],
};

/** Aparición desde abajo con fade (secciones de la landing). */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: easeOut },
};

/** Contenedor con stagger para listas/grids. */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

/** Fade simple. */
export const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: easeOut },
};

/** Slide horizontal (navegación de calendario, demos). */
export const slideX = (dir: 1 | -1): Variants => ({
  hidden: { opacity: 0, x: 40 * dir },
  visible: { opacity: 1, x: 0, transition: easeOut },
  exit: { opacity: 0, x: -40 * dir, transition: easeOut },
});
