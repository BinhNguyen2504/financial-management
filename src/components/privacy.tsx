"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Eye, EyeOff } from "lucide-react";
import { money } from "@/features/expenses/format";

const STORAGE_KEY = "fm-privacy";
const PrivacyContext = createContext({
  hidden: true,
  ready: false,
  revision: 0,
  toggle: () => {},
});
const ScopeContext = createContext<boolean | null>(null);
const RevealContext = createContext<{
  available: boolean;
  disabled: boolean;
  reveal: () => void;
}>({ available: false, disabled: true, reveal: () => {} });

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState({
    hidden: true,
    ready: false,
    revision: 0,
  });
  useEffect(() => {
    let hidden = false;
    try {
      hidden = localStorage.getItem(STORAGE_KEY) === "hidden";
    } catch {
      /* Use the preference for this session. */
    }
    setState({ hidden, ready: true, revision: 0 });
    const sync = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null)
        setState((s) => ({
          hidden: event.newValue === "hidden",
          ready: true,
          revision: s.revision + 1,
        }));
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  function toggle() {
    const hidden = !state.hidden;
    setState((s) => ({ hidden, ready: true, revision: s.revision + 1 }));
    try {
      localStorage.setItem(STORAGE_KEY, hidden ? "hidden" : "visible");
    } catch {
      /* The button still works without storage. */
    }
  }
  return (
    <PrivacyContext.Provider value={{ ...state, toggle }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function PrivacyToggle() {
  const { hidden, ready, toggle } = useContext(PrivacyContext);
  const Icon = hidden ? EyeOff : Eye;
  return (
    <button
      type="button"
      className="privacy-toggle"
      onClick={toggle}
      disabled={!ready}
      aria-pressed={hidden}
      aria-label={hidden ? "Hiện số tiền" : "Ẩn số tiền"}
    >
      <Icon size={19} aria-hidden="true" />
      <span>{hidden ? "Hiện số tiền" : "Ẩn số tiền"}</span>
    </button>
  );
}

export function useMoneyHidden() {
  const global = useContext(PrivacyContext);
  const scope = useContext(ScopeContext);
  return scope ?? global.hidden;
}

export function useMoney() {
  const hidden = useMoneyHidden();
  return (value: string) => (hidden ? "•••••• ₫" : money(value));
}

export function MoneyText({ value }: { value: string }) {
  const format = useMoney();
  return <span className="money-text">{format(value)}</span>;
}

export function PrivacyScope({ children }: { children: ReactNode }) {
  const { hidden, ready, revision } = useContext(PrivacyContext);
  const [reveal, setReveal] = useState<number | null>(null);
  useEffect(() => {
    const conceal = () => setReveal(null);
    document.addEventListener("visibilitychange", conceal);
    window.addEventListener("blur", conceal);
    return () => {
      document.removeEventListener("visibilitychange", conceal);
      window.removeEventListener("blur", conceal);
    };
  }, []);
  const scopedHidden = hidden && (!ready || reveal !== revision);
  return (
    <ScopeContext.Provider value={scopedHidden}>
      <RevealContext.Provider
        value={{
          available: hidden,
          disabled: !ready,
          reveal: () => setReveal(scopedHidden ? revision : null),
        }}
      >
        {children}
      </RevealContext.Provider>
    </ScopeContext.Provider>
  );
}

export function PrivacyReveal() {
  const scope = useContext(RevealContext);
  const hidden = useMoneyHidden();
  if (!scope.available) return null;
  const Icon = hidden ? Eye : EyeOff;
  return (
    <div className="privacy-form-note">
      <span>Số tiền được giữ riêng trong form này.</span>
      <button
        type="button"
        className="expense-secondary"
        disabled={scope.disabled}
        aria-pressed={!hidden}
        onClick={scope.reveal}
      >
        <Icon size={17} aria-hidden="true" />
        {hidden ? "Hiện tiền trong form" : "Ẩn tiền trong form"}
      </button>
    </div>
  );
}
