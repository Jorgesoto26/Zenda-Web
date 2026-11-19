// src/utils/utilities.js
// Funciones matemáticas, formateo monetario (fintech) y utilidades de Zendapp

export const NumberWithCommas = (value) => {
  if (value === null || value === undefined) return '0';
  const parts = String(value).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

export const NumberWithCommasDecimales = (value) => {
  const numericValue = parseFloat(String(value).replace(/[$,]/g, '').trim());
  if (isNaN(numericValue)) return '0';
  if (numericValue % 1 === 0) {
    return numericValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  return numericValue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export const FormatMoney = (value) => {
  const n = Number(value) || 0;
  if (n < 0) {
    return '$ -' + NumberWithCommas(Math.abs(n));
  }
  return '$ ' + NumberWithCommas(n);
};

export const FormatMoneyDecimales = (value) => {
  const numericValue = parseFloat(String(value).replace(/[$,]/g, '').trim());
  if (isNaN(numericValue)) return '$ 0';
  return '$ ' + NumberWithCommasDecimales(numericValue);
};

export const cleanMoneyValue = (value) => {
  if (value === null || value === undefined) return '';
  const digits = String(value).replace(/\D/g, '');
  return digits.replace(/^0+/, '');
};

export const formatMoneyInput = (value, withSymbol = true) => {
  const clean = cleanMoneyValue(value);
  if (!clean) return '';
  const formatted = clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return withSymbol ? `$ ${formatted}` : formatted;
};

export const parseMoneyToNumeric = (value) => {
  const clean = cleanMoneyValue(value);
  return clean ? parseFloat(clean) : 0;
};

export const Capitalize = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const getAndIncrementConsecutivo = (key = 'consecutivo_factura') => {
  const current = Number(localStorage.getItem(key)) || 1000;
  const next = current + 1;
  localStorage.setItem(key, String(next));
  return current;
};

