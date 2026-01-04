'use client';

interface HeaderProps {
  title: string;
  icon?: React.ReactNode;
  description?: string;
  action?: React.ReactNode;
}

export function Header({ title, icon, description }: HeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-1">
      <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
        {icon && <span className="text-zinc-500">{icon}</span>}
        {title}
      </h1>
      {description && <p className="text-sm text-zinc-500">{description}</p>}
    </div>
  );
}
