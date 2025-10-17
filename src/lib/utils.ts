import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Suppress hydration warnings caused by browser extensions
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Hydration failed') ||
       args[0].includes('hydrated but some attributes') ||
       args[0].includes('bis_skin_checked'))
    ) {
      return;
    }
    originalError.apply(console, args);
  };
}
