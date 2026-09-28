import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: ReactNode;
  ref?: Ref<HTMLInputElement>;
  trailing?: ReactNode;
}

export function TextField({ label, error, hint, trailing, className = '', id, ref, ...inputProps }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-stone-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`block w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-stone-900 shadow-xs placeholder:text-stone-400 focus:outline-2 focus:outline-offset-0 ${
            error
              ? 'border-red-500 focus:outline-red-500'
              : 'border-stone-300 focus:border-brand-600 focus:outline-brand-600'
          } ${trailing ? 'pr-11' : ''}`}
          {...inputProps}
        />
        {trailing ? <div className="absolute inset-y-0 right-0 flex items-center pr-1.5">{trailing}</div> : null}
      </div>
      {hint ? (
        <div id={hintId} className="mt-1.5 text-xs text-stone-500">
          {hint}
        </div>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-xs font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
