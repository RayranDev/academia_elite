import type { Metadata } from "next";
import { Inter, Archivo_Black } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Fuente display ultra-negra para titulares y la carta (Sección 12.1).
const archivoBlack = Archivo_Black({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Academia Elite",
  description:
    "Plataforma de formación en fútbol base: evalúa, evoluciona y vive tu carta de jugador.",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

/**
 * El tema viaja en el atributo `data-tema` del `<html>`, NO en una clase.
 *
 * Por qué: el `className` del `<html>` lo gestiona React (lleva las variables de
 * fuente de next/font). Si el script anti-FOUC escribiera una CLASE ahí, React
 * la sobrescribiría al hidratar y la app volvería a oscuro en cada F5. Un
 * atributo `data-*` que React no declara queda intacto.
 *
 * Y las fuentes tienen que seguir en el `<html>`: `@theme` define
 * `--font-display: var(--font-archivo)` a nivel `:root`, así que si la variable
 * viviera en el `<body>` quedaría indefinida en ese scope y la tipografía
 * display se caería al fallback.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${archivoBlack.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        {/* Tema por defecto: CLARO. Se aplica antes del primer pintado
            (anti-FOUC) en `data-tema`, que React no toca al hidratar. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.dataset.tema=localStorage.getItem("fcm-tema")==="dark"?"dark":"light"}catch(e){document.documentElement.dataset.tema="light"}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-base text-foreground">
        {children}
      </body>
    </html>
  );
}
