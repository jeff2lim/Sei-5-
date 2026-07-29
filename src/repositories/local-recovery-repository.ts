import type { CheckIn } from '@/domain/check-in';
import type { ProcedureRecord, UserProfile } from '@/domain/procedure';
import type { Product } from '@/domain/product';
import type { ConsentState, RecoverySession } from '@/domain/session';
import type { RecoveryRepository } from './recovery-repository';

const STORAGE_KEY = 'recovery-note:v1';

const emptySession = (): RecoverySession => ({
  profile: { sensitivity: 'normal' },
  procedure: null,
  products: [],
  checkIns: [],
  consent: null,
});

export class LocalRecoveryRepository implements RecoveryRepository {
  private read(): RecoverySession {
    if (typeof window === 'undefined') return emptySession();
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySession();
    try {
      return { ...emptySession(), ...(JSON.parse(raw) as RecoverySession) };
    } catch {
      return emptySession();
    }
  }

  private write(session: RecoverySession) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  async loadSession() {
    const session = this.read();
    return session.procedure || session.consent || session.products.length ? session : null;
  }

  async saveProfile(profile: UserProfile) {
    this.write({ ...this.read(), profile });
  }

  async saveProcedure(procedure: ProcedureRecord) {
    this.write({ ...this.read(), procedure });
  }

  async saveConsent(consent: ConsentState) {
    this.write({ ...this.read(), consent });
  }

  async listProducts() {
    return this.read().products;
  }

  async getProduct(id: string) {
    return this.read().products.find((product) => product.id === id) ?? null;
  }

  async saveProduct(product: Product) {
    const session = this.read();
    const products = session.products.some((item) => item.id === product.id)
      ? session.products.map((item) => (item.id === product.id ? product : item))
      : [...session.products, product];
    this.write({ ...session, products });
  }

  async deleteProduct(id: string) {
    const session = this.read();
    this.write({ ...session, products: session.products.filter((product) => product.id !== id) });
  }

  async listCheckIns() {
    return this.read().checkIns;
  }

  async saveCheckIn(checkIn: CheckIn) {
    const session = this.read();
    this.write({ ...session, checkIns: [...session.checkIns, checkIn] });
  }

  async exportData() {
    return JSON.stringify(this.read(), null, 2);
  }

  async deleteAllData() {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}
