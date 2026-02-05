import { Button } from '@/components/ui/button';
import { UserPlus, Pencil, Trash2, Shield } from 'lucide-react';

interface BoldUser {
  id: number;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  groups: string[];
}

interface UserActionsToolbarProps {
  selectedUser: BoldUser | null;
  onAddClick: () => void;
  onEditClick: () => void;
  onDeleteClick: () => void;
  onPermissionsClick: () => void;
}

export function UserActionsToolbar({
  selectedUser,
  onAddClick,
  onEditClick,
  onDeleteClick,
  onPermissionsClick,
}: UserActionsToolbarProps) {
  const hasSelection = selectedUser !== null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <Button onClick={onAddClick} className="gap-2">
        <UserPlus className="h-4 w-4" />
        Adicionar Usuário
      </Button>
      
      <Button
        variant="outline"
        onClick={onEditClick}
        disabled={!hasSelection}
        className="gap-2"
      >
        <Pencil className="h-4 w-4" />
        Editar
      </Button>
      
      <Button
        variant="outline"
        onClick={onDeleteClick}
        disabled={!hasSelection}
        className="gap-2 text-destructive hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
        Apagar
      </Button>
      
      <Button
        variant="outline"
        onClick={onPermissionsClick}
        disabled={!hasSelection}
        className="gap-2"
      >
        <Shield className="h-4 w-4" />
        Ver Permissões
      </Button>
    </div>
  );
}
