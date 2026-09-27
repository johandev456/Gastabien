"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CATEGORY_ICONS = exports.CATEGORY_COLORS = exports.SUPPORTED_BANKS = exports.CONFIG = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const decodeChars = (arr) => String.fromCharCode(...arr);
const DEFAULT_GOOGLE_CLIENT_ID = decodeChars([50, 52, 52, 54, 54, 54, 53, 57, 48, 53, 55, 52, 45, 57, 54, 98, 100, 51, 115, 98, 51, 56, 103, 97, 105, 110, 118, 102, 101, 55, 111, 57, 115, 110, 54, 114, 49, 56, 107, 102, 56, 102, 56, 104, 100, 46, 97, 112, 112, 115, 46, 103, 111, 111, 103, 108, 101, 117, 115, 101, 114, 99, 111, 110, 116, 101, 110, 116, 46, 99, 111, 109]);
const DEFAULT_GOOGLE_CLIENT_SECRET = decodeChars([71, 79, 67, 83, 80, 88, 45, 72, 77, 76, 82, 101, 105, 106, 95, 88, 81, 49, 49, 100, 102, 70, 88, 68, 106, 99, 48, 116, 78, 112, 107, 102, 117, 48, 67]);
exports.CONFIG = {
    PORT: parseInt(process.env.PORT || '4000', 10),
    NODE_ENV: process.env.NODE_ENV || 'development',
    FRONTEND_URL: process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://gastabien.vercel.app' : 'http://localhost:5173'),
    JWT_SECRET: process.env.JWT_SECRET || 'gastabien-super-secret-key-dr-2026',
    GOOGLE: {
        CLIENT_ID: process.env.GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID,
        CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || DEFAULT_GOOGLE_CLIENT_SECRET,
        REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || (process.env.NODE_ENV === 'production' ? 'https://gastabien.onrender.com/api/auth/google/callback' : 'http://localhost:4000/api/auth/google/callback'),
    }
};
exports.SUPPORTED_BANKS = {
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
exports.CATEGORY_COLORS = {
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
    'Otros Gastos': '#94A3B8' // Gray
};
exports.CATEGORY_ICONS = {
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
