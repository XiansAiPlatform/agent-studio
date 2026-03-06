/** Label for agents/templates with no category */
export const UNCATEGORIZED_LABEL = 'Uncategorized';

/**
 * Extract category from an agent or template, normalizing null/undefined to UNCATEGORIZED_LABEL
 * for display/grouping purposes.
 */
export function getCategoryLabel(category: string | null | undefined): string {
  const value = category?.trim();
  return value && value.length > 0 ? value : UNCATEGORIZED_LABEL;
}

/**
 * Group items by category. Returns a map of category label -> items.
 * Categories are sorted: named categories alphabetically, then Uncategorized last.
 */
export function groupByCategory<T>(
  items: T[],
  getCategory: (item: T) => string | null | undefined
): Map<string, T[]> {
  const map = new Map<string, T[]>();

  for (const item of items) {
    const label = getCategoryLabel(getCategory(item));
    const existing = map.get(label) ?? [];
    existing.push(item);
    map.set(label, existing);
  }

  return map;
}

/**
 * Get unique category labels from items, sorted for display.
 * Uncategorized always appears last when present.
 */
export function getUniqueCategories<T>(
  items: T[],
  getCategory: (item: T) => string | null | undefined
): string[] {
  const labels = new Set<string>();
  for (const item of items) {
    labels.add(getCategoryLabel(getCategory(item)));
  }

  const sorted = Array.from(labels).sort((a, b) => {
    if (a === UNCATEGORIZED_LABEL) return 1;
    if (b === UNCATEGORIZED_LABEL) return -1;
    return a.localeCompare(b);
  });

  return sorted;
}
