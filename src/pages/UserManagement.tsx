import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReportsHeader } from '@/components/reports/ReportsHeader';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, ShieldCheck, Users } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UserActionsToolbar } from '@/components/users/UserActionsToolbar';
import { AddUserDialog } from '@/components/users/AddUserDialog';
import { EditUserDialog } from '@/components/users/EditUserDialog';
import { DeleteUserDialog } from '@/components/users/DeleteUserDialog';
import { PermissionsDialog } from '@/components/users/PermissionsDialog';
import { cn } from '@/lib/utils';

interface BoldUser {
  id: number;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  groups: string[];
}

export default function UserManagement() {
  const { boldReportsInfo, loading: authLoading, boldSyncing } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<BoldUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Selection and dialog states
  const [selectedUser, setSelectedUser] = useState<BoldUser | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && !boldReportsInfo.isAdmin) {
      navigate('/');
    }
  }, [authLoading, boldReportsInfo.isAdmin, navigate]);

  // Fetch users
  // Fetch users with retry logic
  const fetchUsers = useCallback(async (retries = 3) => {
    setLoading(true);
    setError(null);
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`[UserManagement] Fetching users, attempt ${attempt}/${retries}`);
        
        const { data, error: fnError } = await supabase.functions.invoke('bold-users', {
          method: 'POST',
        });

        if (fnError) {
          throw new Error(fnError.message);
        }

        if (!data.success) {
          throw new Error(data.error || 'Erro ao buscar usuários');
        }

        setUsers(data.users || []);
        setSelectedUser(null);
        setLoading(false);
        return; // Success
      } catch (err) {
        console.error(`[UserManagement] Error fetching users (attempt ${attempt}):`, err);
        
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        
        setError(err instanceof Error ? err.message : 'Erro ao buscar usuários');
      }
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    if (boldReportsInfo.isAdmin) {
      fetchUsers();
    }
  }, [boldReportsInfo.isAdmin, fetchUsers]);

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isUserAdmin = (groups: string[]) => {
    return groups.includes('System Administrator');
  };

  const handleRowClick = (user: BoldUser) => {
    setSelectedUser(selectedUser?.id === user.id ? null : user);
  };

  const handleSuccess = () => {
    fetchUsers();
  };

  if (authLoading || boldSyncing) {
    return (
      <div className="min-h-screen bg-background">
        <ReportsHeader title="Gerência de Usuários" subtitle="Carregando permissões..." />
        <div className="container max-w-7xl mx-auto px-4 py-8">
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  if (!boldReportsInfo.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <ReportsHeader 
        title="Gerência de Usuários" 
        subtitle="Visualize e gerencie usuários do Bold Reports"
      />
      
      <main className="container max-w-7xl mx-auto px-4 py-8">
        {/* Toolbar */}
        <UserActionsToolbar
          selectedUser={selectedUser}
          onAddClick={() => setIsAddDialogOpen(true)}
          onEditClick={() => setIsEditDialogOpen(true)}
          onDeleteClick={() => setIsDeleteDialogOpen(true)}
          onPermissionsClick={() => setIsPermissionsDialogOpen(true)}
        />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>Usuários do Bold Reports</CardTitle>
            </div>
            <CardDescription>
              Lista de todos os usuários cadastrados no sistema Bold Reports. Clique em uma linha para selecionar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erro</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[150px]" />
                    <Skeleton className="h-4 w-[100px]" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Usuário</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Grupos</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Nenhum usuário encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow 
                          key={user.id}
                          className={cn(
                            "cursor-pointer transition-all duration-200 ease-out",
                            selectedUser?.id === user.id 
                              ? "ring-2 ring-primary ring-inset bg-primary/5 scale-[1.01]" 
                              : "hover:bg-muted/50 hover:scale-[1.005]"
                          )}
                          onClick={() => handleRowClick(user)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                  {getInitials(user.displayName)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{user.displayName}</span>
                                {isUserAdmin(user.groups) && (
                                  <Badge variant="default" className="gap-1">
                                    <ShieldCheck className="h-3 w-3" />
                                    Admin
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {user.email}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {user.groups.length === 0 ? (
                                <span className="text-muted-foreground text-sm">Sem grupos</span>
                              ) : (
                                user.groups.map((group) => (
                                  <Badge key={group} variant="secondary" className="text-xs">
                                    {group}
                                  </Badge>
                                ))
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={user.isActive ? "default" : "secondary"}>
                              {user.isActive ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Dialogs */}
      <AddUserDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={handleSuccess}
      />
      <EditUserDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        user={selectedUser}
        onSuccess={handleSuccess}
      />
      <DeleteUserDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        user={selectedUser}
        onSuccess={handleSuccess}
      />
      <PermissionsDialog
        open={isPermissionsDialogOpen}
        onOpenChange={setIsPermissionsDialogOpen}
        user={selectedUser}
        onRefresh={handleSuccess}
      />
    </div>
  );
}
