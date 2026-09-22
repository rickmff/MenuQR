import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

/** Trilha de navegação visível — acompanha o dado estruturado BreadcrumbList. */
export function Breadcrumbs({ trail }: { trail: { name: string; path: string }[] }) {
  return (
    <nav aria-label="Trilha de navegação" className="text-caption text-gray-600">
      <ol className="flex flex-wrap items-center gap-1">
        {trail.map((entry, index) => {
          const isLast = index === trail.length - 1;
          return (
            <li key={entry.path} className="flex items-center gap-1">
              {isLast ? (
                <span aria-current="page" className="font-medium text-gray-700">
                  {entry.name}
                </span>
              ) : (
                <>
                  <Link href={entry.path} className="transition-colors duration-150 ease-standard hover:text-gray-700">
                    {entry.name}
                  </Link>
                  <ChevronRight aria-hidden="true" className="size-3.5 text-gray-400" />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
