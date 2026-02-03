import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Search, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
import { MultiSelect } from '@/components/ui/multi-select';
import { Skeleton } from '@/components/ui/skeleton';
import { useReportParameters } from '@/hooks/useReportParameters';
import { REPORT_MAPPING } from '@/config/reportMapping';

const filterSchema = z.object({
  tipo: z.array(z.string()).default([]),
  status: z.array(z.string()).default([]),
  periodoInicio: z.date().optional(),
  periodoFim: z.date().optional(),
  unidadeAlvo: z.array(z.string()).default([]),
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

export interface InventarioFilterSubmitData extends FilterFormData {
  _labelMappings?: Record<string, Record<string, string>>;
}

interface InventarioFiltersProps {
  onSubmit: (data: InventarioFilterSubmitData) => void;
  loading?: boolean;
}

// Opções estáticas de fallback (usadas quando a API não retorna parâmetros)
const staticTipoOptions = [
  { value: 'total', label: 'Total' },
  { value: 'parcial', label: 'Parcial' },
];

const staticStatusOptions = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'cancelado', label: 'Cancelado' },
];

const staticUnidadeOptions = [
  { value: '1', label: 'Sede Principal' },
  { value: '2', label: 'Almoxarifado Central' },
  { value: '3', label: 'Depósito Norte' },
  { value: '4', label: 'Filial Sul' },
];

export function InventarioFilters({ onSubmit, loading }: InventarioFiltersProps) {
  const reportId = REPORT_MAPPING['inventario'].reportId;
  const { 
    loading: loadingParams, 
    getOptionsForParameter,
    getLabelMappingForParameter
  } = useReportParameters(reportId);

  const form = useForm<FilterFormData>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      tipo: [],
      status: [],
      unidadeAlvo: [],
    },
  });

  // Wrapper para incluir label mappings no submit
  const handleFormSubmit = (data: FilterFormData) => {
    const labelMappings: Record<string, Record<string, string>> = {
      tipo: getLabelMappingForParameter('param_tipo'),
      status: getLabelMappingForParameter('param_status'),
      unidadeAlvo: getLabelMappingForParameter('param_unidade'),
    };

    onSubmit({
      ...data,
      _labelMappings: labelMappings,
    });
  };

  const handleReset = () => {
    form.reset({
      tipo: [],
      status: [],
      periodoInicio: undefined,
      periodoFim: undefined,
      unidadeAlvo: [],
    });
  };

  // Opções dinâmicas dos parâmetros do Bold Reports (com fallback estático)
  const dynamicTipoOptions = getOptionsForParameter('param_tipo');
  const dynamicStatusOptions = getOptionsForParameter('param_status');
  const dynamicUnidadeOptions = getOptionsForParameter('param_unidade');
  
  const tipoOptions = dynamicTipoOptions.length > 0 ? dynamicTipoOptions : staticTipoOptions;
  const statusOptions = dynamicStatusOptions.length > 0 ? dynamicStatusOptions : staticStatusOptions;
  const unidadeOptions = dynamicUnidadeOptions.length > 0 ? dynamicUnidadeOptions : staticUnidadeOptions;

  return (
    <Form {...form}>
      <form id="form-inventario" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* Tipo com MultiSelect */}
        <FormField
          control={form.control}
          name="tipo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Inventário</FormLabel>
              <FormControl>
                {loadingParams ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <MultiSelect
                    id="filter-tipo"
                    options={tipoOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Todos os tipos"
                  />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Status com MultiSelect */}
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <FormControl>
                {loadingParams ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <MultiSelect
                    id="filter-status"
                    options={statusOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Todos os status"
                  />
                )}
              </FormControl>
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
                          id="filter-periodo-inicio"
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
                    <PopoverContent className="w-auto p-0 z-50" align="start">
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
                          id="filter-periodo-fim"
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
                    <PopoverContent className="w-auto p-0 z-50" align="start">
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

        {/* Unidade Alvo com MultiSelect */}
        <FormField
          control={form.control}
          name="unidadeAlvo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unidade Alvo</FormLabel>
              <FormControl>
                {loadingParams ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <MultiSelect
                    id="filter-unidade"
                    options={unidadeOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Todas as unidades"
                  />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            id="btn-filter-reset-inventario"
            type="button"
            variant="outline"
            onClick={handleReset}
            className="flex-1 gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Limpar
          </Button>
          <Button
            id="btn-filter-submit-inventario"
            type="submit"
            disabled={loading || loadingParams}
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
