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
        {/* Tema por defecto: CLARO. Aplica el tema antes del primer pintado
            (anti-FOUC): agrega `light` salvo que el usuario haya elegido oscuro. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("fcm-tema")!=="dark")document.documentElement.classList.add("light")}catch(e){document.documentElement.classList.add("light")}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-base text-foreground">
        {children}
      </body>
    </html>
  );
}
