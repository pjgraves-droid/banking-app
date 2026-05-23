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
          className="rounded-lg bg-zinc-100 px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-40"
        >
          {isPending ? "…" : config.submitLabel}
        </button>
        {config.resetLabel && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="rounded-lg border border-zinc-700 px-5 py-2 text-sm font-medium text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
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
    <label className="mb-1.5 block text-xs font-medium text-zinc-400">
      {field.label}
      {field.required && <span className="ml-0.5 text-red-400">*</span>}
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
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
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
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
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
          <div className="flex flex-wrap gap-3">
            {field.options.map((o) => (
              <label
                key={o.value}
                className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm ${
                  value === o.value
                    ? "border-zinc-400 bg-zinc-800 text-zinc-100"
                    : "border-zinc-700 text-zinc-500 hover:border-zinc-600"
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
