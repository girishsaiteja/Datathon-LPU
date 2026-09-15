"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_DATE_FROM, DEFAULT_DATE_TO } from "@/lib/constants";
import {
  DATE_RANGE_COOKIE,
  DATE_RANGE_EVENT,
  DATE_RANGE_STORAGE_KEY,
  clampDateRange,
  parseDateRangeToken,
  serializeDateRangeCookie,
} from "@/lib/date-range-storage";
import type { DateRange } from "@/lib/types";

function readStored(): DateRange | null {
  if (typeof window === "undefined") return null;
  try {
    return parseDateRangeToken(window.localStorage.getItem(DATE_RANGE_STORAGE_KEY));
  } catch {
    return null;
  }
}

function persist(range: DateRange) {
  try {
    window.localStorage.setItem(DATE_RANGE_STORAGE_KEY, JSON.stringify(range));
    document.cookie = `${DATE_RANGE_COOKIE}=${serializeDateRangeCookie(range)}; Path=/; Max-Age=31536000; SameSite=Lax`;
    window.dispatchEvent(new Event(DATE_RANGE_EVENT));
  } catch {
    /* ignore quota / private mode */
  }
}

const DateRangeContext = createContext<{
  date: DateRange;
  setDate: (next: DateRange) => void;
} | null>(null);

export function DateRangeProvider({
  children,
  initialDate,
}: {
  children: ReactNode;
  initialDate?: DateRange;
}) {
  const [date, setDateState] = useState<DateRange>(
    initialDate ?? { from: DEFAULT_DATE_FROM, to: DEFAULT_DATE_TO },
  );

  useLayoutEffect(() => {
    const stored = readStored();
    if (stored) {
      setDateState(stored);
      persist(stored);
    }

    function syncFromStore() {
      const next = readStored();
      if (next) setDateState(next);
    }

    window.addEventListener("storage", syncFromStore);
    window.addEventListener(DATE_RANGE_EVENT, syncFromStore);
    return () => {
      window.removeEventListener("storage", syncFromStore);
      window.removeEventListener(DATE_RANGE_EVENT, syncFromStore);
    };
  }, []);

  const setDate = useCallback((next: DateRange) => {
    const clamped = clampDateRange(next);
    setDateState(clamped);
    persist(clamped);
  }, []);

  const value = useMemo(() => ({ date, setDate }), [date, setDate]);
  return createElement(DateRangeContext.Provider, { value }, children);
}

export function useDateRange() {
  const ctx = useContext(DateRangeContext);
  if (!ctx) {
    throw new Error("useDateRange must be used within DateRangeProvider");
  }
  return ctx;
}
