import type { Metadata } from "next";
import { Fraunces, Space_Grotesk } from "next/font/google";
import "./globals.css";

const headline = Fraunces({
  variable: "--font-headline",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const body = Space_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "English Autotest",
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
