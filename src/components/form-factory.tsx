import { useState, useCallback } from "react";

type TextField = {
  name: string;
  label: string;
  type: "text";
  required?: boolean;
  placeholder?: string;
};

type NumberField = {
  name: string;
  label: string;
  type: "number";
  required?: boolean;
  placeholder?: string;
};

type SelectField = {
  name: string;
  label: string;
  type: "select";
  options: { label: string; value: string }[];
  required?: boolean;
  placeholder?: string;
};

type RadioField = {
  name: string;
  label: string;
  type: "radio";
  options: { label: string; value: string }[];
  required?: boolean;
};

export type FormField = TextField | NumberField | SelectField | RadioField;

export type FormConfig = {
  fields: FormField[];
  submitLabel: string;
  resetLabel?: string;
};

export function useFormFactory(config: FormConfig) {
  const initial: Record<string, string> = {};
  for (const f of config.fields) initial[f.name] = "";

  const [values, setValues] = useState(initial);

  const setValue = useCallback((name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const reset = useCallback(() => setValues(initial), []);

  const isValid = config.fields
    .filter((f) => f.required)
    .every((f) => values[f.name]?.trim() !== "");

  return { values, setValue, reset, isValid };
}

export function FormFactory({
  config,
  values,
  setValue,
  onSubmit,
  onReset,
  isValid,
  isPending,
}: {
  config: FormConfig;
  values: Record<string, string>;
  setValue: (name: string, value: string) => void;
  onSubmit: () => void;
  onReset?: () => void;
  isValid: boolean;
  isPending: boolean;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-5"
    >
      {config.fields.map((field) => (
        <FieldRenderer
          key={field.name}
          field={field}
          value={values[field.name] ?? ""}
          onChange={(v) => setValue(field.name, v)}
        />
      ))}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={!isValid || isPending}
          className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 active:bg-brand-800 disabled:opacity-40 transition-colors"
        >
          {isPending ? "…" : config.submitLabel}
        </button>
        {config.resetLabel && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
          >
            {config.resetLabel}
          </button>
        )}
      </div>
    </form>
  );
}

function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: string;
  onChange: (v: string) => void;
}) {
  const labelEl = (
    <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wider">
      {field.label}
      {field.required && <span className="ml-0.5 text-brand-600">*</span>}
    </label>
  );

  switch (field.type) {
    case "text":
    case "number":
      return (
        <div>
          {labelEl}
          <input
            type={field.type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/10 focus:outline-none transition-all"
          />
        </div>
      );
    case "select":
      return (
        <div>
          {labelEl}
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/10 focus:outline-none transition-all"
          >
            <option value="">{field.placeholder ?? "Select…"}</option>
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      );
    case "radio":
      return (
        <div>
          {labelEl}
          <div className="flex flex-wrap gap-2">
            {field.options.map((o) => (
              <label
                key={o.value}
                className={`cursor-pointer rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                  value === o.value
                    ? "border-brand-600 bg-brand-50 text-brand-600 shadow-sm"
                    : "border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                <input
                  type="radio"
                  name={field.name}
                  value={o.value}
                  checked={value === o.value}
                  onChange={() => onChange(o.value)}
                  className="sr-only"
                />
                {o.label}
              </label>
            ))}
          </div>
        </div>
      );
  }
}
