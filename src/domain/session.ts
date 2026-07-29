import type { CheckIn } from './check-in';
import type { ProcedureRecord, UserProfile } from './procedure';
import type { Product } from './product';

export type ConsentState = {
  terms: boolean;
  privacy: boolean;
  healthData: boolean;
  photo: boolean;
  marketing: boolean;
  updatedAt: string;
};

export type RecoverySession = {
  profile: UserProfile;
  procedure: ProcedureRecord | null;
  products: Product[];
  checkIns: CheckIn[];
  consent: ConsentState | null;
};
