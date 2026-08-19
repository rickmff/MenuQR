import Link from 'next/link';

/** Trilha de navegação visível — acompanha o dado estruturado BreadcrumbList. */
export function Breadcrumbs({ trail }: { trail: { name: string; path: string }[] }) {
  return (
    <nav aria-label="Trilha de navegação" className="text-sm text-charcoal-500">
      <ol className="flex flex-wrap items-center gap-1.5">
        {trail.map((entry, index) => {
          const isLast = index === trail.length - 1;
          return (
            <li key={entry.path} className="flex items-center gap-1.5">
              {isLast ? (
                <span aria-current="page" className="font-medium text-charcoal-700">
                  {entry.name}
                </span>
              ) : (
                <>
                  <Link href={entry.path} className="hover:text-ember-600">
                    {entry.name}
                  </Link>
                  <span aria-hidden="true">/</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
