import type { ContactActionType } from './check-in';
import type { ProductCategory, VerdictLevel } from './product';

export type AnalyticsEvent =
  | { name: 'onboarding_started' }
  | { name: 'procedure_saved'; procedureDay: number }
  | { name: 'product_registration_started' }
  | { name: 'product_saved'; category: ProductCategory; attributeCount: number }
  | { name: 'onboarding_completed'; productCount: number }
  | { name: 'home_viewed'; procedureDay: number; rulePackVersion: string }
  | { name: 'category_guide_viewed'; category: ProductCategory }
  | { name: 'check_in_completed'; selectedSymptomCount: number; action: ContactActionType }
  | { name: 'product_detail_viewed'; verdict: VerdictLevel }
  | { name: 'commerce_item_viewed'; itemId: string; placement: string }
  | { name: 'commerce_item_clicked'; itemId: string; placement: string }
  | { name: 'data_deleted' };

export interface AnalyticsAdapter {
  track(event: AnalyticsEvent): void;
}

export const analytics: AnalyticsAdapter = {
  track(event) {
    if (process.env.NODE_ENV === 'development') {
      console.info('[analytics]', event);
    }
  },
};
