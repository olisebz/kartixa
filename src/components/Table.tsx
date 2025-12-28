import { ReactNode } from "react";

interface TableProps {
  children: ReactNode;
  className?: string;
}

export function Table({ children, className = "" }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full text-left ${className}`}>{children}</table>
    </div>
  );
}

interface TableHeaderProps {
  children: ReactNode;
  className?: string;
}

export function TableHeader({ children, className = "" }: TableHeaderProps) {
  return (
    <thead className={`border-b border-[var(--color-border)] ${className}`}>
      {children}
    </thead>
  );
}

interface TableBodyProps {
  children: ReactNode;
  className?: string;
}

export function TableBody({ children, className = "" }: TableBodyProps) {
  return <tbody className={className}>{children}</tbody>;
}

interface TableRowProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  isClickable?: boolean;
}

export function TableRow({
  children,
  className = "",
  onClick,
  isClickable,
}: TableRowProps) {
  const clickableStyles = isClickable
    ? "cursor-pointer hover:bg-[var(--color-card-hover)] transition-colors"
    : "";

  return (
    <tr
      className={`border-b border-[var(--color-border)] last:border-b-0 ${clickableStyles} ${className}`}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === "Enter") {
                onClick?.();
              } else if (e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      {children}
    </tr>
  );
}

interface TableHeadProps {
  children: ReactNode;
  className?: string;
}

export function TableHead({ children, className = "" }: TableHeadProps) {
  return (
    <th
      className={`py-3 px-4 font-semibold text-[var(--foreground)] ${className}`}
    >
      {children}
    </th>
  );
}

interface TableCellProps {
  children: ReactNode;
  className?: string;
}

export function TableCell({ children, className = "" }: TableCellProps) {
  return (
    <td className={`py-3 px-4 text-[var(--foreground)] ${className}`}>
      {children}
    </td>
  );
}
