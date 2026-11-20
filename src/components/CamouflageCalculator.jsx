// src/components/CamouflageCalculator.jsx
import React, { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Calculadora de Camuflaje / Despiste
 * Disfraza a Zendapp de calculadora estándar completamente funcional.
 * Salida secreta: clic sostenido (800ms) o doble clic en la pantalla de resultados o en el botón '='.
 */
export default function CamouflageCalculator({ onExit }) {
  const [displayValue, setDisplayValue] = useState('0');
  const [prevValue, setPrevValue] = useState(null);
  const [operation, setOperation] = useState(null);
  const [clearOnNextDigit, setClearOnNextDigit] = useState(false);
  const [expression, setExpression] = useState('');

  const longPressTimerRef = useRef(null);

  const handleDigit = useCallback((digit) => {
    setDisplayValue((prev) => {
      if (clearOnNextDigit || prev === '0') {
        setClearOnNextDigit(false);
        return String(digit);
      }
      if (prev.length >= 12) return prev;
      return prev + digit;
    });
  }, [clearOnNextDigit]);

  const handleDecimal = useCallback(() => {
    setDisplayValue((prev) => {
      if (clearOnNextDigit) {
        setClearOnNextDigit(false);
        return '0.';
      }
      if (prev.includes('.')) return prev;
      return prev + '.';
    });
  }, [clearOnNextDigit]);

  const handleClear = useCallback(() => {
    setDisplayValue('0');
    setPrevValue(null);
    setOperation(null);
    setClearOnNextDigit(false);
    setExpression('');
  }, []);

  const handleToggleSign = useCallback(() => {
    setDisplayValue((prev) => {
      if (prev === '0') return '0';
      return prev.startsWith('-') ? prev.slice(1) : '-' + prev;
    });
  }, []);

  const handlePercentage = useCallback(() => {
    setDisplayValue((prev) => {
      const num = parseFloat(prev);
      if (isNaN(num)) return '0';
      return String(num / 100);
    });
  }, []);

  const compute = (a, b, op) => {
    const numA = parseFloat(a);
    const numB = parseFloat(b);
    if (isNaN(numA) || isNaN(numB)) return '0';
    let res = 0;
    switch (op) {
      case '+':
        res = numA + numB;
        break;
      case '−':
      case '-':
        res = numA - numB;
        break;
      case '×':
      case '*':
        res = numA * numB;
        break;
      case '÷':
      case '/':
        res = numB === 0 ? 'Error' : numA / numB;
        break;
      default:
        return b;
    }
    if (res === 'Error') return 'Error';
    const rounded = Math.round(res * 100000000) / 100000000;
    return String(rounded);
  };

  const handleOperation = useCallback(
    (op) => {
      if (prevValue !== null && operation && !clearOnNextDigit) {
        const res = compute(prevValue, displayValue, operation);
        setDisplayValue(res);
        setPrevValue(res);
        setExpression(`${res} ${op}`);
      } else {
        setPrevValue(displayValue);
        setExpression(`${displayValue} ${op}`);
      }
      setOperation(op);
      setClearOnNextDigit(true);
    },
    [displayValue, prevValue, operation, clearOnNextDigit]
  );

  const handleEquals = useCallback(() => {
    if (prevValue === null || !operation) return;
    const res = compute(prevValue, displayValue, operation);
    setExpression(`${prevValue} ${operation} ${displayValue} =`);
    setDisplayValue(res);
    setPrevValue(null);
    setOperation(null);
    setClearOnNextDigit(true);
  }, [prevValue, displayValue, operation]);

  // Salida secreta mediante pulsación prolongada
  const startLongPress = () => {
    longPressTimerRef.current = setTimeout(() => {
      if (onExit) onExit();
    }, 800);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  // Soporte para teclado físico
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(parseInt(e.key, 10));
      } else if (e.key === '.') {
        handleDecimal();
      } else if (e.key === '+' || e.key === '-') {
        handleOperation(e.key === '-' ? '−' : '+');
      } else if (e.key === '*') {
        handleOperation('×');
      } else if (e.key === '/') {
        handleOperation('÷');
      } else if (e.key === 'Enter' || e.key === '=') {
        handleEquals();
      } else if (e.key === 'Backspace') {
        setDisplayValue((prev) => (prev.length <= 1 || prev === '0' ? '0' : prev.slice(0, -1)));
      } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDigit, handleDecimal, handleOperation, handleEquals, handleClear]);

  return (
    <div className="w-full min-h-screen bg-[#17171C] text-white flex flex-col justify-between p-4 max-w-[440px] mx-auto select-none font-sans">
      {/* Visor de la Calculadora */}
      <div
        className="flex-1 flex flex-col justify-end items-end px-3 py-6 cursor-pointer"
        onMouseDown={startLongPress}
        onMouseUp={cancelLongPress}
        onTouchStart={startLongPress}
        onTouchEnd={cancelLongPress}
        onDoubleClick={onExit}
        title="Doble clic para salir del modo camuflaje"
      >
        <div className="text-sm font-medium text-slate-400 mb-1 tracking-wide h-6">
          {expression}
        </div>
        <div
          className={`font-light tracking-tight text-right overflow-hidden break-all ${
            displayValue.length > 9 ? 'text-4xl' : 'text-6xl'
          }`}
        >
          {displayValue}
        </div>
      </div>

      {/* Teclado */}
      <div className="grid grid-cols-4 gap-3 pb-6">
        {/* Fila 1 */}
        <button
          type="button"
          onClick={handleClear}
          className="h-18 rounded-3xl bg-[#4E505F] hover:bg-[#5E6070] text-xl font-semibold transition-all active:scale-95 cursor-pointer"
        >
          C
        </button>
        <button
          type="button"
          onClick={handleToggleSign}
          className="h-18 rounded-3xl bg-[#4E505F] hover:bg-[#5E6070] text-xl font-semibold transition-all active:scale-95 cursor-pointer"
        >
          +/-
        </button>
        <button
          type="button"
          onClick={handlePercentage}
          className="h-18 rounded-3xl bg-[#4E505F] hover:bg-[#5E6070] text-xl font-semibold transition-all active:scale-95 cursor-pointer"
        >
          %
        </button>
        <button
          type="button"
          onClick={() => handleOperation('÷')}
          className={`h-18 rounded-3xl text-2xl font-bold transition-all active:scale-95 cursor-pointer ${
            operation === '÷'
              ? 'bg-white text-[#EE272D]'
              : 'bg-[#EE272D] hover:bg-[#D81E24] text-white'
          }`}
        >
          ÷
        </button>

        {/* Fila 2 */}
        <button
          type="button"
          onClick={() => handleDigit(7)}
          className="h-18 rounded-3xl bg-[#2E2F38] hover:bg-[#3E3F4A] text-2xl font-medium transition-all active:scale-95 cursor-pointer"
        >
          7
        </button>
        <button
          type="button"
          onClick={() => handleDigit(8)}
          className="h-18 rounded-3xl bg-[#2E2F38] hover:bg-[#3E3F4A] text-2xl font-medium transition-all active:scale-95 cursor-pointer"
        >
          8
        </button>
        <button
          type="button"
          onClick={() => handleDigit(9)}
          className="h-18 rounded-3xl bg-[#2E2F38] hover:bg-[#3E3F4A] text-2xl font-medium transition-all active:scale-95 cursor-pointer"
        >
          9
        </button>
        <button
          type="button"
          onClick={() => handleOperation('×')}
          className={`h-18 rounded-3xl text-2xl font-bold transition-all active:scale-95 cursor-pointer ${
            operation === '×'
              ? 'bg-white text-[#EE272D]'
              : 'bg-[#EE272D] hover:bg-[#D81E24] text-white'
          }`}
        >
          ×
        </button>

        {/* Fila 3 */}
        <button
          type="button"
          onClick={() => handleDigit(4)}
          className="h-18 rounded-3xl bg-[#2E2F38] hover:bg-[#3E3F4A] text-2xl font-medium transition-all active:scale-95 cursor-pointer"
        >
          4
        </button>
        <button
          type="button"
          onClick={() => handleDigit(5)}
          className="h-18 rounded-3xl bg-[#2E2F38] hover:bg-[#3E3F4A] text-2xl font-medium transition-all active:scale-95 cursor-pointer"
        >
          5
        </button>
        <button
          type="button"
          onClick={() => handleDigit(6)}
          className="h-18 rounded-3xl bg-[#2E2F38] hover:bg-[#3E3F4A] text-2xl font-medium transition-all active:scale-95 cursor-pointer"
        >
          6
        </button>
        <button
          type="button"
          onClick={() => handleOperation('−')}
          className={`h-18 rounded-3xl text-2xl font-bold transition-all active:scale-95 cursor-pointer ${
            operation === '−'
              ? 'bg-white text-[#EE272D]'
              : 'bg-[#EE272D] hover:bg-[#D81E24] text-white'
          }`}
        >
          −
        </button>

        {/* Fila 4 */}
        <button
          type="button"
          onClick={() => handleDigit(1)}
          className="h-18 rounded-3xl bg-[#2E2F38] hover:bg-[#3E3F4A] text-2xl font-medium transition-all active:scale-95 cursor-pointer"
        >
          1
        </button>
        <button
          type="button"
          onClick={() => handleDigit(2)}
          className="h-18 rounded-3xl bg-[#2E2F38] hover:bg-[#3E3F4A] text-2xl font-medium transition-all active:scale-95 cursor-pointer"
        >
          2
        </button>
        <button
          type="button"
          onClick={() => handleDigit(3)}
          className="h-18 rounded-3xl bg-[#2E2F38] hover:bg-[#3E3F4A] text-2xl font-medium transition-all active:scale-95 cursor-pointer"
        >
          3
        </button>
        <button
          type="button"
          onClick={() => handleOperation('+')}
          className={`h-18 rounded-3xl text-2xl font-bold transition-all active:scale-95 cursor-pointer ${
            operation === '+'
              ? 'bg-white text-[#EE272D]'
              : 'bg-[#EE272D] hover:bg-[#D81E24] text-white'
          }`}
        >
          +
        </button>

        {/* Fila 5 */}
        <button
          type="button"
          onClick={() => handleDigit(0)}
          className="col-span-2 h-18 rounded-3xl bg-[#2E2F38] hover:bg-[#3E3F4A] text-2xl font-medium pl-8 text-left transition-all active:scale-95 cursor-pointer"
        >
          0
        </button>
        <button
          type="button"
          onClick={handleDecimal}
          className="h-18 rounded-3xl bg-[#2E2F38] hover:bg-[#3E3F4A] text-2xl font-medium transition-all active:scale-95 cursor-pointer"
        >
          .
        </button>
        <button
          type="button"
          onClick={handleEquals}
          onMouseDown={startLongPress}
          onMouseUp={cancelLongPress}
          onTouchStart={startLongPress}
          onTouchEnd={cancelLongPress}
          className="h-18 rounded-3xl bg-[#EE272D] hover:bg-[#D81E24] text-2xl font-bold transition-all active:scale-95 cursor-pointer"
        >
          =
        </button>
      </div>
    </div>
  );
}
