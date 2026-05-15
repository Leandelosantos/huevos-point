import { useEffect, useRef, useCallback } from 'react';

const TIMEOUT_MS = 60 * 60 * 1000; // 1 hora

// Eventos que cuentan como actividad real (no incluye mousemove)
const ACTIVITY_EVENTS = ['click', 'keydown', 'scroll', 'touchstart'];

/**
 * Cierra sesión automáticamente tras TIMEOUT_MS de inactividad.
 * Solo resetea el timer ante interacciones reales (click, teclado, scroll, touch).
 *
 * @param {boolean} isAuthenticated - Si hay sesión activa
 * @param {Function} onExpire - Función a llamar cuando se agota el tiempo
 */
const useInactivityTimer = ({ isAuthenticated, onExpire }) => {
  const timerRef = useRef(null);
  const onExpireRef = useRef(onExpire);

  // Mantener ref actualizada sin re-crear el handler
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onExpireRef.current(), TIMEOUT_MS);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    // Arrancar el timer al autenticarse
    resetTimer();

    ACTIVITY_EVENTS.forEach((ev) =>
      window.addEventListener(ev, resetTimer, { passive: true })
    );

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((ev) =>
        window.removeEventListener(ev, resetTimer)
      );
    };
  }, [isAuthenticated, resetTimer]);
};

export default useInactivityTimer;
