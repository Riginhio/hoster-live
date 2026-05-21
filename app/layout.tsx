import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Loteria Cantina",
  description: "Panel visual para jugadas de loteria en cantinas modernas.",
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
