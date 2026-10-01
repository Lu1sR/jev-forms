import type { Metadata, Viewport } from "next";
import { Archivo, Chivo_Mono } from "next/font/google";
import "./globals.css";

// docutecec type, shared with the landing: Archivo for text (narrow for labels,
// wide and heavy for the wordmark), Chivo Mono for every figure read off a receipt.
const text = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

const figures = Chivo_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-chivo-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://formularios.docutecec.com"),
  title: "Formularios · docutecec · su comprobante, revisado",
  description:
    "Suba una foto o PDF de una factura, nota de venta o precuenta y vea cada dato marcado: qué está listo, qué conviene revisar y qué no aparece.",
};

export const viewport: Viewport = {
  themeColor: "#1f4f7a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-EC" className={`${text.variable} ${figures.variable}`}>
      <body>{children}</body>
    </html>
  );
}
