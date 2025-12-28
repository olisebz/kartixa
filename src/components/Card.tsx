import { ReactNode } from "react";
import Link from "next/link";

interface CardProps {
  children: ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
}

export default function Card({
  children,
  className = "",
  href,
  onClick,
}: CardProps) {
  const baseStyles =
    "bg-[var(--color-card)] rounded-2xl p-6 transition-all duration-200 hover:bg-[var(--color-card-hover)] hover:shadow-md";

  if (href) {
    return (
      <Link href={href} className={`${baseStyles} block ${className}`}>
        {children}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`${baseStyles} w-full text-left ${className}`}
        type="button"
      >
        {children}
      </button>
    );
  }

  return <div className={`${baseStyles} ${className}`}>{children}</div>;
}

interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

export function CardTitle({ children, className = "" }: CardTitleProps) {
  return (
    <h3
      className={`text-xl font-semibold text-[var(--foreground)] mb-2 ${className}`}
    >
      {children}
    </h3>
  );
}

interface CardDescriptionProps {
  children: ReactNode;
  className?: string;
}

export function CardDescription({
  children,
  className = "",
}: CardDescriptionProps) {
  return (
    <p className={`text-[var(--color-muted)] text-sm ${className}`}>
      {children}
    </p>
  );
}
