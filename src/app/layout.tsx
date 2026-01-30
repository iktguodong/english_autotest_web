import type { Metadata } from "next";
import { Fraunces, Noto_Sans_SC } from "next/font/google";
import "./globals.css";

const headline = Fraunces({
  variable: "--font-headline",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const body = Noto_Sans_SC({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "AItest",
  description: "Personalized English word testing with OCR and smart reviews.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${headline.variable} ${body.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
