import type { ProductCategory } from './product';

export type CommerceItem = {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  compatibleAttributeIds: string[];
  cautionAttributeIds: string[];
  merchant: 'oliveyoung' | 'hwahae' | 'other';
  externalUrl: string;
  relationship: 'affiliate' | 'sponsored' | 'editorial';
  disclosureText: string;
  isActive: boolean;
};
