import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NEXT Arena | NUSANTARA NEXT Competition Management System",
  description: "THE PLACE TO PLAY — Sistem Manajemen Kompetisi, Daftar Peserta, dan Live Ranking Point Nusantara Next.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <body className="bg-low-poly min-h-screen antialiased selection:bg-orange-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

