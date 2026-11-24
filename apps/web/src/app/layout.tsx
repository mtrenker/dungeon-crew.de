import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tavern Crew",
  description: "Tavern Crew, a WoW Forever guild.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
