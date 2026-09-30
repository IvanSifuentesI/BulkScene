import { useCallback, useEffect, useState, useRef } from 'react';

type SetValue<T> = (value: T | ((val: T) => T)) => void;

export function useLocalStorage<T>(key: string, initialValue: T): [T, SetValue<T>] {
  // Use ref to keep initialValue stable without adding it to effect dependencies
  // This prevents the hook from resetting if the initialValue object reference changes across renders
  const initialRef = useRef(initialValue);

  // Only read from localStorage once on mount
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') return initialRef.current;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialRef.current;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialRef.current;
    }
  }, [key]);

  // State to store our value
  // Pass the initialization function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(() => readValue());

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue = useCallback<SetValue<T>>(
    (value) => {
      // Prevent unnecessary state updates if value hasn't changed (optional but good practice)
      setStoredValue((currentValue) => {
        // Allow value to be a function so we have same API as useState
        const valueToStore = value instanceof Function ? value(currentValue) : value;
        
        if (typeof window !== 'undefined') {
            try {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            } catch (error) {
                console.warn(`Error saving to localStorage key "${key}":`, error);
            }
        }

        return valueToStore;
      });
    },
    [key]
  );

  // Listen for changes to this local storage key from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key) {
        if (e.newValue === null) {
            // Key was removed
            setStoredValue(initialRef.current);
        } else {
            try {
                setStoredValue(JSON.parse(e.newValue));
            } catch (error) {
                console.warn(`Error parsing storage event for key "${key}":`, error);
            }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue];
}

export default useLocalStorage;