import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Search, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const filterSchema = z.object({
  orgaoUnidade: z.string().optional(),
  grupo: z.string().optional(),
  situacao: z.string().optional(),
  conservacao: z.string().optional(),
  faixaPrecoMin: z.coerce.number().min(0).optional(),
  faixaPrecoMax: z.coerce.number().min(0).optional(),
  dataAquisicaoInicio: z.date().optional(),
  dataAquisicaoFim: z.date().optional(),
}).refine((data) => {
  if (data.dataAquisicaoInicio && data.dataAquisicaoFim) {
    return data.dataAquisicaoFim >= data.dataAquisicaoInicio;
  }
  return true;
}, {
  message: "Data final deve ser maior que a inicial",
  path: ["dataAquisicaoFim"],
});

type FilterFormData = z.infer<typeof filterSchema>;

interface BensNecessidadeFiltersProps {
  onSubmit: (data: FilterFormData) => void;
  loading?: boolean;
}

// Mock data for selects
const orgaosUnidades = [
  { id: '1', nome: 'Secretaria de Administração' },
  { id: '2', nome: 'Secretaria de Finanças' },
  { id: '3', nome: 'Secretaria de Educação' },
];

const grupos = [
  { id: '1', nome: 'Mobiliário' },
  { id: '2', nome: 'Equipamentos de Informática' },
  { id: '3', nome: 'Veículos' },
  { id: '4', nome: 'Máquinas e Equipamentos' },
];

const situacoes = ['Ativo', 'Inativo', 'Em Manutenção', 'Baixado'];
const conservacoes = ['Ótimo', 'Bom', 'Regular', 'Ruim', 'Péssimo'];

export function BensNecessidadeFilters({ onSubmit, loading }: BensNecessidadeFiltersProps) {
  const form = useForm<FilterFormData>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      orgaoUnidade: '',
      grupo: '',
      situacao: '',
      conservacao: '',
    },
  });

  const handleReset = () => {
    form.reset({
      orgaoUnidade: '',
      grupo: '',
      situacao: '',
      conservacao: '',
      faixaPrecoMin: undefined,
      faixaPrecoMax: undefined,
      dataAquisicaoInicio: undefined,
      dataAquisicaoFim: undefined,
    });
  };

  const isValid = form.formState.isValid;
  const isDirty = form.formState.isDirty;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Órgão/Unidade */}
        <FormField
          control={form.control}
          name="orgaoUnidade"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Órgão/Unidade</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {orgaosUnidades.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Grupo */}
        <FormField
          control={form.control}
          name="grupo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Grupo</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {grupos.map((grupo) => (
                    <SelectItem key={grupo.id} value={grupo.id}>
                      {grupo.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Situação */}
        <FormField
          control={form.control}
          name="situacao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Situação</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {situacoes.map((sit) => (
                    <SelectItem key={sit} value={sit}>
                      {sit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Conservação */}
        <FormField
          control={form.control}
          name="conservacao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estado de Conservação</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {conservacoes.map((cons) => (
                    <SelectItem key={cons} value={cons}>
                      {cons}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Faixa de Preço */}
        <div className="space-y-2">
          <Label>Faixa de Preço (R$)</Label>
          <div className="grid grid-cols-2 gap-2">
            <FormField
              control={form.control}
              name="faixaPrecoMin"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Mínimo"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="faixaPrecoMax"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Máximo"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Data de Aquisição */}
        <div className="space-y-2">
          <Label>Período de Aquisição</Label>
          <div className="grid grid-cols-2 gap-2">
            <FormField
              control={form.control}
              name="dataAquisicaoInicio"
              render={({ field }) => (
                <FormItem>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Início"}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        locale={ptBR}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dataAquisicaoFim"
              render={({ field }) => (
                <FormItem>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Fim"}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        locale={ptBR}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className="flex-1 gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Limpar
          </Button>
          <Button
            type="submit"
            disabled={loading || (!isValid && isDirty)}
            className="flex-1 gap-2"
          >
            <Search className="h-4 w-4" />
            {loading ? 'Gerando...' : 'Gerar'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
