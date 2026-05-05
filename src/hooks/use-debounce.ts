import { useEffect, useState } from 'react';

/**
 * Debounces a value by the given delay (ms).
 * Returns the debounced value which only updates after the caller
 * stops changing the input for `delay` milliseconds.
 */
export function useDebounce<T>(value: T, delay = 400): T {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(id);
    }, [value, delay]);

    return debounced;
}
