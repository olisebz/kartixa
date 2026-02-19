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
    { href: "/about", label: t("nav.about"), icon: Info },
    { href: "/liga", label: t("nav.leagues"), icon: Trophy },
    { href: "/settings", label: t("nav.settings"), icon: Settings },
  ];

  const isActive = (href: string) => {
    if (href === "/liga") {
      return pathname === "/liga" || pathname.startsWith("/liga/");
    }
    return pathname === href;
  };

  return (
    <nav
      className="relative flex items-center py-6"
      aria-label="Main navigation"
    >
      {/* Logo */}
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
  );
}
