import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HOSTER LIVE",
  description: "Hospitality Gaming Platform para operacion premium en venues.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
