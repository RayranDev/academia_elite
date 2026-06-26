import type { MetadataRoute } from "next";

// PWA-lite (G10): los niños y familias usan la app desde el celular.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Academia Elite",
    short_name: "Academia Elite",
    description:
      "Evalúa, evoluciona y vive tu carta de jugador.",
    start_url: "/",
    display: "standalone",
    background_color: "#070b14",
    theme_color: "#070b14",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
