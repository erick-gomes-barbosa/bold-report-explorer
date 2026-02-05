import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/assets/logo-pb.png';

const cadastroSchema = z.object({
  fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(/[a-zA-Z]/, 'Senha deve conter pelo menos uma letra')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

type CadastroFormData = z.infer<typeof cadastroSchema>;

export default function Cadastro() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signUp } = useAuth();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CadastroFormData>({
    resolver: zodResolver(cadastroSchema),
  });

  const password = watch('password', '');

  const passwordRequirements = [
    { label: 'Pelo menos 8 caracteres', valid: password.length >= 8 },
    { label: 'Pelo menos uma letra', valid: /[a-zA-Z]/.test(password) },
    { label: 'Pelo menos um número', valid: /[0-9]/.test(password) },
  ];

  const onSubmit = async (data: CadastroFormData) => {
    setIsLoading(true);
    try {
      const { error } = await signUp(data.email, data.password, data.fullName);

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Erro ao cadastrar',
          description: error.message,
        });
        return;
      }

      setSuccess(true);
      toast({
        title: 'Cadastro realizado!',
        description: 'Verifique seu email para confirmar a conta.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Ocorreu um erro inesperado. Tente novamente.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen auth-gradient relative">
        {/* Logo no canto superior esquerdo */}
        <div className="absolute top-6 left-6">
          <img src={logo} alt="Logo" className="h-12 w-auto" />
        </div>

        {/* Card de sucesso */}
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="auth-card w-full max-w-md rounded-2xl p-8 shadow-2xl text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-[#247d5b]/20 p-4 rounded-full">
                <CheckCircle2 className="h-12 w-12 text-[#247d5b]" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Cadastro realizado!</h1>
            <div className="w-12 h-1 bg-[#247d5b] mx-auto rounded-full mb-4" />
            <p className="text-white/70 text-sm mb-8">
              Enviamos um email de confirmação para o endereço informado.
              Por favor, verifique sua caixa de entrada e clique no link para ativar sua conta.
            </p>
            <Button 
              onClick={() => navigate('/login')} 
              className="w-full h-11 bg-[#247d5b] hover:bg-[#1f6b4d] text-white font-medium rounded-lg transition-colors"
            >
              Ir para Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen auth-gradient relative">
      {/* Logo no canto superior esquerdo */}
      <div className="absolute top-6 left-6">
        <img src={logo} alt="Logo" className="h-12 w-auto" />
      </div>

      {/* Card centralizado */}
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="auth-card w-full max-w-md rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-1">Criar conta</h1>
            <div className="w-12 h-1 bg-[#247d5b] mx-auto rounded-full mb-4" />
            <p className="text-white/70 text-sm">
              Preencha os dados abaixo para criar sua conta
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-white text-sm">
                Nome completo
              </Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Seu nome completo"
                className="auth-input h-11"
                {...register('fullName')}
                disabled={isLoading}
              />
              {errors.fullName && (
                <p className="text-sm text-red-400">{errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white text-sm">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                className="auth-input h-11"
                {...register('email')}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white text-sm">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="auth-input h-11 pr-10"
                  {...register('password')}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-white/50" />
                  ) : (
                    <Eye className="h-4 w-4 text-white/50" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-400">{errors.password.message}</p>
              )}
              {/* Password requirements */}
              <div className="space-y-1 mt-2">
                {passwordRequirements.map((req, index) => (
                  <div
                    key={index}
                    className={`text-xs flex items-center gap-1.5 ${
                      req.valid ? 'text-[#247d5b]' : 'text-white/40'
                    }`}
                  >
                    <div
                      className={`h-1.5 w-1.5 rounded-full ${
                        req.valid ? 'bg-[#247d5b]' : 'bg-white/40'
                      }`}
                    />
                    {req.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white text-sm">
                Confirmar senha
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="auth-input h-11 pr-10"
                  {...register('confirmPassword')}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-white/50" />
                  ) : (
                    <Eye className="h-4 w-4 text-white/50" />
                  )}
                </Button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-400">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Link para login */}
            <div className="text-center pt-2">
              <span className="text-white/60 text-sm">
                Já tem uma conta?{' '}
                <Link 
                  to="/login" 
                  className="text-[#247d5b] hover:text-[#2e9b71] font-medium transition-colors"
                >
                  Faça login
                </Link>
              </span>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full h-11 bg-[#247d5b] hover:bg-[#1f6b4d] text-white font-medium rounded-lg transition-colors"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                'Criar conta'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
