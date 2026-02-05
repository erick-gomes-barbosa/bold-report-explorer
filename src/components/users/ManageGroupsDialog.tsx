import { useState, useEffect } from 'react';
import { Loader2, Users, X, Plus } from 'lucide-react';
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

interface Group {
  Id: number;
  Name: string;
  Description?: string;
}

interface ManageGroupsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: BoldUser | null;
  mode: 'add' | 'manage';
  onSuccess?: () => void;
}

export function ManageGroupsDialog({ 
  open, 
  onOpenChange, 
  user, 
  mode,
  onSuccess 
}: ManageGroupsDialogProps) {
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
  const [groupsToRemove, setGroupsToRemove] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      fetchGroups();
      setSelectedGroups([]);
      setGroupsToRemove([]);
    }
  }, [open, user]);

  const fetchGroups = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/user-management?action=getGroups`,
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
        throw new Error(result.error || 'Erro ao buscar grupos');
      }

      // Filter out system groups that shouldn't be managed
      const managableGroups = (result.groups || []).filter(
        (g: Group) => g.Name !== 'System Administrator'
      );
      setAllGroups(managableGroups);
    } catch (err) {
      console.error('Error fetching groups:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar grupos');
    } finally {
      setLoading(false);
    }
  };

  const handleGroupToggle = (groupId: number, groupName: string) => {
    if (mode === 'add') {
      // In add mode, only allow selecting groups the user doesn't belong to
      if (user?.groups.includes(groupName)) {
        return; // Can't select groups user already belongs to
      }
      setSelectedGroups(prev => 
        prev.includes(groupId) 
          ? prev.filter(id => id !== groupId)
          : [...prev, groupId]
      );
    }
  };

  const handleRemoveGroup = (groupId: number) => {
    setGroupsToRemove(prev => [...prev, groupId]);
  };

  const handleUndoRemove = (groupId: number) => {
    setGroupsToRemove(prev => prev.filter(id => id !== groupId));
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      if (mode === 'add' && selectedGroups.length > 0) {
        const response = await fetch(
          `${supabaseUrl}/functions/v1/user-management`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'apikey': supabaseKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'addUserToGroups',
              userId: user.id,
              groupIds: selectedGroups,
            }),
          }
        );

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || result.message || 'Erro ao adicionar aos grupos');
        }

        toast.success('Usuário adicionado aos grupos com sucesso');
      }

      if (mode === 'manage' && groupsToRemove.length > 0) {
        const response = await fetch(
          `${supabaseUrl}/functions/v1/user-management`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'apikey': supabaseKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'removeUserFromGroups',
              userId: user.id,
              groupIds: groupsToRemove,
            }),
          }
        );

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || result.message || 'Erro ao remover dos grupos');
        }

        toast.success('Usuário removido dos grupos com sucesso');
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      console.error('Error managing groups:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao gerenciar grupos');
    } finally {
      setSaving(false);
    }
  };

  const getUserGroupIds = (): number[] => {
    if (!user) return [];
    return allGroups
      .filter(g => user.groups.includes(g.Name))
      .map(g => g.Id);
  };

  const userGroupIds = getUserGroupIds();

  if (!user) return null;

  const title = mode === 'add' 
    ? `Adicionar ${user.displayName} a Grupos`
    : `Gerenciar Grupos de ${user.displayName}`;

  const description = mode === 'add'
    ? 'Selecione os grupos aos quais deseja adicionar o usuário.'
    : 'Remova o usuário dos grupos clicando no X.';

  const hasChanges = mode === 'add' 
    ? selectedGroups.length > 0 
    : groupsToRemove.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[350px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Carregando grupos...</span>
            </div>
          ) : error ? (
            <div className="py-8 text-center text-destructive">
              <p>{error}</p>
            </div>
          ) : mode === 'add' ? (
            <div className="space-y-2">
              {allGroups.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Nenhum grupo disponível.
                </p>
              ) : (
                allGroups.map((group) => {
                  const isMember = user.groups.includes(group.Name);
                  const isSelected = selectedGroups.includes(group.Id);

                  return (
                    <div
                      key={group.Id}
                      className={`flex items-center justify-between p-3 rounded-md border ${
                        isMember 
                          ? 'bg-muted/50 opacity-60 cursor-not-allowed' 
                          : isSelected 
                            ? 'border-primary bg-primary/5' 
                            : 'hover:bg-muted/50 cursor-pointer'
                      }`}
                      onClick={() => !isMember && handleGroupToggle(group.Id, group.Name)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          checked={isSelected || isMember}
                          disabled={isMember}
                          onCheckedChange={() => handleGroupToggle(group.Id, group.Name)}
                        />
                        <div>
                          <p className="font-medium text-sm">{group.Name}</p>
                          {group.Description && (
                            <p className="text-xs text-muted-foreground">{group.Description}</p>
                          )}
                        </div>
                      </div>
                      {isMember && (
                        <Badge variant="secondary" className="text-xs">
                          Membro
                        </Badge>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {userGroupIds.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  O usuário não pertence a nenhum grupo.
                </p>
              ) : (
                allGroups
                  .filter(g => userGroupIds.includes(g.Id))
                  .map((group) => {
                    const isMarkedForRemoval = groupsToRemove.includes(group.Id);

                    return (
                      <div
                        key={group.Id}
                        className={`flex items-center justify-between p-3 rounded-md border ${
                          isMarkedForRemoval 
                            ? 'border-destructive/50 bg-destructive/5' 
                            : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div>
                            <p className={`font-medium text-sm ${isMarkedForRemoval ? 'line-through text-muted-foreground' : ''}`}>
                              {group.Name}
                            </p>
                            {group.Description && (
                              <p className="text-xs text-muted-foreground">{group.Description}</p>
                            )}
                          </div>
                        </div>
                        {isMarkedForRemoval ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUndoRemove(group.Id)}
                          >
                            Desfazer
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveGroup(group.Id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })
              )}
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
            ) : mode === 'add' ? (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
