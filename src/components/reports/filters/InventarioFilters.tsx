import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Search, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  tipo: z.enum(['total', 'parcial']),
  status: z.string().optional(),
  periodoInicio: z.date().optional(),
  periodoFim: z.date().optional(),
  unidadeAlvo: z.string().optional(),
}).refine((data) => {
  if (data.periodoInicio && data.periodoFim) {
    return data.periodoFim >= data.periodoInicio;
  }
  return true;
}, {
  message: "Data final deve ser maior que a inicial",
  path: ["periodoFim"],
});

type FilterFormData = z.infer<typeof filterSchema>;

interface InventarioFiltersProps {
  onSubmit: (data: FilterFormData) => void;
  loading?: boolean;
}

const statusOptions = [
  { value: 'pendente', label: 'Pendente', variant: 'secondary' as const },
  { value: 'em_andamento', label: 'Em Andamento', variant: 'default' as const },
  { value: 'concluido', label: 'Concluído', variant: 'outline' as const },
  { value: 'cancelado', label: 'Cancelado', variant: 'destructive' as const },
];

const unidades = [
  { id: '1', nome: 'Sede Principal' },
  { id: '2', nome: 'Almoxarifado Central' },
  { id: '3', nome: 'Depósito Norte' },
  { id: '4', nome: 'Filial Sul' },
];

export function InventarioFilters({ onSubmit, loading }: InventarioFiltersProps) {
  const form = useForm<FilterFormData>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      tipo: 'total',
      status: '',
      unidadeAlvo: '',
    },
  });

  const handleReset = () => {
    form.reset({
      tipo: 'total',
      status: '',
      periodoInicio: undefined,
      periodoFim: undefined,
      unidadeAlvo: '',
    });
  };

  const selectedStatus = form.watch('status');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Tipo */}
        <FormField
          control={form.control}
          name="tipo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Inventário *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="total">Total</SelectItem>
                  <SelectItem value="parcial">Parcial</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Status com Badges */}
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status">
                      {selectedStatus && (
                        <Badge variant={statusOptions.find(s => s.value === selectedStatus)?.variant}>
                          {statusOptions.find(s => s.value === selectedStatus)?.label}
                        </Badge>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Período */}
        <div className="space-y-2">
          <Label>Período</Label>
          <div className="grid grid-cols-2 gap-2">
            <FormField
              control={form.control}
              name="periodoInicio"
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
              name="periodoFim"
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

        {/* Unidade Alvo */}
        <FormField
          control={form.control}
          name="unidadeAlvo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unidade Alvo</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as unidades" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {unidades.map((unidade) => (
                    <SelectItem key={unidade.id} value={unidade.id}>
                      {unidade.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

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
            disabled={loading}
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
