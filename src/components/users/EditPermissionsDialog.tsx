import { useState, useEffect } from 'react';
import { Loader2, Shield, X, Pencil } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

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
  PermissionId: number;
  PermissionEntity: string;
  PermissionAccess: string;
  ItemId?: string;
  ItemName?: string;
}

interface EditPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: BoldUser | null;
  onSuccess?: () => void;
}

const CATEGORY_MAP: Record<string, string> = {
  AllReports: 'Relatórios',
  ReportsInCategory: 'Relatórios',
  SpecificReports: 'Relatórios',
  AllCategories: 'Categorias',
  SpecificCategory: 'Categorias',
  AllDataSources: 'Fontes de Dados',
  SpecificDataSource: 'Fontes de Dados',
  AllDatasets: 'Datasets',
  SpecificDataset: 'Datasets',
  AllSchedules: 'Agendamentos',
  SpecificSchedule: 'Agendamentos',
};

const ACCESS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  Create: { label: 'Criar', variant: 'outline' },
  Read: { label: 'Visualizar', variant: 'secondary' },
  ReadWrite: { label: 'Ler/Escrever', variant: 'default' },
  ReadWriteDelete: { label: 'Acesso Total', variant: 'destructive' },
  Download: { label: 'Download', variant: 'outline' },
};

const ACCESS_OPTIONS = [
  { value: 'Read', label: 'Visualizar' },
  { value: 'ReadWrite', label: 'Ler/Escrever' },
  { value: 'ReadWriteDelete', label: 'Acesso Total' },
  { value: 'Create', label: 'Criar' },
  { value: 'Download', label: 'Download' },
];

export function EditPermissionsDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: EditPermissionsDialogProps) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const [permissionsToDelete, setPermissionsToDelete] = useState<number[]>([]);
  const [permissionsToUpdate, setPermissionsToUpdate] = useState<Record<number, string>>({});

  useEffect(() => {
    if (open && user) {
      fetchPermissions();
      setSelectedPermissions([]);
      setPermissionsToDelete([]);
      setPermissionsToUpdate({});
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
            Authorization: `Bearer ${supabaseKey}`,
            apikey: supabaseKey,
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

  const handleSelectPermission = (permissionId: number) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleMarkForDeletion = (permissionId: number) => {
    setPermissionsToDelete((prev) => [...prev, permissionId]);
    setSelectedPermissions((prev) => prev.filter((id) => id !== permissionId));
  };

  const handleUndoDelete = (permissionId: number) => {
    setPermissionsToDelete((prev) => prev.filter((id) => id !== permissionId));
  };

  const handleChangeAccessForSelected = (newAccess: string) => {
    const updates: Record<number, string> = {};
    selectedPermissions.forEach((id) => {
      updates[id] = newAccess;
    });
    setPermissionsToUpdate((prev) => ({ ...prev, ...updates }));
    setSelectedPermissions([]);
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      // Delete permissions
      if (permissionsToDelete.length > 0) {
        const deleteResponse = await fetch(`${supabaseUrl}/functions/v1/user-management`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            apikey: supabaseKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'deleteMultiplePermissions',
            permissionIds: permissionsToDelete,
          }),
        });

        const deleteResult = await deleteResponse.json();
        if (!deleteResult.success && deleteResponse.status !== 207) {
          throw new Error(deleteResult.error || 'Erro ao remover permissões');
        }
      }

      // Update permissions (delete + recreate with new access)
      const updateEntries = Object.entries(permissionsToUpdate);
      for (const [permissionIdStr, newAccess] of updateEntries) {
        const permissionId = parseInt(permissionIdStr, 10);
        const perm = permissions.find((p) => p.PermissionId === permissionId);
        if (!perm) continue;

        const updateResponse = await fetch(`${supabaseUrl}/functions/v1/user-management`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            apikey: supabaseKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'updatePermission',
            permissionId,
            userId: user.id,
            permissionEntity: perm.PermissionEntity,
            permissionAccess: newAccess,
            itemId: perm.ItemId,
          }),
        });

        const updateResult = await updateResponse.json();
        if (!updateResult.success) {
          console.error('Error updating permission:', updateResult.error);
        }
      }

      toast.success('Permissões atualizadas com sucesso');
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      console.error('Error saving permissions:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar permissões');
    } finally {
      setSaving(false);
    }
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    const category = CATEGORY_MAP[perm.PermissionEntity] || 'Outros';

    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const hasChanges = permissionsToDelete.length > 0 || Object.keys(permissionsToUpdate).length > 0;

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            <DialogTitle>Editar Permissões de {user.displayName}</DialogTitle>
          </div>
          <DialogDescription>
            Selecione permissões para alterar o nível de acesso ou clique no X para remover.
          </DialogDescription>
        </DialogHeader>

        {selectedPermissions.length > 0 && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
            <span className="text-sm text-muted-foreground">
              {selectedPermissions.length} selecionada(s)
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Alterar Acesso
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {ACCESS_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => handleChangeAccessForSelected(opt.value)}
                  >
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

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
              <p>Nenhuma permissão encontrada para este usuário.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedPermissions).map(([category, perms], idx) => (
                <div key={category}>
                  {idx > 0 && <Separator className="my-4" />}
                  <h4 className="font-medium text-sm mb-3">{category}</h4>
                  <div className="space-y-2">
                    {perms.map((perm) => {
                      const isDeleted = permissionsToDelete.includes(perm.PermissionId);
                      const isSelected = selectedPermissions.includes(perm.PermissionId);
                      const updatedAccess = permissionsToUpdate[perm.PermissionId];
                      const displayAccess = updatedAccess || perm.PermissionAccess;
                      const accessInfo = ACCESS_LABELS[displayAccess] || {
                        label: displayAccess,
                        variant: 'secondary' as const,
                      };

                      return (
                        <div
                          key={perm.PermissionId}
                          className={`flex items-center justify-between p-2 rounded-md border ${
                            isDeleted
                              ? 'border-destructive/50 bg-destructive/5'
                              : isSelected
                              ? 'border-primary bg-primary/5'
                              : updatedAccess
                              ? 'border-amber-500/50 bg-amber-500/5'
                              : 'bg-muted/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {!isDeleted && (
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleSelectPermission(perm.PermissionId)}
                              />
                            )}
                            <span
                              className={`text-sm ${
                                isDeleted ? 'line-through text-muted-foreground' : ''
                              }`}
                            >
                              {perm.ItemName || perm.PermissionEntity}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {updatedAccess && !isDeleted && (
                              <Badge variant="outline" className="text-xs bg-amber-500/10 border-amber-500/30">
                                Alterado
                              </Badge>
                            )}
                            <Badge variant={accessInfo.variant}>{accessInfo.label}</Badge>
                            {isDeleted ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUndoDelete(perm.PermissionId)}
                              >
                                Desfazer
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleMarkForDeletion(perm.PermissionId)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Alterações'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
