// SPEC v2.0: два кошелька, строка баланса, каталог задач/палитр/помещений.

export interface User {
  telegram_id: number;
  username?: string;
  first_name: string;
  // Два кошелька (SPEC §4.1)
  credits_paid: number;        // купленные/бонусные — не сгорают, любая модель
  credits_free_daily: number;  // бесплатные — только Low, сгорают в 00:00
  balance_line: string;        // готовая строка баланса (SPEC §5)
  balance_state: 'trial' | 'paid_daily' | 'weekly';
  exhausted: boolean;
  trial_days_left: number;
  example_gen_used: boolean;
  tier?: string;               // free | pro | premium
  quota_medium?: number;
  quota_low?: number;
  quota_hd?: number;
  is_subscribed: boolean;
  created_at?: string;
  // совместимость со старыми экранами
  credits?: number;
  free_generations?: number;
}

export interface Generation {
  id: number;
  user_id: number;
  style_id: string;
  display_name: string;        // человекочитаемое название (SPEC §11)
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

export interface JobInfo {
  title: string;
  sub: string;
  wave: 'core' | 'wave2';
  preview: string;
}

export interface PaletteInfo {
  name: string;
  colors: string[];
  prompt: string;
}

export interface RoomType {
  id: string;
  name: string;
}

export interface Catalog {
  jobs: Record<string, JobInfo>;
  job_order: string[];
  palettes: Record<string, PaletteInfo>;
  palette_order: string[];
  room_types: RoomType[];
  styles: Record<string, { name_ru: string; category: string }>;
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
