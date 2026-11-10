import "./globals.css";
import "./professional.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Seal — Contratos Inteligentes",
  description: "Gestión y firma digital de contratos con IA",
  icons: {
    icon: { url: "/brand/seal-escudo-transparente.png", type: "image/png" },
    apple: "/brand/seal-escudo-transparente.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        {children}
      </body>
    </html>
  );
}
