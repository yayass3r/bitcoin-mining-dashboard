import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bitcoin Mining Pool - Real-Time Dashboard",
  description: "Real-time Bitcoin mining pool dashboard with live statistics, worker monitoring, and stratum connection configuration.",
  keywords: ["Bitcoin", "Mining", "Pool", "Dashboard", "BTC", "Cryptocurrency", "Braiins"],
  authors: [{ name: "Mining Pool Team" }],
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⛏️</text></svg>",
  },
  openGraph: {
    title: "Bitcoin Mining Pool Dashboard",
    description: "Real-time Bitcoin mining pool dashboard",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
