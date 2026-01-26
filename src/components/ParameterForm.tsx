import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ReportParameter, AvailableValue } from '@/types/boldReports';

interface ParameterFormProps {
  parameters: ReportParameter[];
  values: Record<string, string | string[]>;
  onChange: (values: Record<string, string | string[]>) => void;
}

export function ParameterForm({ parameters, values, onChange }: ParameterFormProps) {
  const visibleParams = parameters.filter(p => !p.Hidden);

  const handleChange = (name: string, value: string | string[] | boolean) => {
    // Always store as array for consistency with the API v5.0 requirement
    let normalizedValue: string | string[];
    
    if (Array.isArray(value)) {
      normalizedValue = value;
    } else if (typeof value === 'boolean') {
      normalizedValue = String(value);
    } else if (value === null || value === undefined || value === '') {
      normalizedValue = '';
    } else {
      normalizedValue = String(value);
    }
    
    onChange({
      ...values,
      [name]: normalizedValue,
    });
  };

  const handleMultiValueChange = (name: string, optionValue: string, checked: boolean) => {
    const currentValues = Array.isArray(values[name]) ? values[name] as string[] : [];
    const newValues = checked
      ? [...currentValues, optionValue]
      : currentValues.filter(v => v !== optionValue);
    onChange({
      ...values,
      [name]: newValues,
    });
  };

  useEffect(() => {
    // Set default values from API response
    const defaults: Record<string, string | string[]> = {};
    parameters.forEach(param => {
      if (param.DefaultValues?.length) {
        const isMultiValue = param.ElementType === 'MultiValue' || param.MultiValue;
        defaults[param.Name] = isMultiValue 
          ? param.DefaultValues 
          : param.DefaultValues[0];
      } else if (param.AvailableValues?.length) {
        // Check for pre-selected values
        const selectedValues = param.AvailableValues
          .filter(av => av.IsSelected)
          .map(av => av.ValueField);
        if (selectedValues.length > 0) {
          const isMultiValue = param.ElementType === 'MultiValue' || param.MultiValue;
          defaults[param.Name] = isMultiValue ? selectedValues : selectedValues[0];
        }
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

  // Get available values - support both new and legacy format
  // Filter out any options with empty values to prevent Select.Item errors
  const getAvailableOptions = (param: ReportParameter): { label: string; value: string }[] => {
    if (param.AvailableValues?.length) {
      return param.AvailableValues
        .filter(av => av.ValueField && av.ValueField.trim() !== '')
        .map(av => ({
          label: av.DisplayField || av.ValueField,
          value: av.ValueField,
        }));
    }
    if (param.ValidValues?.length) {
      return param.ValidValues
        .filter(vv => vv.Value && vv.Value.trim() !== '')
        .map(vv => ({
          label: vv.Label || vv.Value,
          value: vv.Value,
        }));
    }
    return [];
  };

  const isMultiValue = (param: ReportParameter) => 
    param.ElementType === 'MultiValue' || param.MultiValue;

  const isRequired = (param: ReportParameter) => 
    !param.AllowNull && !param.AllowBlank;

  return (
    <div className="space-y-4">
      {visibleParams.map((param) => {
        const options = getAvailableOptions(param);
        const multiValue = isMultiValue(param);
        const currentValues = Array.isArray(values[param.Name]) 
          ? values[param.Name] as string[] 
          : values[param.Name] ? [String(values[param.Name])] : [];

        return (
          <div key={param.Name} className="space-y-2">
            <Label htmlFor={param.Name} className="text-sm font-medium">
              {param.Prompt || param.Name}
              {isRequired(param) && <span className="text-destructive ml-1">*</span>}
            </Label>

            {options.length > 0 && multiValue ? (
              // Multi-select with checkboxes
              <div className="space-y-2 pl-1 max-h-48 overflow-y-auto border rounded-md p-3 bg-background">
                {options.map((option) => (
                  <div key={option.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`${param.Name}-${option.value}`}
                      checked={currentValues.includes(option.value)}
                      onCheckedChange={(checked) => 
                        handleMultiValueChange(param.Name, option.value, checked === true)
                      }
                    />
                    <Label 
                      htmlFor={`${param.Name}-${option.value}`} 
                      className="text-sm font-normal cursor-pointer"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            ) : options.length > 0 ? (
              // Single-select dropdown
              <Select
                value={String(values[param.Name] || '')}
                onValueChange={(value) => handleChange(param.Name, value)}
              >
                <SelectTrigger id={param.Name}>
                  <SelectValue placeholder="Selecione uma opção" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
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
        );
      })}
    </div>
  );
}
