import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import GlobalHealthIndicator from "@/components/global-health-indicator";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GlobalHealthIndicator />
        {children}
      </body>
    </html>
  );
}
