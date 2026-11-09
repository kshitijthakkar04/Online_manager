/** Consistent page heading: small label, serif title, optional description and actions. */
export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-5 sm:mb-10">
      <div className="min-w-0 max-w-2xl">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-2 font-serif text-[2.1rem] leading-[1.1] tracking-[-0.015em] text-ink-100 sm:text-[2.6rem]">
          {title}
        </h1>
        {description && <p className="mt-3 text-[15px] leading-relaxed text-ink-400">{description}</p>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </header>
  );
}
