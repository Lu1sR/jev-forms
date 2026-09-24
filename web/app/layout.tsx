import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Mono, Atkinson_Hyperlegible_Next } from "next/font/google";
import "./globals.css";

// Hyperlegible: phone photos get checked outdoors and in bad light; figures and
// keys need unambiguous 0/O, 1/l, 5/S.
const text = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-atkinson",
  display: "swap",
});

const figures = Atkinson_Hyperlegible_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-atkinson-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "jev-forms · tu comprobante, revisado",
  description:
    "Sube una foto o PDF de una factura, nota de venta o precuenta y mira cada dato marcado: qué está listo, qué conviene revisar y qué no aparece.",
};

export const viewport: Viewport = {
  themeColor: "#d6ddd7",
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
