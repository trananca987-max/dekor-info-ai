export interface User {
  telegram_id: number;
  username?: string;
  first_name: string;
  credits: number;            // внутренняя валюта (SPEC 1.3)
  free_generations: number;   // стартовый бонус: 2 бесплатных дизайна Medium
  tier?: string;              // free | pro | premium
  tier_expires_at?: string;
  quota_medium?: number;
  quota_low?: number;
  quota_hd?: number;
  is_subscribed: boolean;
  created_at: string;
  // legacy
  stars?: number;
}

export interface Generation {
  id: number;
  user_id: number;
  style_id: string;
  category: 'interior' | 'outdoor';
  original_image_url: string;
  result_image_url: string;
  preview_url?: string;       // webp 400×300 (SPEC 1.2)
  cost_stars: number;         // стоимость в кредитах (legacy-имя поля)
  kind?: string;      // design | enhance_hd | variations
  quality?: string;   // low | medium | hd
  parent_id?: number;
  created_at: string;
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
