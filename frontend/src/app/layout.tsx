import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "smartEco - CRM Deals Pipeline",
  description: "Maintainable smartEco CRM with Kanban pipeline, List view, and Deals management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
        {children}
      </body>
    </html>
  );
}
