'use client';

import { useEffect, useState } from 'react';

import { Input } from '@/components/ui/Input';

type DebouncedInputProps = {
  value: string;
  onChange: (value: string) => void;
  delay?: number;
} & React.ComponentProps<'input'>;

export function DebouncedInput({ value, onChange, delay = 300, ...props }: DebouncedInputProps) {
  const [internal, setInternal] = useState(value);

  // keep in sync if parent changes value
  useEffect(() => {
    setInternal(value);
  }, [value]);

  // debounce emission
  useEffect(() => {
    const id = setTimeout(() => {
      onChange(internal);
    }, delay);

    return () => clearTimeout(id);
  }, [internal, delay, onChange]);

  return <Input {...props} value={internal} onChange={e => setInternal(e.target.value)} />;
}
