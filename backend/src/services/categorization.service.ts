import { Category, TransactionType } from '../types';

interface Rule {
  category: Category;
  keywords: string[];
}

export class CategorizationService {
  private rules: Rule[] = [
    {
      category: 'Combustible',
      keywords: [
        'total', 'totalenergies', 'shell', 'texaco', 'sunix', 'petromovil',
        'ecopetroleo', 'isla', 'tropigas', 'gasolinera', 'bomba', 'esso',
        'puma energy', 'combustible', 'gasolina', 'estacion de servicio',
        'estacion total', 'estacion shell', 'estacion texaco', 'estacion sunix'
      ]
    },
    {
      category: 'Supermercados',
      keywords: [
        'sirena', 'super pola', 'pola', 'bravo', 'sm bravo', 'supermercado bravo',
        'jumbo', 'nacional', 'sm nacional', 'supermercados nacional', 'plaza lama',
        'carrefour', 'pricesmart', 'ole', 'hiper ole', 'supermercado ole',
        'la cadena', 'supermercado', 'market', 'minimarket', 'grocery',
        'esperilla', 'fresh market', 'tienda de conveniencia'
      ]
    },
    {
      category: 'Bares y Vida Nocturna',
      keywords: [
        'xupitos', 'xupitos bar', 'irish pub', 'the irish pub', 'pub', 'irish',
        'bar', 'lounge', 'cerveceria', 'cervecería', 'discoteca', 'club', 'nightclub',
        'cocktail', 'tragos', 'licor', 'liquor', 'licorera', 'speakeasy', 'taberna',
        'drinks', 'after work', 'rooftop bar', 'sports bar', 'hookah lounge'
      ]
    },
    {
      category: 'Restaurantes y Comida',
      keywords: [
        'coffee', 'coffee shop', 'pucmm', 'unibe', 'intec', 'apap cafeteria',
        'cafeteria', 'cafetería', 'café', 'cafe', 'starbucks', 'baker', 'bakery',
        'pedidosya', 'uber eats', 'mcdonald', 'wendy', 'burger king',
        'kfc', 'pizza hut', 'domino', 'taco bell', 'chef pepper',
        'outback', 'applebee', 'pizzarelli', 'adrian tropical',
        'jade', 'sbg', 'forno bravo', 'helados bon', 'bon',
        'paletas bajo cero', 'restaurant', 'restaurante',
        'bistro', 'grill', 'panaderia', 'panadería', 'reposteria', 'repostería',
        'food hall', 'sushi', 'tacos', 'empanadas', 'taqueria', 'taquería',
        'deli', 'comedor', 'heladeria', 'heladería', 'snack', 'cappuccino', 'espresso'
      ]
    },
    {
      category: 'Entretenimiento y Suscripciones',
      keywords: [
        'netflix', 'spotify', 'youtube', 'disney', 'hbo', 'max',
        'prime video', 'apple music', 'apple.com/bill', 'itunes',
        'playstation', 'steam', 'xbox', 'nintendo', 'caribbean cinemas',
        'palacio del cine', 'twitch', 'openai', 'chatgpt', 'cine', 'cinema',
        'google play', 'google *', 'patreon', 'audible', 'crunchyroll'
      ]
    },
    {
      category: 'Servicios y Facturas',
      keywords: [
        'notificación sms', 'notificacion sms', 'alerta sms', 'cargo por servicio',
        'comisión', 'comision', 'servicio de alertas', 'mensajería', 'mensajeria',
        'edesur', 'edenorte', 'edeeste', 'caasd', 'coraasan', 'claro',
        'altice', 'viva', 'aster', 'wind telecom', 'telecable',
        'dgii', 'pasaportes', 'ayuntamiento', 'colegio', 'universidad',
        'inapa', 'luz', 'agua', 'telefono', 'internet'
      ]
    },
    {
      category: 'Salud y Farmacias',
      keywords: [
        'farmacia carol', 'carol', 'farmacia gbc', 'gbc',
        'los hidalgos', 'farmacia los hidalgos', 'farmax',
        'cedimat', 'hospiten', 'clinica abreu', 'amadita',
        'referencia', 'laboratorio', 'clinica', 'hospital',
        'farmacia', 'dental', 'optica', 'doctor'
      ]
    },
    {
      category: 'Transporte y Viajes',
      keywords: [
        'uber', 'uber trip', 'didi', 'indrive', 'cabify', 'peaje', 'rd vial',
        'arajet', 'sky high', 'copa airlines', 'airbnb', 'booking',
        'expedia', 'hotel', 'resort', 'vuelo', 'aeropuerto', 'taxi'
      ]
    },
    {
      category: 'Compras y Retail',
      keywords: [
        'amazon', 'shein', 'zara', 'bershka', 'pull&bear', 'h&m',
        'ikea', 'anthony', 'americana departamentos', 'ilumel',
        'casa cuesta', 'tienda', 'mall', 'shopping', 'aliexpress',
        'ebay', 'apple.com', 'best buy', 'ferreteria', 'ferretería'
      ]
    },
    {
      category: 'Retiro de Efectivo',
      keywords: [
        'retiro', 'retiro en cajero', 'retiro de efectivo', 'cajero automático',
        'cajero automatico', 'cajero', 'atm', 'dispensador', 'pin pesos',
        'subagente bancario retiro', 'dispensación de efectivo'
      ]
    },
    {
      category: 'Transferencias y Pagos',
      keywords: [
        'transferencia', 'ach', 'lbtr', 'pago de tarjeta', 'transfer'
      ]
    }
  ];

  private keywordPatterns = new Map<string, RegExp>();

  private normalize(text: string): string {
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  private matchWholeWord(text: string): Category | null {
    if (!text) return null;
    for (const rule of this.rules) {
      for (const keyword of rule.keywords) {
        if (this.matchesKeyword(text, keyword)) return rule.category;
      }
    }
    return null;
  }

  private compact(text: string): string {
    return this.normalize(text).replace(/[^a-z0-9]/g, '');
  }

  /** Whole-word match ("bar" matches "Sports Bar" but not "Barbería" or "Bravo"). */
  private matchesKeyword(text: string, keyword: string): boolean {
    let re = this.keywordPatterns.get(keyword);
    if (!re) {
      const escaped = this.normalize(keyword).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      re = new RegExp(`(?:^|[^a-z0-9])${escaped}(?:s|es)?(?:$|[^a-z0-9])`);
      this.keywordPatterns.set(keyword, re);
    }
    return re.test(text);
  }

  public categorize(merchant: string, description?: string, type: TransactionType = 'EXPENSE'): Category {
    if (type === 'INCOME') {
      return 'Ingresos y Nómina';
    }

    // Order of evidence, strongest first:
    //  1. whole-word keyword in the merchant name
    //  2. glued merchant tokens ("SMBRAVO", "FARMACIACAROL"): separators removed, 5+ letter keywords only,
    //     so short words like "bar", "club" or "bon" can't match by accident
    //  3. whole-word keyword in the free-text description (noisy: "Club Promerica", "tarjeta"...)
    const merchantText = this.normalize(merchant || '');
    const byMerchant = this.matchWholeWord(merchantText);
    if (byMerchant) return byMerchant;

    const compactMerchant = this.compact(merchant || '');
    if (compactMerchant) {
      for (const rule of this.rules) {
        for (const keyword of rule.keywords) {
          const k = this.compact(keyword);
          if (k.length >= 5 && compactMerchant.includes(k)) {
            return rule.category;
          }
        }
      }
    }

    // Bank product names in email boilerplate are not merchant signals ("tarjeta Club Promerica")
    const descriptionText = this.normalize(description || '')
      .replace(/\b(?:club\s+promerica|promerica\s+club|club\s+de\s+beneficios|tarjetas?\s+(?:de\s+)?credito)\b/g, ' ');
    const byDescription = this.matchWholeWord(descriptionText);
    if (byDescription) return byDescription;

    return 'Otros Gastos';
  }
}

export const categorizationService = new CategorizationService();
