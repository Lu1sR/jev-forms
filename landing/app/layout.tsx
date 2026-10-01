import type { Metadata, Viewport } from "next";
import { Archivo, Chivo_Mono } from "next/font/google";
import "./globals.css";

// Archivo (Omnibus-Type): narrow widths for form labels, wide heavy cuts for
// display. Chivo Mono from the same foundry for every value typed into a field.
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
  metadataBase: new URL("https://docutecec.com"),
  title: "docutecec · Lectura de comprobantes y gestión documental para empresas",
  description:
    "Formularios lee facturas, notas de venta y precuentas y llena sus formularios. Gestor archiva cada documento de su empresa y lo encuentra en segundos. Juntos o por separado, en la nube o en su servidor.",
  openGraph: {
    title: "docutecec · Deje de digitar. Empiece a encontrar.",
    description:
      "Lectura automática de comprobantes ecuatorianos y gestor documental para empresas. Juntos o por separado.",
    url: "https://docutecec.com",
    siteName: "docutecec",
    locale: "es_EC",
    type: "website",
  },
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
