import {
  BadgePercent,
  Beer,
  Bike,
  Clock,
  Coffee,
  ListChecks,
  MessageCircle,
  Pizza,
  QrCode,
  Search,
  Smartphone,
  Soup,
  type LucideIcon,
} from 'lucide-react';
import type { FeatureId } from '@/lib/platform';

/**
 * Ícone de cada recurso da página inicial. O texto continua em `src/lib/platform.ts`;
 * o Record garante em tempo de compilação que recurso novo não fica sem ícone.
 */
export const featureIcons: Record<FeatureId, LucideIcon> = {
  marca: Smartphone,
  whatsapp: MessageCircle,
  entrega: Bike,
  complementos: ListChecks,
  'link-qr': QrCode,
  google: Search,
  horario: Clock,
  'sem-comissao': BadgePercent,
};

export const audiences: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Pizza,
    title: 'Hamburguerias e pizzarias',
    text: 'Complementos, pontos de carne e adicionais pagos, com o pedido chegando organizado na cozinha.',
  },
  {
    icon: Soup,
    title: 'Restaurantes e marmitarias',
    text: 'Cardápio do dia, categorias por refeição e entrega por bairro com taxa e prazo próprios.',
  },
  {
    icon: Coffee,
    title: 'Cafeterias e docerias',
    text: 'QR code na mesa, cardápio sempre atualizado e encomendas combinadas pelo WhatsApp.',
  },
  {
    icon: Beer,
    title: 'Bares e food trucks',
    text: 'Publique em minutos, esgote itens em tempo real e mude preços quando quiser.',
  },
];
