import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";

interface DebouncedInputProps extends Omit<React.ComponentProps<"input">, "onChange"> {
  value: string | number;
  onDebouncedChange: (value: string | number) => void;
  debounce?: number;
  className?: string;
}

export function DebouncedInput({ 
  value: initialValue, 
  onDebouncedChange, 
  debounce = 300,
  className,
  ...props 
}: DebouncedInputProps) {
  const [value, setValue] = useState(initialValue);
  const isMounted = useRef(false);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (!isMounted.current) {
        isMounted.current = true;
        return;
    }
    
    const timeout = setTimeout(() => {
        onDebouncedChange(value);
    }, debounce);

    return () => clearTimeout(timeout);
  }, [value, debounce]);

  return (
    <Input
      {...props}
      value={value}
      className={className}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onDebouncedChange(value)} // Ensure save on blur/exit immediately
    />
  );
}