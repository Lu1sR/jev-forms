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
  title: "docutecec · Gestor documental con flujos automáticos para empresas",
  description:
    "docutecec archiva y lee cada documento de su empresa, lo encuentra en segundos y lleva sus datos a Google Sheets, su ERP o cualquier sistema. En la nube o en su servidor.",
  openGraph: {
    title: "docutecec · Sus documentos, trabajando solos.",
    description:
      "Gestor documental para empresas del Ecuador, con flujos que leen sus documentos y envían los datos a donde los necesita.",
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
