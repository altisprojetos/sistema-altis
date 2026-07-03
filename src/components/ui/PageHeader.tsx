import Link from "next/link";

interface Props {
  title: string;
  subtitle?: string;
  action?: { label: string; href: string };
}

export default function PageHeader({ title, subtitle, action }: Props) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1
          className="font-display text-4xl font-black leading-none"
          style={{ color: "var(--ink-900)" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm mt-1" style={{ color: "var(--steel-400)" }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className="facet-br px-5 py-2.5 text-sm font-bold uppercase tracking-wider"
          style={{ background: "var(--signal-500)", color: "white" }}
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
