import React from "react";

interface ActionLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
}

export function ActionLink({ href, icon, label }: ActionLinkProps) {
  return (
    <a
      href={href}
      className="flex items-center gap-2 rounded-md border p-3 text-sm transition-colors hover:bg-accent"
    >
      {icon}
      {label}
    </a>
  );
}
