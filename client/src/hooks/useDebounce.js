import { useEffect, useState } from 'react';

// Returns the value only after it stopped changing for `delay` ms,
// so the search box does not call the server on every keystroke.
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
