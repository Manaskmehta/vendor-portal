import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MacanX - Vendor Portal",
  description: "Vendor portal for MacanX ERP system",
  icons: {
    icon: "/ring.png",
    apple: "/ring.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-white text-black min-h-screen">
        {children}
      </body>
    </html>
  );
}
