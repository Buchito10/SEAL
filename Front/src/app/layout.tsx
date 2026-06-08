import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Seal — Contratos Inteligentes",
  description: "Gestión y firma digital de contratos con IA",
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