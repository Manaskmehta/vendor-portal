"use client";

import { useCallback, useRef, useState } from "react";

export function useSubmitLock() {
  const lockRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const withSubmitLock = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (lockRef.current) return undefined;
    lockRef.current = true;
    setIsSubmitting(true);
    try {
      return await fn();
    } finally {
      lockRef.current = false;
      setIsSubmitting(false);
    }
  }, []);

  return { isSubmitting, withSubmitLock };
}
