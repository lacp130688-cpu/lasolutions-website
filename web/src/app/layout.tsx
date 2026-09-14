import type { Metadata } from "next";
import "./globals.css";
import "./style.css";
import "./effects.css";
import "./gaming-theme.css";
import "./cart.css";
import ClientShell from "@/components/ClientShell";

export const metadata: Metadata = {
  title: "laSolutions - Computadoras de Alto Rendimiento",
  description:
    "laSolutions - Computadoras de escritorio, Gaming PCs y Laptops de alta calidad. Tecnologia que impulsa tu rendimiento.",
  keywords:
    "computadoras, gaming, laptops, escritorio, laSolutions, tecnologia",
  authors: [{ name: "laSolutions" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Orbitron:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
