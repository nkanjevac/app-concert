import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rezervacija karata",
  description: "Aplikacija za rezervaciju karata za koncerte",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sr" className="h-full">
      <body
        className={[
          geistSans.variable,
          geistMono.variable,
          "min-h-screen bg-zinc-950 text-zinc-100 antialiased",
        ].join(" ")}
      >
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-zinc-950" />
          <div className="absolute inset-0 opacity-40 [background:radial-gradient(60%_60%_at_20%_10%,rgba(255,255,255,0.20),transparent_60%)]" />
          <div className="absolute inset-0 opacity-25 [background:radial-gradient(50%_50%_at_80%_30%,rgba(255,255,255,0.12),transparent_60%)]" />
        </div>

        <Navbar />

        {children}
      </body>
    </html>
  );
}
