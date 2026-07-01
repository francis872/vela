import type { Metadata } from "next";
import { Fraunces, Space_Grotesk } from "next/font/google";
import GlobalHealthIndicator from "@/components/global-health-indicator";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VELA Platform",
  description: "Plataforma venture builder para detectar, construir y escalar empresas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${spaceGrotesk.variable} ${fraunces.variable} antialiased`}
      >
        <GlobalHealthIndicator />
        {children}
      </body>
    </html>
  );
}
