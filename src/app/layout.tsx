import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sevenEleven = localFont({
  variable: "--font-7eleven-sans",
  src: [
    {
      path: "../fonts/7eleven/7E-Light.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/7eleven/7E-Medium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/7eleven/7E-Medium.otf",
      weight: "600",
      style: "bold",
    },
    {
      path: "../fonts/7eleven/7E-Headline.otf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../fonts/7eleven/7E-Bold.otf",
      weight: "800",
      style: "bold",
    },
    {
      path: "../fonts/7eleven/7E-Headline.otf",
      weight: "900",
      style: "bold",
    },
  ],
});

export const metadata: Metadata = {
  title: "Metrics Dashboard",
  description: "Campaign metrics and analytics dashboard",
  icons: {
    icon: '/favicon_32x32.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.className} ${geistMono.className} ${sevenEleven.className}`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
