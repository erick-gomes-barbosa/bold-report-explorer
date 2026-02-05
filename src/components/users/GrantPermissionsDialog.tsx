import { useState, useEffect } from 'react';
import { Loader2, Shield, Plus } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
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

interface Item {
  Id: string;
  Name: string;
  CategoryName?: string;
}

interface PermissionSelection {
  enabled: boolean;
  access: string;
  itemId?: string;
}

interface CategoryPermissions {
  all: PermissionSelection;
  byCategory?: PermissionSelection;
  specific?: PermissionSelection;
}

interface GrantPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: BoldUser | null;
  onSuccess?: () => void;
}

const ACCESS_OPTIONS = [
  { value: 'Read', label: 'Visualizar' },
  { value: 'ReadWrite', label: 'Ler/Escrever' },
  { value: 'ReadWriteDelete', label: 'Acesso Total' },
  { value: 'Create', label: 'Criar' },
  { value: 'Download', label: 'Download' },
];

const PERMISSION_CATEGORIES = [
  {
    id: 'reports',
    label: 'Relatórios',
    allEntity: 'AllReports',
    byCategoryEntity: 'ReportsInCategory',
    specificEntity: 'SpecificReports',
    itemType: 'reports',
    hasByCategory: true,
  },
  {
    id: 'categories',
    label: 'Categorias',
    allEntity: 'AllCategories',
    specificEntity: 'SpecificCategory',
    itemType: 'categories',
  },
  {
    id: 'datasources',
    label: 'Fontes de Dados',
    allEntity: 'AllDataSources',
    specificEntity: 'SpecificDataSource',
    itemType: 'datasources',
  },
  {
    id: 'datasets',
    label: 'Datasets',
    allEntity: 'AllDatasets',
    specificEntity: 'SpecificDataset',
    itemType: 'datasets',
  },
  {
    id: 'schedules',
    label: 'Agendamentos',
    allEntity: 'AllSchedules',
    specificEntity: 'SpecificSchedule',
    itemType: 'schedules',
  },
];

export function GrantPermissionsDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: GrantPermissionsDialogProps) {
  const [permissions, setPermissions] = useState<Record<string, CategoryPermissions>>({});
  const [items, setItems] = useState<Record<string, Item[]>>({});
  const [loadingItems, setLoadingItems] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      // Initialize permissions state
      const initial: Record<string, CategoryPermissions> = {};
      PERMISSION_CATEGORIES.forEach((cat) => {
        initial[cat.id] = {
          all: { enabled: false, access: 'Read' },
          ...(cat.hasByCategory && { byCategory: { enabled: false, access: 'Read' } }),
          specific: { enabled: false, access: 'Read' },
        };
      });
      setPermissions(initial);
      setItems({});
    }
  }, [open]);

  const fetchItems = async (itemType: string) => {
    if (items[itemType] || loadingItems[itemType]) return;

    setLoadingItems((prev) => ({ ...prev, [itemType]: true }));

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/user-management?action=getItems&itemType=${itemType}`,
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

      if (result.success) {
        setItems((prev) => ({ ...prev, [itemType]: result.items || [] }));
      }
    } catch (err) {
      console.error('Error fetching items:', err);
    } finally {
      setLoadingItems((prev) => ({ ...prev, [itemType]: false }));
    }
  };

  const updatePermission = (
    categoryId: string,
    type: 'all' | 'byCategory' | 'specific',
    field: 'enabled' | 'access' | 'itemId',
    value: boolean | string
  ) => {
    setPermissions((prev) => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        [type]: {
          ...prev[categoryId]?.[type],
          [field]: value,
        },
      },
    }));
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      // Build permissions array
      const permissionsToAdd: Array<{
        permissionEntity: string;
        permissionAccess: string;
        itemId?: string;
      }> = [];

      PERMISSION_CATEGORIES.forEach((cat) => {
        const catPerms = permissions[cat.id];
        if (!catPerms) return;

        // All permission
        if (catPerms.all?.enabled) {
          permissionsToAdd.push({
            permissionEntity: cat.allEntity,
            permissionAccess: catPerms.all.access,
          });
        }

        // By category permission (for reports)
        if (cat.hasByCategory && catPerms.byCategory?.enabled && catPerms.byCategory.itemId) {
          permissionsToAdd.push({
            permissionEntity: cat.byCategoryEntity!,
            permissionAccess: catPerms.byCategory.access,
            itemId: catPerms.byCategory.itemId,
          });
        }

        // Specific item permission
        if (catPerms.specific?.enabled && catPerms.specific.itemId) {
          permissionsToAdd.push({
            permissionEntity: cat.specificEntity,
            permissionAccess: catPerms.specific.access,
            itemId: catPerms.specific.itemId,
          });
        }
      });

      if (permissionsToAdd.length === 0) {
        toast.warning('Selecione pelo menos uma permissão para adicionar.');
        setSaving(false);
        return;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/user-management`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'addMultiplePermissions',
          userId: user.id,
          permissions: permissionsToAdd,
        }),
      });

      const result = await response.json();

      if (!result.success && response.status !== 207) {
        throw new Error(result.error || 'Erro ao adicionar permissões');
      }

      if (response.status === 207) {
        // Partial success
        const failed = result.results?.filter((r: { success: boolean }) => !r.success) || [];
        toast.warning(`${permissionsToAdd.length - failed.length} permissões adicionadas. ${failed.length} falharam.`);
      } else {
        toast.success('Permissões adicionadas com sucesso');
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      console.error('Error adding permissions:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao adicionar permissões');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <DialogTitle>Conceder Permissões para {user.displayName}</DialogTitle>
          </div>
          <DialogDescription>
            Selecione as permissões que deseja conceder ao usuário. Se nenhuma opção for selecionada
            em uma categoria, o usuário não terá permissão nela.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[450px] pr-4">
          <Accordion type="multiple" className="w-full">
            {PERMISSION_CATEGORIES.map((category) => (
              <AccordionItem key={category.id} value={category.id}>
                <AccordionTrigger 
                  className="text-sm font-medium"
                  onClick={() => fetchItems(category.itemType)}
                >
                  {category.label}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pl-2">
                    {/* All permission */}
                    <div className="flex items-center gap-4">
                      <Checkbox
                        id={`${category.id}-all`}
                        checked={permissions[category.id]?.all?.enabled || false}
                        onCheckedChange={(checked) =>
                          updatePermission(category.id, 'all', 'enabled', !!checked)
                        }
                      />
                      <div className="flex-1">
                        <Label htmlFor={`${category.id}-all`} className="text-sm">
                          {category.label === 'Relatórios' ? 'Todos os Relatórios' :
                           category.label === 'Categorias' ? 'Todas as Categorias' :
                           category.label === 'Fontes de Dados' ? 'Todas as Fontes de Dados' :
                           category.label === 'Datasets' ? 'Todos os Datasets' :
                           'Todos os Agendamentos'}
                        </Label>
                      </div>
                      <Select
                        value={permissions[category.id]?.all?.access || 'Read'}
                        onValueChange={(value) =>
                          updatePermission(category.id, 'all', 'access', value)
                        }
                        disabled={!permissions[category.id]?.all?.enabled}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ACCESS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* By category permission (for reports) */}
                    {category.hasByCategory && (
                      <div className="flex items-center gap-4">
                        <Checkbox
                          id={`${category.id}-byCategory`}
                          checked={permissions[category.id]?.byCategory?.enabled || false}
                          onCheckedChange={(checked) => {
                            updatePermission(category.id, 'byCategory', 'enabled', !!checked);
                            if (checked) fetchItems('categories');
                          }}
                        />
                        <div className="flex-1 space-y-2">
                          <Label htmlFor={`${category.id}-byCategory`} className="text-sm">
                            Relatórios por Categoria
                          </Label>
                          {permissions[category.id]?.byCategory?.enabled && (
                            <Select
                              value={permissions[category.id]?.byCategory?.itemId || ''}
                              onValueChange={(value) =>
                                updatePermission(category.id, 'byCategory', 'itemId', value)
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecione uma categoria" />
                              </SelectTrigger>
                              <SelectContent>
                                {loadingItems['categories'] ? (
                                  <div className="p-2 text-center text-sm text-muted-foreground">
                                    Carregando...
                                  </div>
                                ) : (
                                  (items['categories'] || []).map((item) => (
                                    <SelectItem key={item.Id} value={item.Id}>
                                      {item.Name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        <Select
                          value={permissions[category.id]?.byCategory?.access || 'Read'}
                          onValueChange={(value) =>
                            updatePermission(category.id, 'byCategory', 'access', value)
                          }
                          disabled={!permissions[category.id]?.byCategory?.enabled}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ACCESS_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Specific item permission */}
                    <div className="flex items-center gap-4">
                      <Checkbox
                        id={`${category.id}-specific`}
                        checked={permissions[category.id]?.specific?.enabled || false}
                        onCheckedChange={(checked) => {
                          updatePermission(category.id, 'specific', 'enabled', !!checked);
                          if (checked) fetchItems(category.itemType);
                        }}
                      />
                      <div className="flex-1 space-y-2">
                        <Label htmlFor={`${category.id}-specific`} className="text-sm">
                          {category.label === 'Relatórios' ? 'Relatório Específico' :
                           category.label === 'Categorias' ? 'Categoria Específica' :
                           category.label === 'Fontes de Dados' ? 'Fonte de Dados Específica' :
                           category.label === 'Datasets' ? 'Dataset Específico' :
                           'Agendamento Específico'}
                        </Label>
                        {permissions[category.id]?.specific?.enabled && (
                          <Select
                            value={permissions[category.id]?.specific?.itemId || ''}
                            onValueChange={(value) =>
                              updatePermission(category.id, 'specific', 'itemId', value)
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecione um item" />
                            </SelectTrigger>
                            <SelectContent>
                              {loadingItems[category.itemType] ? (
                                <div className="p-2 text-center text-sm text-muted-foreground">
                                  Carregando...
                                </div>
                              ) : (
                                (items[category.itemType] || []).map((item) => (
                                  <SelectItem key={item.Id} value={item.Id}>
                                    {item.Name}
                                    {item.CategoryName && ` (${item.CategoryName})`}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <Select
                        value={permissions[category.id]?.specific?.access || 'Read'}
                        onValueChange={(value) =>
                          updatePermission(category.id, 'specific', 'access', value)
                        }
                        disabled={!permissions[category.id]?.specific?.enabled}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ACCESS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Conceder Permissões
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
