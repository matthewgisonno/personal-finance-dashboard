import {
  Car,
  Coffee,
  DollarSign,
  Film,
  HeartPulse,
  HelpCircle,
  Home,
  LucideIcon,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  Zap
} from 'lucide-react';

export const categoryIconMap: Record<string, LucideIcon> = {
  'shopping-cart': ShoppingCart,
  home: Home,
  zap: Zap,
  film: Film,
  car: Car,
  'shopping-bag': ShoppingBag,
  coffee: Coffee,
  'heart-pulse': HeartPulse,
  'dollar-sign': DollarSign,
  'refresh-cw': RefreshCw,
  'help-circle': HelpCircle
} as const;
