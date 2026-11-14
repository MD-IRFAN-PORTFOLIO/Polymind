import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "PolyMind — Multi-AI Comparison Workspace",
  description: "Query the world's top LLMs side by side with grounded RAG citations",
  icons: {
    icon: "/logo-icon.png",
    shortcut: "/logo-icon.png",
    apple: "/logo-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#090b10",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-surface-950 antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
