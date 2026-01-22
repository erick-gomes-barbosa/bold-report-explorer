import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ReportParameter } from '@/types/boldReports';

interface ParameterFormProps {
  parameters: ReportParameter[];
  values: Record<string, string | string[]>;
  onChange: (values: Record<string, string | string[]>) => void;
}

export function ParameterForm({ parameters, values, onChange }: ParameterFormProps) {
  const visibleParams = parameters.filter(p => !p.Hidden);

  const handleChange = (name: string, value: string | string[] | boolean) => {
    onChange({
      ...values,
      [name]: typeof value === 'boolean' ? String(value) : value,
    });
  };

  useEffect(() => {
    // Set default values
    const defaults: Record<string, string | string[]> = {};
    parameters.forEach(param => {
      if (param.DefaultValues?.length) {
        defaults[param.Name] = param.MultiValue 
          ? param.DefaultValues 
          : param.DefaultValues[0];
      }
    });
    if (Object.keys(defaults).length > 0) {
      onChange({ ...defaults, ...values });
    }
  }, [parameters]);

  if (visibleParams.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Este relatório não possui parâmetros configuráveis.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {visibleParams.map((param) => (
        <div key={param.Name} className="space-y-2">
          <Label htmlFor={param.Name} className="text-sm font-medium">
            {param.Prompt || param.Name}
            {!param.AllowBlank && <span className="text-destructive ml-1">*</span>}
          </Label>

          {param.ValidValues?.length ? (
            <Select
              value={String(values[param.Name] || '')}
              onValueChange={(value) => handleChange(param.Name, value)}
            >
              <SelectTrigger id={param.Name}>
                <SelectValue placeholder="Selecione uma opção" />
              </SelectTrigger>
              <SelectContent>
                {param.ValidValues.map((option) => (
                  <SelectItem key={option.Value} value={option.Value}>
                    {option.Label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : param.DataType === 'Boolean' ? (
            <div className="flex items-center gap-2">
              <Checkbox
                id={param.Name}
                checked={values[param.Name] === 'true'}
                onCheckedChange={(checked) => handleChange(param.Name, checked === true)}
              />
              <Label htmlFor={param.Name} className="text-sm text-muted-foreground">
                Ativado
              </Label>
            </div>
          ) : param.DataType === 'DateTime' ? (
            <Input
              id={param.Name}
              type="date"
              value={String(values[param.Name] || '')}
              onChange={(e) => handleChange(param.Name, e.target.value)}
              className="bg-background"
            />
          ) : param.DataType === 'Integer' || param.DataType === 'Float' ? (
            <Input
              id={param.Name}
              type="number"
              step={param.DataType === 'Float' ? '0.01' : '1'}
              value={String(values[param.Name] || '')}
              onChange={(e) => handleChange(param.Name, e.target.value)}
              placeholder={`Digite um valor ${param.DataType === 'Integer' ? 'inteiro' : 'numérico'}`}
              className="bg-background"
            />
          ) : (
            <Input
              id={param.Name}
              type="text"
              value={String(values[param.Name] || '')}
              onChange={(e) => handleChange(param.Name, e.target.value)}
              placeholder="Digite um valor"
              className="bg-background"
            />
          )}
        </div>
      ))}
    </div>
  );
}
