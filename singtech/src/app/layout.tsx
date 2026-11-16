import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Plex Sans for body text (wdth axis lets dense tables condense); Plex Mono only for identifiers.
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

// Plus Jakarta Sans for headings and the brand line; Plex stays the body face.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SingTech | Singtel Enterprise",
  description: "Account research, pipeline, and co-sell workspace for Singtel Enterprise account executives.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-astryx-theme="neutral" data-theme="light" className={`${plexSans.variable} ${plexMono.variable} ${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
