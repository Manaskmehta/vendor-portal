import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WCCS - Vendor Portal",
  description: "Vendor portal for the WCCS ERP system",
  icons: {
    icon: "/wccs-mark.png",
    apple: "/wccs-mark.png",
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
