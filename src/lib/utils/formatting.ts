export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export const formatNumber = (number: number, options?: Intl.NumberFormatOptions): string => {
  return new Intl.NumberFormat('en-US', options).format(number);
};

export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${(value * 100).toFixed(decimals)}%`;
};

export const formatDate = (
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric'
  }
): string => {
  const dateObj = new Date(date);
  return new Intl.DateTimeFormat('en-US', options).format(dateObj);
};

export const formatMonthYear = (date: Date | string | number): string => {
  const dateObj = new Date(date);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: '2-digit'
  }).format(dateObj);
};

export const formatLongDate = (date: Date | string | number): string => {
  const dateObj = new Date(date);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(dateObj);
};

export const formatDateTime = (date: Date | string | number): string => {
  const dateObj = new Date(date);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    timeZone: 'America/Los_Angeles'
  }).format(dateObj);
};

export const formatFullDateTime = (date: Date | string | number): string => {
  const dateObj = new Date(date);
  const dateStr = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(dateObj);
  const timeStr = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    timeZone: 'America/Los_Angeles'
  }).format(dateObj);
  return `${dateStr} at ${timeStr}`;
};
