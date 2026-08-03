import type { RecoveryRepository } from './recovery-repository';

export class SupabaseRecoveryRepository implements RecoveryRepository {
  private unavailable(): never {
    throw new Error('Supabase 모드는 아직 연결되지 않았습니다. NEXT_PUBLIC_DATA_MODE=local을 사용하세요.');
  }

  loadSession() {
    return Promise.reject(this.unavailable());
  }
  saveProfile() {
    return Promise.reject(this.unavailable());
  }
  saveProcedure() {
    return Promise.reject(this.unavailable());
  }
  saveConsent() {
    return Promise.reject(this.unavailable());
  }
  listProducts() {
    return Promise.reject(this.unavailable());
  }
  getProduct() {
    return Promise.reject(this.unavailable());
  }
  saveProduct() {
    return Promise.reject(this.unavailable());
  }
  deleteProduct() {
    return Promise.reject(this.unavailable());
  }
  listCheckIns() {
    return Promise.reject(this.unavailable());
  }
  saveCheckIn() {
    return Promise.reject(this.unavailable());
  }
  exportData() {
    return Promise.reject(this.unavailable());
  }
  deleteAllData() {
    return Promise.reject(this.unavailable());
  }
}
