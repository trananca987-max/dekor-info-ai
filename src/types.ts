// PATCH v2.2: два кошелька, строки баланса, каталог стилей/задач.

export interface User {
  telegram_id: number;
  username?: string;
  first_name: string;
  // Два кошелька (§5, §6)
  credits_paid: number;        // купленные/стартовые дизайны (не сгорают)
  credits_free_daily: number;  // бесплатные дизайны
  total_designs?: number;      // сумма купленных и бесплатных
  balance_line: string;        // «12 дизайнов» или «Дизайны закончились»
  balance_sub_line?: string;   // «Бесплатные обновятся 14 сентября»
  sheet_line: string;          // верхняя строка шторки
  balance_state: 'trial' | 'paid_daily' | 'weekly';
  exhausted: boolean;
  trial_days_left: number;
  tier?: string;
  quota_medium?: number;
  quota_low?: number;
  quota_hd?: number;
  is_subscribed: boolean;
  created_at?: string;
  first_seen_at?: string;
  total_generations?: number;
  credits?: number;
  free_generations?: number;
}

export interface Generation {
  id: number;
  user_id: number;
  style_id: string;
  display_name: string;        // человекочитаемое название (§7.1)
  category: 'interior' | 'outdoor';
  original_image_url: string;
  result_image_url: string;
  preview_url?: string;
  cost_stars: number;          // стоимость в кредитах (legacy-имя поля)
  kind?: string;               // design | enhance_hd | variations
  quality?: string;            // low | medium | hd
  job_id?: string;
  parent_id?: number;
  created_at: string;
}

export interface CatalogStyle {
  title: string;
  tier: 'A' | 'B';
}

export interface Catalog {
  styles: Record<string, CatalogStyle>;
  jobs: Record<string, { title: string }>;
  job_order: string[];
  garden_directions: Record<string, { title: string }>;
  costs: { low: number; medium: number; hd: number; variations: number };
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    };
  };
  ready: () => void;
  expand: () => void;
  close: () => void;
  colorScheme?: string;
  themeParams?: Record<string, string>;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  enableClosingConfirmation?: () => void;
  disableClosingConfirmation?: () => void;
  disableVerticalSwipes?: () => void;
  onEvent?: (event: string, cb: () => void) => void;
  CloudStorage?: {
    getItem: (key: string, cb: (err: unknown, value: string) => void) => void;
    setItem: (key: string, value: string, cb?: (err: unknown, ok: boolean) => void) => void;
  };
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  openLink: (url: string) => void;
  openTelegramLink: (url: string) => void;
  openInvoice: (url: string, callback?: (status: 'paid' | 'cancelled' | 'failed' | 'pending') => void) => void;
  showPopup: (params: {
    title?: string;
    message: string;
    buttons?: Array<{ type?: string; text?: string; id?: string }>;
  }, callback?: (buttonId: string) => void) => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export {};
