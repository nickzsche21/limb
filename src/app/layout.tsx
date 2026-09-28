import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LIMB — why the Moon doesn't point at the Sun",
  description:
    "The Moon's lit edge should face the Sun, and in a photograph it often doesn't. Pick a place, a time and a projection, and watch the great circle bend away from the line you would have drawn.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
