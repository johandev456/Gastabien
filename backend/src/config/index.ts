import dotenv from 'dotenv';
import { BankConfig, Category } from '../types';

dotenv.config();

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://gastabien.vercel.app' : 'http://localhost:5173'),
  JWT_SECRET: process.env.JWT_SECRET || 'gastabien-super-secret-key-dr-2026',
  GOOGLE: {
    CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
    CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
    REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || (process.env.NODE_ENV === 'production' ? 'https://gastabien.onrender.com/api/auth/google/callback' : 'http://localhost:4000/api/auth/google/callback'),
  }
};

export const SUPPORTED_BANKS: Record<string, BankConfig> = {
  POPULAR: {
    code: 'POPULAR',
    name: 'Banco Popular Dominicano',
    color: '#003882',
    logo: 'https://img.icons8.com/color/96/bank.png',
    senders: ['notificaciones@bpd.com.do', 'servicioalcliente@bpd.com.do', 'bpd.com.do'],
    supportedTypes: ['EXPENSE', 'INCOME', 'TRANSFER']
  },
  BHD: {
    code: 'BHD',
    name: 'Banco BHD',
    color: '#008752',
    logo: 'https://img.icons8.com/color/96/bank-building.png',
    senders: ['alertas@bhd.com.do', 'notificaciones@bhdleon.com.do', 'bhd.com.do', 'bhdleon.com.do'],
    supportedTypes: ['EXPENSE', 'INCOME', 'TRANSFER']
  },
  PROMERICA: {
    code: 'PROMERICA',
    name: 'Banco Promerica',
    color: '#00965E',
    logo: 'https://img.icons8.com/fluency/96/bank.png',
    senders: ['notificaciones@promerica.com.do', 'alertas@promerica.com.do', 'promerica.com.do'],
    supportedTypes: ['EXPENSE', 'INCOME']
  },
  QIK: {
    code: 'QIK',
    name: 'Qik Banco Digital',
    color: '#6C2BD9',
    logo: 'https://img.icons8.com/color/96/mobile-payment.png',
    senders: ['notificaciones@qik.com.do', 'alertas@qik.com.do', 'qik.com.do'],
    supportedTypes: ['EXPENSE', 'INCOME', 'TRANSFER']
  }
};

export const CATEGORY_COLORS: Record<Category, string> = {
  'Combustible': '#EF4444', // Red
  'Supermercados': '#F59E0B', // Amber
  'Restaurantes y Comida': '#F97316', // Orange
  'Entretenimiento y Suscripciones': '#8B5CF6', // Purple
  'Servicios y Facturas': '#3B82F6', // Blue
  'Salud y Farmacias': '#10B981', // Emerald
  'Compras y Retail': '#EC4899', // Pink
  'Transporte y Viajes': '#06B6D4', // Cyan
  'Transferencias y Pagos': '#64748B', // Slate
  'Retiro de Efectivo': '#6366F1', // Indigo
  'Ingresos y Nómina': '#22C55E', // Green
  'Otros Gastos': '#94A3B8'  // Gray
};

export const CATEGORY_ICONS: Record<Category, string> = {
  'Combustible': 'fuel',
  'Supermercados': 'shopping-cart',
  'Restaurantes y Comida': 'utensils',
  'Entretenimiento y Suscripciones': 'tv',
  'Servicios y Facturas': 'zap',
  'Salud y Farmacias': 'activity',
  'Compras y Retail': 'shopping-bag',
  'Transporte y Viajes': 'car',
  'Transferencias y Pagos': 'arrow-right-left',
  'Retiro de Efectivo': 'banknote',
  'Ingresos y Nómina': 'trending-up',
  'Otros Gastos': 'tag'
};
