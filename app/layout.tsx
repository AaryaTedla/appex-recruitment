import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "APPEX Recruitment",
  description: "Think. Solve. Create. Join APPEX.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><a href="#main-content" className="sr-only fixed left-4 top-4 z-50 rounded-xl bg-violet-700 px-5 py-3 text-white focus:not-sr-only">Skip to content</a>{children}</body>
    </html>
  );
}
