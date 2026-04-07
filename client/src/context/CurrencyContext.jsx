import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const DOLLAR_API_URL = 'https://dolarapi.com/v1/dolares/oficial';
const SESSION_KEY = 'currency_pref';

const USD_FORMAT = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const ARS_FORMAT = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const CurrencyContext = createContext(null);

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrency] = useState(() => sessionStorage.getItem(SESSION_KEY) || 'ARS');
  const [rate, setRate] = useState(null);
  const [rateLoading, setRateLoading] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    setRateLoading(true);
    fetch(DOLLAR_API_URL)
      .then((res) => res.json())
      .then((data) => setRate(data.venta))
      .catch((err) => console.warn('[CurrencyContext] No se pudo obtener la cotización:', err.message))
      .finally(() => setRateLoading(false));
  }, []);

  const toggleCurrency = useCallback(() => {
    setCurrency((prev) => {
      const next = prev === 'ARS' ? 'USD' : 'ARS';
      sessionStorage.setItem(SESSION_KEY, next);
      return next;
    });
  }, []);

  const formatAmount = useCallback(
    (amount) => {
      const num = Number(amount) || 0;
      if (currency === 'USD' && rate) {
        return USD_FORMAT.format(num / rate);
      }
      return ARS_FORMAT.format(num);
    },
    [currency, rate]
  );

  return (
    <CurrencyContext.Provider value={{ currency, rate, rateLoading, toggleCurrency, formatAmount }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
};
