import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import FeedbackPopup from "@/components/FeedbackPopup";
import { LocaleProvider } from "@/LocaleContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kartixa - Go-Kart League Tracker",
  description: "Track your Go-Kart leagues, races, and driver rankings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <LocaleProvider>
          <div className="max-w-6xl mx-auto px-4">
            <Navbar />
            <main>{children}</main>

            <FeedbackPopup />

            <footer className="mt-16 py-8 border-t border-[var(--color-border)] text-center text-sm text-[var(--color-muted)]">
              <p className="mb-2">
                &copy; {new Date().getFullYear()} Kartixa • Created by{" "}
                <span className="font-semibold text-[var(--foreground)]">
                  <a href="https://github.com/olisebz">@olisebz</a>
                </span>
              </p>
            </footer>
          </div>
        </LocaleProvider>
      </body>
    </html>
  );
}
