import { Check, Circle } from 'lucide-react';
import { PASSWORD_RULES } from '../auth.schemas';

export function PasswordChecklist({ password }: { password: string }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-1" aria-label="Requisitos de la contraseña">
      {PASSWORD_RULES.map((rule) => {
        const passed = rule.test(password);
        return (
          <li key={rule.id} className={`flex items-center gap-1.5 ${passed ? 'text-green-700' : 'text-stone-500'}`}>
            {passed ? <Check className="size-3.5" aria-hidden="true" /> : <Circle className="size-3" aria-hidden="true" />}
            <span>
              {rule.label}
              <span className="sr-only">{passed ? ' (cumplido)' : ' (pendiente)'}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
