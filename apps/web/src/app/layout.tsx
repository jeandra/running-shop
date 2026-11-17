import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Running Shop",
  description: "Running shop storefront",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-paper-white font-ntneuss text-charcoal">
        {children}
      </body>
    </html>
  );
}
