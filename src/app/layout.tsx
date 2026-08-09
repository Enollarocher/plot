import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plot — The plot gets better.",
  description:
    "Plot, le réseau social de lecture entre copines : étagères, Book Clubs et fil d'activité.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
