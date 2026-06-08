import type { Metadata } from "next";
import "./globals.css";
import { StoreInit } from "@/store/init";
import { ErrorBoundary } from "@/components/error-boundary";

export const metadata: Metadata = {
  title: "Travel Planner — Europe 2026",
  description: "Plan your Europe 2026 trip",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <StoreInit />
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
