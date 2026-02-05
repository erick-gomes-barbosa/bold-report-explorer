import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logo from '@/assets/logo-pb.png';

interface ReportsHeaderProps {
  title?: string;
  subtitle?: string;
}

export function ReportsHeader({ 
  title = "Relatórios de Bens Móveis",
  subtitle = "Gestão e Controle Patrimonial"
}: ReportsHeaderProps) {
  return (
    <header className="border-b border-border bg-primary sticky top-0 z-10">
      <div className="container max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src={logo} 
              alt="Logo" 
              className="h-10 w-auto"
            />
            <div className="hidden sm:block border-l border-primary-foreground/30 pl-4">
              <h1 className="text-lg font-semibold text-primary-foreground">{title}</h1>
              <p className="text-xs text-primary-foreground/70">{subtitle}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
