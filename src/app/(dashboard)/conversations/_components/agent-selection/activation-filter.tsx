import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface ActivationFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function ActivationFilter({
  searchQuery,
  onSearchChange,
}: ActivationFilterProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search agents..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-9 h-9 text-base sm:text-sm"
      />
    </div>
  );
}
