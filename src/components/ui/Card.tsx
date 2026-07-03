interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`facet-tl p-6 ${className}`}
      style={{ background: "white" }}
    >
      {children}
    </div>
  );
}

export function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-xs font-semibold uppercase tracking-wider mb-3"
      style={{ color: "var(--steel-400)" }}
    >
      {children}
    </div>
  );
}
