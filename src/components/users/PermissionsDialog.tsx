import { useState, useEffect } from 'react';
import { Loader2, Shield, FileText, Database, Calendar, Folder, Server, Plus, Pencil, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { GrantPermissionsDialog } from './GrantPermissionsDialog';
import { EditPermissionsDialog } from './EditPermissionsDialog';
import { ManageGroupsDialog } from './ManageGroupsDialog';

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
  onRefresh?: () => void;
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

export function PermissionsDialog({ open, onOpenChange, user, onRefresh }: PermissionsDialogProps) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Sub-dialogs state
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addGroupsDialogOpen, setAddGroupsDialogOpen] = useState(false);
  const [manageGroupsDialogOpen, setManageGroupsDialogOpen] = useState(false);

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

  const handlePermissionSuccess = () => {
    fetchPermissions();
    onRefresh?.();
  };

  const handleGroupSuccess = () => {
    onRefresh?.();
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <DialogTitle>Permissões de {user.displayName}</DialogTitle>
            </div>
            <DialogDescription>
              Gerencie as permissões e grupos do usuário no Bold Reports.
            </DialogDescription>
          </DialogHeader>

          {/* Permissions Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Permissões
              </h4>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setGrantDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Conceder
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setEditDialogOpen(true)}
                  disabled={permissions.length === 0}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Editar
                </Button>
              </div>
            </div>

            <ScrollArea className="max-h-[200px] pr-4">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
                </div>
              ) : error ? (
                <div className="py-4 text-center text-destructive text-sm">
                  <p>{error}</p>
                </div>
              ) : Object.keys(groupedPermissions).length === 0 ? (
                <div className="py-4 text-center text-muted-foreground text-sm">
                  <p>Nenhuma permissão específica encontrada.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(groupedPermissions).map(([category, perms], idx) => {
                    const firstPerm = perms[0];
                    const categoryInfo = CATEGORY_MAP[firstPerm?.PermissionEntity];
                    const Icon = categoryInfo?.icon || Shield;

                    return (
                      <div key={category}>
                        {idx > 0 && <Separator className="my-2" />}
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium text-xs text-muted-foreground">{category}</span>
                        </div>
                        <div className="space-y-1">
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
                                <Badge variant={accessInfo.variant} className="text-xs">
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
          </div>

          <Separator />

          {/* Groups Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Grupos ({user.groups.length})
              </h4>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setAddGroupsDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setManageGroupsDialogOpen(true)}
                  disabled={user.groups.length === 0}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Gerenciar
                </Button>
              </div>
            </div>

            {user.groups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">
                O usuário não pertence a nenhum grupo.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {user.groups.map((group) => (
                  <Badge key={group} variant="outline">
                    {group}
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              O usuário herda permissões adicionais dos grupos acima.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sub-dialogs */}
      <GrantPermissionsDialog
        open={grantDialogOpen}
        onOpenChange={setGrantDialogOpen}
        user={user}
        onSuccess={handlePermissionSuccess}
      />

      <EditPermissionsDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        user={user}
        onSuccess={handlePermissionSuccess}
      />

      <ManageGroupsDialog
        open={addGroupsDialogOpen}
        onOpenChange={setAddGroupsDialogOpen}
        user={user}
        mode="add"
        onSuccess={handleGroupSuccess}
      />

      <ManageGroupsDialog
        open={manageGroupsDialogOpen}
        onOpenChange={setManageGroupsDialogOpen}
        user={user}
        mode="manage"
        onSuccess={handleGroupSuccess}
      />
    </>
  );
}
