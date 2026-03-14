"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Info, Trophy, Settings } from "lucide-react";
import { useLocale } from "@/LocaleContext";

export default function Navbar() {
  const pathname = usePathname();
  const { t } = useLocale();

  const navLinks = [
    { href: "/liga", label: t("nav.leagues"), icon: Trophy },
    { href: "/about", label: t("nav.about"), icon: Info },
    { href: "/settings", label: t("nav.settings"), icon: Settings },
  ];

  const isActive = (href: string) => {
    if (href === "/liga") {
      return pathname === "/liga" || pathname.startsWith("/liga/");
    }
    return pathname === href;
  };

  return (
    <>
      {/* Desktop Navbar */}
      <nav
        className="relative hidden sm:flex items-center py-6"
        aria-label="Main navigation"
      >
        <Link
          href="/"
          className="hover:opacity-80 transition-opacity"
          aria-label="Kartixa Home"
        >
          <Image
            src="/Kartixa.svg"
            alt="Kartixa"
            width={240}
            height={77}
            priority
          />
        </Link>

        {/* Navigation Pills - Absolutely centered */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <div className="flex items-center bg-[var(--color-primary)] rounded-full px-2 py-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-6 py-2 rounded-full text-white font-medium transition-colors flex items-center gap-2 ${
                    isActive(link.href)
                      ? "bg-[var(--color-primary-hover)]"
                      : "hover:bg-[var(--color-primary-light)]"
                  }`}
                  aria-current={isActive(link.href) ? "page" : undefined}
                >
                  <Icon className="w-4 h-4" />
                  <span suppressHydrationWarning>{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile Top Bar */}
      <nav
        className="flex sm:hidden items-center py-3 border-b border-[var(--color-border)]"
        aria-label="Mobile top bar"
      >
        <Link
          href="/"
          className="hover:opacity-80 transition-opacity"
          aria-label="Kartixa Home"
        >
          <Image
            src="/Kartixa.svg"
            alt="Kartixa"
            width={140}
            height={45}
            priority
          />
        </Link>
      </nav>

      {/* Mobile Bottom Navigation Bar */}
      <div
        className="fixed bottom-0 left-0 right-0 sm:hidden bg-white border-t border-[var(--color-border)] z-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <nav
          className="flex items-center"
          role="navigation"
          aria-label="Mobile bottom navigation"
        >
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center gap-0.5 py-2 flex-1 transition-colors ${
                  active
                    ? "text-[var(--color-primary)]"
                    : "text-[var(--color-muted)]"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="w-5 h-5" />
                <span
                  className={`text-[11px] font-medium`}
                  suppressHydrationWarning
                >
                  {link.label}
                </span>
                {active && (
                  <span className="w-1 h-1 rounded-full bg-[var(--color-primary)]" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
