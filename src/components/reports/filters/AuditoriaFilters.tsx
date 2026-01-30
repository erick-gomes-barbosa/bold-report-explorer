import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Search, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  orgao: z.string().min(1, 'Órgão é obrigatório'),
  unidade: z.string().optional(),
  setor: z.string().optional(),
  periodoInicio: z.date({ required_error: 'Data inicial é obrigatória' }),
  periodoFim: z.date({ required_error: 'Data final é obrigatória' }),
}).refine((data) => {
  return data.periodoFim >= data.periodoInicio;
}, {
  message: "Data final deve ser maior que a inicial",
  path: ["periodoFim"],
});

type FilterFormData = z.infer<typeof filterSchema>;

interface AuditoriaFiltersProps {
  onSubmit: (data: FilterFormData) => void;
  loading?: boolean;
}

// Hierarchical mock data
const orgaos = [
  { 
    id: '1', 
    nome: 'Prefeitura Municipal',
    unidades: [
      { id: '1-1', nome: 'Secretaria de Administração', setores: ['Recursos Humanos', 'Patrimônio', 'Compras'] },
      { id: '1-2', nome: 'Secretaria de Finanças', setores: ['Contabilidade', 'Tesouraria', 'Tributos'] },
    ]
  },
  { 
    id: '2', 
    nome: 'Câmara Municipal',
    unidades: [
      { id: '2-1', nome: 'Gabinete', setores: ['Assessoria', 'Protocolo'] },
      { id: '2-2', nome: 'Administrativo', setores: ['Pessoal', 'Almoxarifado'] },
    ]
  },
];

export function AuditoriaFilters({ onSubmit, loading }: AuditoriaFiltersProps) {
  const form = useForm<FilterFormData>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      orgao: '',
      unidade: '',
      setor: '',
    },
  });

  const selectedOrgao = form.watch('orgao');
  const selectedUnidade = form.watch('unidade');

  const unidades = orgaos.find(o => o.id === selectedOrgao)?.unidades || [];
  const setores = unidades.find(u => u.id === selectedUnidade)?.setores || [];

  const handleReset = () => {
    form.reset({
      orgao: '',
      unidade: '',
      setor: '',
      periodoInicio: undefined,
      periodoFim: undefined,
    });
  };

  // Reset dependent fields when parent changes
  const handleOrgaoChange = (value: string) => {
    form.setValue('orgao', value);
    form.setValue('unidade', '');
    form.setValue('setor', '');
  };

  const handleUnidadeChange = (value: string) => {
    form.setValue('unidade', value);
    form.setValue('setor', '');
  };

  const isValid = form.formState.isValid;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Órgão (obrigatório) */}
        <FormField
          control={form.control}
          name="orgao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Órgão *</FormLabel>
              <Select onValueChange={handleOrgaoChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o órgão" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {orgaos.map((orgao) => (
                    <SelectItem key={orgao.id} value={orgao.id}>
                      {orgao.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Unidade (depends on Órgão) */}
        <FormField
          control={form.control}
          name="unidade"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unidade</FormLabel>
              <Select 
                onValueChange={handleUnidadeChange} 
                value={field.value}
                disabled={!selectedOrgao}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={selectedOrgao ? "Selecione a unidade" : "Selecione o órgão primeiro"} />
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

        {/* Setor (depends on Unidade) */}
        <FormField
          control={form.control}
          name="setor"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Setor</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value}
                disabled={!selectedUnidade}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={selectedUnidade ? "Selecione o setor" : "Selecione a unidade primeiro"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {setores.map((setor) => (
                    <SelectItem key={setor} value={setor}>
                      {setor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Período (obrigatório) */}
        <div className="space-y-2">
          <Label>Período *</Label>
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
            disabled={loading || !isValid}
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
