'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { UNCATEGORIZED_LABEL } from '../utils/category-utils';

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string | null;
  onSelect: (category: string | null) => void;
  countByCategory?: Record<string, number>;
  className?: string;
}

export function CategoryFilter({
  categories,
  selectedCategory,
  onSelect,
  countByCategory = {},
  className,
}: CategoryFilterProps) {
  const allCount = categories.reduce((sum, cat) => sum + (countByCategory[cat] ?? 0), 0);

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      <Badge
        variant={selectedCategory === null ? 'default' : 'secondary'}
        className={cn(
          'cursor-pointer transition-all font-medium',
          selectedCategory === null
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'hover:bg-secondary/80'
        )}
        onClick={() => onSelect(null)}
      >
        All
        {allCount > 0 && (
          <span className="ml-1.5 opacity-90 tabular-nums">{allCount}</span>
        )}
      </Badge>
      {categories.map((category) => {
        const count = countByCategory[category] ?? 0;
        const isSelected = selectedCategory === category;
        const isUncategorized = category === UNCATEGORIZED_LABEL;

        return (
          <Badge
            key={category}
            variant={isSelected ? 'default' : 'secondary'}
            className={cn(
              'cursor-pointer transition-all font-medium',
              isSelected ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'hover:bg-secondary/80',
              isUncategorized && 'text-muted-foreground'
            )}
            onClick={() => onSelect(category)}
          >
            {category}
            {count > 0 && <span className="ml-1.5 opacity-90 tabular-nums">{count}</span>}
          </Badge>
        );
      })}
    </div>
  );
}
