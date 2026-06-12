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
  title: "Fútbol Career Mode",
  description:
    "Plataforma de formación en fútbol base: evalúa, evoluciona y vive tu carta como en el Modo Carrera.",
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
    >
      <body className="min-h-full flex flex-col bg-base text-foreground">
        {children}
      </body>
    </html>
  );
}
