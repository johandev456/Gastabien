import type { Category, CategorySummary, Transaction } from '../types';

/** Dominican Republic time zone (UTC-4 all year). */
export const DR_TIME_ZONE = 'America/Santo_Domingo';
const DR_OFFSET_MS = -4 * 3600 * 1000;
export const DEFAULT_USD_RATE = 60;

const moneyFormatters: Record<string, Intl.NumberFormat> = {};

/** Formats money consistently: RD$1,234,567.50 / US$15.99 */
export function formatMoney(amount: number, currency: 'DOP' | 'USD' | string = 'DOP', opts: { decimals?: boolean } = {}): string {
  const decimals = opts.decimals ?? true;
  const key = `${currency}-${decimals}`;
  if (!moneyFormatters[key]) {
    moneyFormatters[key] = new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : 'DOP',
      minimumFractionDigits: decimals ? 2 : 0,
      maximumFractionDigits: decimals ? 2 : 0
    });
  }
  return moneyFormatters[key].format(Number.isFinite(amount) ? amount : 0);
}

/** Compact amount for chart axes / tight spaces: RD$950, RD$12.5K, RD$1.5M */
export function formatShort(amount: number, currency: 'DOP' | 'USD' = 'DOP'): string {
  const prefix = currency === 'USD' ? 'US$' : 'RD$';
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  const fmt = (n: number) => n.toLocaleString('es-DO', { maximumFractionDigits: 1 });
  if (abs >= 1_000_000) return `${sign}${prefix}${fmt(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}${prefix}${fmt(abs / 1_000)}K`;
  return `${sign}${prefix}${Math.round(abs).toLocaleString('es-DO')}`;
}

export function formatPercent(value: number, decimals = 1): string {
  return `${(Number.isFinite(value) ? value : 0).toLocaleString('es-DO', { minimumFractionDigits: 0, maximumFractionDigits: decimals })}%`;
}

/** Amount converted to DOP using the backend value when present. */
export function amountInDop(tx: Pick<Transaction, 'amount' | 'currency' | 'amountInDop'>, usdRate = DEFAULT_USD_RATE): number {
  if (typeof tx.amountInDop === 'number') return tx.amountInDop;
  return tx.currency === 'USD' ? tx.amount * usdRate : tx.amount;
}

/** YYYY-MM-DD of a date in DR local time. */
export function drDayKey(date: Date | string = new Date()): string {
  const t = new Date(date).getTime();
  if (isNaN(t)) return typeof date === 'string' ? date.substring(0, 10) : '';
  return new Date(t + DR_OFFSET_MS).toISOString().substring(0, 10);
}

/** YYYY-MM of a date in DR local time. */
export function drMonthKey(date: Date | string = new Date()): string {
  return drDayKey(date).substring(0, 7);
}

const dateFormatter = new Intl.DateTimeFormat('es-DO', { timeZone: DR_TIME_ZONE, day: '2-digit', month: 'short', year: 'numeric' });
const dateTimeFormatter = new Intl.DateTimeFormat('es-DO', { timeZone: DR_TIME_ZONE, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

/** "31 ene 2026" in DR time. */
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date || '');
  return dateFormatter.format(d).replace('.', '');
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date || '');
  return dateTimeFormatter.format(d);
}

/** "hace 5 min", "hace 2 h", "hace 3 días" */
export function formatRelative(date?: string | null): string {
  if (!date) return 'nunca';
  const t = new Date(date).getTime();
  if (isNaN(t)) return 'desconocido';
  const diff = Math.max(0, Date.now() - t);
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'justo ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d} ${d === 1 ? 'día' : 'días'}`;
  return formatDate(date);
}

const SPANISH_MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const SPANISH_MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** "2026-09" -> "Septiembre 2026"; 'ALL' -> "Todos los Meses" */
export function formatMonthLabel(monthKey: string, short = false): string {
  if (!monthKey || monthKey === 'ALL') return 'Todos los Meses';
  const [year, month] = monthKey.split('-');
  const idx = parseInt(month, 10) - 1;
  if (!year || isNaN(idx) || idx < 0 || idx > 11) return monthKey;
  return short ? `${SPANISH_MONTHS_SHORT[idx]} ${year.slice(2)}` : `${SPANISH_MONTHS[idx]} ${year}`;
}

/** Same palette as the backend's CATEGORY_COLORS so every chart agrees. */
export const CATEGORY_COLORS: Record<Category, string> = {
  'Combustible': '#EF4444',
  'Supermercados': '#10B981',
  'Restaurantes y Comida': '#F97316',
  'Bares y Vida Nocturna': '#D500F9',
  'Entretenimiento y Suscripciones': '#8B5CF6',
  'Servicios y Facturas': '#3B82F6',
  'Salud y Farmacias': '#06B6D4',
  'Compras y Retail': '#EC4899',
  'Transporte y Viajes': '#F59E0B',
  'Transferencias y Pagos': '#64748B',
  'Retiro de Efectivo': '#6366F1',
  'Ingresos y Nómina': '#22C55E',
  'Otros Gastos': '#94A3B8'
};

export const CATEGORY_ICONS: Record<Category, string> = {
  'Combustible': 'local_gas_station',
  'Supermercados': 'shopping_cart',
  'Restaurantes y Comida': 'restaurant',
  'Bares y Vida Nocturna': 'nightlife',
  'Entretenimiento y Suscripciones': 'subscriptions',
  'Servicios y Facturas': 'receipt_long',
  'Salud y Farmacias': 'local_pharmacy',
  'Compras y Retail': 'shopping_bag',
  'Transporte y Viajes': 'directions_car',
  'Transferencias y Pagos': 'swap_horiz',
  'Retiro de Efectivo': 'atm',
  'Ingresos y Nómina': 'payments',
  'Otros Gastos': 'sell'
};

const FALLBACK_COLORS = ['#38BDF8', '#A3E635', '#FB7185', '#FBBF24', '#C084FC', '#2DD4BF'];

/** Stable color per category: backend color > fixed map > hash of the name (never by position). */
export function getCategoryColor(category: string, summary?: CategorySummary[]): string {
  const fromSummary = summary?.find(c => c.category === category)?.color;
  if (fromSummary) return fromSummary;
  const fixed = CATEGORY_COLORS[category as Category];
  if (fixed) return fixed;
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
}

export function getCategoryIcon(category: string): string {
  return CATEGORY_ICONS[category as Category] || 'sell';
}

export const ALL_CATEGORIES = Object.keys(CATEGORY_COLORS) as Category[];

/** Visual sign/color per transaction type (transfers are neutral, never income). */
export function typeVisual(type: string): { sign: string; className: string; icon: string; label: string } {
  if (type === 'INCOME') return { sign: '+', className: 'text-secondary', icon: 'arrow_downward', label: 'Ingreso' };
  if (type === 'TRANSFER') return { sign: '', className: 'text-on-surface-variant', icon: 'swap_horiz', label: 'Transferencia' };
  return { sign: '-', className: 'text-error', icon: 'arrow_upward', label: 'Gasto' };
}
