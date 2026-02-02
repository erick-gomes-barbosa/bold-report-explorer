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
  orgaoUnidade: z.array(z.string()).default([]),
  grupo: z.array(z.string()).default([]),
  situacao: z.array(z.string()).default([]),
  conservacao: z.array(z.string()).default([]),
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

export interface FilterSubmitData extends FilterFormData {
  _labelMappings?: Record<string, Record<string, string>>;
}

interface BensNecessidadeFiltersProps {
  onSubmit: (data: FilterSubmitData) => void;
  loading?: boolean;
}

export function BensNecessidadeFilters({ onSubmit, loading }: BensNecessidadeFiltersProps) {
  const reportId = REPORT_MAPPING['bens-necessidade'].reportId;
  const { 
    loading: loadingParams, 
    getOptionsForParameter,
    getLabelMappingForParameter
  } = useReportParameters(reportId);

  const form = useForm<FilterFormData>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      orgaoUnidade: [],
      grupo: [],
      situacao: [],
      conservacao: [],
    },
  });

  // Wrapper para incluir label mappings no submit
  const handleFormSubmit = (data: FilterFormData) => {
    const labelMappings: Record<string, Record<string, string>> = {
      orgaoUnidade: getLabelMappingForParameter('param_unidade'),
      grupo: getLabelMappingForParameter('param_grupo'),
      situacao: getLabelMappingForParameter('param_situacao'),
      conservacao: getLabelMappingForParameter('param_estado'),
    };

    onSubmit({
      ...data,
      _labelMappings: labelMappings,
    });
  };

  const handleReset = () => {
    form.reset({
      orgaoUnidade: [],
      grupo: [],
      situacao: [],
      conservacao: [],
      faixaPrecoMin: undefined,
      faixaPrecoMax: undefined,
      dataAquisicaoInicio: undefined,
      dataAquisicaoFim: undefined,
    });
  };

  // Opções dinâmicas dos parâmetros do Bold Reports
  const unidadeOptions = getOptionsForParameter('param_unidade');
  const grupoOptions = getOptionsForParameter('param_grupo');
  const situacaoOptions = getOptionsForParameter('param_situacao');
  const conservacaoOptions = getOptionsForParameter('param_estado');

  return (
    <Form {...form}>
      <form id="form-bens-necessidade" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* Órgão/Unidade */}
        <FormField
          control={form.control}
          name="orgaoUnidade"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Órgão/Unidade</FormLabel>
              <FormControl>
                {loadingParams ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <MultiSelect
                    id="filter-orgao-unidade"
                    options={unidadeOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Todos"
                  />
                )}
              </FormControl>
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
              <FormControl>
                {loadingParams ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <MultiSelect
                    id="filter-grupo"
                    options={grupoOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Todos"
                  />
                )}
              </FormControl>
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
              <FormControl>
                {loadingParams ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <MultiSelect
                    id="filter-situacao"
                    options={situacaoOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Todos"
                  />
                )}
              </FormControl>
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
              <FormControl>
                {loadingParams ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <MultiSelect
                    id="filter-conservacao"
                    options={conservacaoOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Todos"
                  />
                )}
              </FormControl>
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
                      id="filter-preco-min"
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
                      id="filter-preco-max"
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
                          id="filter-data-inicio"
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
              name="dataAquisicaoFim"
              render={({ field }) => (
                <FormItem>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          id="filter-data-fim"
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

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            id="btn-filter-reset"
            type="button"
            variant="outline"
            onClick={handleReset}
            className="flex-1 gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Limpar
          </Button>
          <Button
            id="btn-filter-submit"
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
