import { useMemo } from 'react';
import { FolderOpen } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { BoldReport } from '@/types/boldReports';

interface CategoryFilterProps {
  reports: BoldReport[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export function CategoryFilter({
  reports,
  selectedCategory,
  onCategoryChange,
}: CategoryFilterProps) {
  // Extrai categorias únicas dos relatórios com contagem
  const categories = useMemo(() => {
    const categoryMap = new Map<string, { name: string; count: number }>();
    
    reports.forEach((report) => {
      const categoryName = report.CategoryName || 'Sem Categoria';
      const existing = categoryMap.get(categoryName);
      
      if (existing) {
        existing.count += 1;
      } else {
        categoryMap.set(categoryName, { name: categoryName, count: 1 });
      }
    });
    
    // Ordena alfabeticamente
    return Array.from(categoryMap.values()).sort((a, b) => 
      a.name.localeCompare(b.name, 'pt-BR')
    );
  }, [reports]);

  const totalReports = reports.length;

  return (
    <div className="flex items-center gap-2">
      <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
      <Select value={selectedCategory} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-[200px] bg-background">
          <SelectValue placeholder="Todas as categorias" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <div className="flex items-center justify-between w-full gap-2">
              <span>Todas as categorias</span>
              <Badge variant="secondary" className="ml-auto text-xs">
                {totalReports}
              </Badge>
            </div>
          </SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.name} value={category.name}>
              <div className="flex items-center justify-between w-full gap-2">
                <span className="truncate">{category.name}</span>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {category.count}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
