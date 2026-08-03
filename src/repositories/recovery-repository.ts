import type { CheckIn } from '@/domain/check-in';
import type { ProcedureRecord, UserProfile } from '@/domain/procedure';
import type { Product } from '@/domain/product';
import type { ConsentState, RecoverySession } from '@/domain/session';

export interface RecoveryRepository {
  loadSession(): Promise<RecoverySession | null>;
  saveProfile(profile: UserProfile): Promise<void>;
  saveProcedure(procedure: ProcedureRecord): Promise<void>;
  saveConsent(consent: ConsentState): Promise<void>;
  listProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | null>;
  saveProduct(product: Product): Promise<void>;
  deleteProduct(id: string): Promise<void>;
  listCheckIns(): Promise<CheckIn[]>;
  saveCheckIn(checkIn: CheckIn): Promise<void>;
  exportData(): Promise<string>;
  deleteAllData(): Promise<void>;
}
