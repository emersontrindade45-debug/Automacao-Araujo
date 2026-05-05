import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Araujo Hub",
    template: "%s | Araujo Hub",
  },
  description:
    "Automação de atendimento para mercearias, açougues e padarias — CRM integrado com WhatsApp, Instagram e N8n.",
  metadataBase: new URL("https://araujo-hub.vercel.app"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-surface text-foreground">{children}</body>
    </html>
  );
}
