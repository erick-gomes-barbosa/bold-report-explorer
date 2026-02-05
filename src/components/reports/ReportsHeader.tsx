import { Users, LogOut, User, ChevronDown, Shield, ShieldCheck, Settings, ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/assets/logo-pb.png';

interface ReportsHeaderProps {
  title?: string;
  subtitle?: string;
}

export function ReportsHeader({ 
  title = "Relatórios de Bens Móveis",
  subtitle = "Gestão e Controle Patrimonial"
}: ReportsHeaderProps) {
  const { user, profile, signOut, boldReportsInfo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const isOnUsersPage = location.pathname === '/usuarios';

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSignOut = async () => {
    await signOut();
  };

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

          <div className="flex items-center gap-2">
            {boldReportsInfo.synced && boldReportsInfo.isAdmin && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => navigate(isOnUsersPage ? '/' : '/usuarios')}
                title={isOnUsersPage ? "Voltar para Relatórios" : "Gerenciar Usuários"}
              >
                {isOnUsersPage ? (
                  <ArrowLeft className="h-5 w-5" />
                ) : (
                  <Users className="h-5 w-5" />
                )}
              </Button>
            )}

            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="flex items-center gap-2 text-primary-foreground hover:bg-primary-foreground/10 px-2"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-xs">
                        {getInitials(profile?.full_name || user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline-block text-sm font-medium max-w-[150px] truncate">
                      {profile?.full_name || user.email?.split('@')[0]}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium leading-none">
                          {profile?.full_name || 'Usuário'}
                        </p>
                        {boldReportsInfo.synced && (
                          <Badge 
                            variant={boldReportsInfo.isAdmin ? "default" : "secondary"}
                            className="text-[10px] px-1.5 py-0"
                          >
                            {boldReportsInfo.isAdmin ? (
                              <>
                                <ShieldCheck className="h-3 w-3 mr-0.5" />
                                Admin
                              </>
                            ) : (
                              <>
                                <Shield className="h-3 w-3 mr-0.5" />
                                Usuário
                              </>
                            )}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Ver Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Configurações
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="cursor-pointer text-destructive focus:text-destructive"
                    onClick={handleSignOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
