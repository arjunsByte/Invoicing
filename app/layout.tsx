import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QORVA LABS LLP | Private Invoicing & Sales Management",
  description: "Internal Business Invoicing, GST Compliance, and Sales Management Suite for QORVA LABS LLP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 text-slate-900 font-sans selection:bg-slate-900 selection:text-white">
        {children}
      </body>
    </html>
  );
}
