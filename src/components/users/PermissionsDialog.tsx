import { useState, useEffect } from 'react';
import { Loader2, Shield, FileText, Database, Calendar, Folder, Server } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';

interface BoldUser {
  id: number;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  groups: string[];
}

interface Permission {
  PermissionEntity: string;
  PermissionAccess: string;
  ItemId?: string;
  ItemName?: string;
}

interface PermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: BoldUser | null;
}

const CATEGORY_MAP: Record<string, { label: string; icon: React.ElementType }> = {
  AllReports: { label: 'Relatórios', icon: FileText },
  ReportsInCategory: { label: 'Relatórios', icon: FileText },
  SpecificReports: { label: 'Relatórios', icon: FileText },
  AllCategories: { label: 'Categorias', icon: Folder },
  SpecificCategory: { label: 'Categorias', icon: Folder },
  AllDataSources: { label: 'Fontes de Dados', icon: Database },
  SpecificDataSource: { label: 'Fontes de Dados', icon: Database },
  AllDatasets: { label: 'Datasets', icon: Server },
  SpecificDataset: { label: 'Datasets', icon: Server },
  AllSchedules: { label: 'Agendamentos', icon: Calendar },
  SpecificSchedule: { label: 'Agendamentos', icon: Calendar },
};

const ACCESS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  Create: { label: 'Criar', variant: 'outline' },
  Read: { label: 'Visualizar', variant: 'secondary' },
  ReadWrite: { label: 'Ler/Escrever', variant: 'default' },
  ReadWriteDelete: { label: 'Acesso Total', variant: 'destructive' },
  Download: { label: 'Download', variant: 'outline' },
};

export function PermissionsDialog({ open, onOpenChange, user }: PermissionsDialogProps) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      fetchPermissions();
    }
  }, [open, user]);

  const fetchPermissions = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Use fetch directly for GET request with query params
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/user-management?userId=${user.id}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao buscar permissões');
      }

      setPermissions(result.permissions || []);
    } catch (err) {
      console.error('Error fetching permissions:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar permissões');
    } finally {
      setLoading(false);
    }
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    const categoryInfo = CATEGORY_MAP[perm.PermissionEntity];
    const category = categoryInfo?.label || 'Outros';
    
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <DialogTitle>Permissões de {user.displayName}</DialogTitle>
          </div>
          <DialogDescription>
            Permissões do usuário no Bold Reports.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Carregando permissões...</span>
            </div>
          ) : error ? (
            <div className="py-8 text-center text-destructive">
              <p>{error}</p>
            </div>
          ) : Object.keys(groupedPermissions).length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>Nenhuma permissão específica encontrada.</p>
              <p className="text-sm mt-1">
                O usuário pode herdar permissões de grupos.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedPermissions).map(([category, perms], idx) => {
                const firstPerm = perms[0];
                const categoryInfo = CATEGORY_MAP[firstPerm?.PermissionEntity];
                const Icon = categoryInfo?.icon || Shield;

                return (
                  <div key={category}>
                    {idx > 0 && <Separator className="my-4" />}
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-medium text-sm">{category}</h4>
                    </div>
                    <div className="space-y-2">
                      {perms.map((perm, permIdx) => {
                        const accessInfo = ACCESS_LABELS[perm.PermissionAccess] || {
                          label: perm.PermissionAccess,
                          variant: 'secondary' as const,
                        };

                        return (
                          <div
                            key={permIdx}
                            className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                          >
                            <span className="text-sm">
                              {perm.ItemName || perm.PermissionEntity}
                            </span>
                            <Badge variant={accessInfo.variant}>
                              {accessInfo.label}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {user.groups.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium text-sm mb-2">Grupos do Usuário</h4>
              <div className="flex flex-wrap gap-2">
                {user.groups.map((group) => (
                  <Badge key={group} variant="outline">
                    {group}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                O usuário herda permissões adicionais dos grupos acima.
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
