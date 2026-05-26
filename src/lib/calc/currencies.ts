export type CurrencyInfo = {
  code: string;
  symbol: string;
  name: string;
  nameRu: string;
};

export const CURRENCIES: readonly CurrencyInfo[] = [
  { code: 'RUB', symbol: '₽',  name: 'Russian ruble',       nameRu: 'Российский рубль' },
  { code: 'PHP', symbol: '₱',  name: 'Philippine peso',     nameRu: 'Филиппинское песо' },
  { code: 'INR', symbol: '₹',  name: 'Indian rupee',        nameRu: 'Индийская рупия' },
  { code: 'UAH', symbol: '₴',  name: 'Ukrainian hryvnia',   nameRu: 'Украинская гривна' },
  { code: 'PLN', symbol: 'zł', name: 'Polish złoty',        nameRu: 'Польский злотый' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian rupiah',   nameRu: 'Индонезийская рупия' },
  { code: 'THB', symbol: '฿',  name: 'Thai baht',           nameRu: 'Тайский бат' },
  { code: 'EUR', symbol: '€',  name: 'Euro',                nameRu: 'Евро' },
  { code: 'GBP', symbol: '£',  name: 'British pound',       nameRu: 'Британский фунт' },
  { code: 'CNY', symbol: '¥',  name: 'Chinese yuan',        nameRu: 'Китайский юань' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian real',      nameRu: 'Бразильский реал' },
  { code: 'MXN', symbol: '$',  name: 'Mexican peso',        nameRu: 'Мексиканское песо' },
  { code: 'TRY', symbol: '₺',  name: 'Turkish lira',        nameRu: 'Турецкая лира' },
  { code: 'MMK', symbol: 'K',  name: 'Myanmar kyat',        nameRu: 'Мьянманский кьят' },
  { code: 'NGN', symbol: '₦',  name: 'Nigerian naira',      nameRu: 'Нигерийская найра' },
  { code: 'BDT', symbol: '৳',  name: 'Bangladeshi taka',    nameRu: 'Бангладешская така' },
  { code: 'VND', symbol: '₫',  name: 'Vietnamese đồng',     nameRu: 'Вьетнамский донг' },
  { code: 'KRW', symbol: '₩',  name: 'South Korean won',    nameRu: 'Южнокорейская вона' },
];

export function currencyByCode(code: string): CurrencyInfo {
  const c = CURRENCIES.find(c => c.code === code);
  if (!c) throw new Error(`Unknown currency code: ${code}`);
  return c;
}

export function currencySymbol(code: string): string {
  return currencyByCode(code).symbol;
}
