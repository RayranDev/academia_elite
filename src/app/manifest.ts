import type { MetadataRoute } from "next";

// PWA-lite (G10): los niños y familias usan la app desde el celular.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fútbol Career Mode",
    short_name: "Career Mode",
    description:
      "Evalúa, evoluciona y vive tu carta como en el Modo Carrera.",
    start_url: "/",
    display: "standalone",
    background_color: "#070b14",
    theme_color: "#070b14",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
