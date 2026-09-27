'use client';

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from './Field';

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, 'type' | 'rightSlot'>;

/** Campo de contraseña con un botón para ver u ocultar lo que se está escribiendo. */
export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>((props, ref) => {
  const [visible, setVisible] = useState(false);

  return (
    <Input
      {...props}
      ref={ref}
      type={visible ? 'text' : 'password'}
      autoComplete={props.autoComplete ?? 'off'}
      rightSlot={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
          className="rounded-lg p-1 text-slate-500 transition-colors hover:text-role-ink"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      }
    />
  );
});
PasswordInput.displayName = 'PasswordInput';
