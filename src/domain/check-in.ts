export type CheckInAnswer = {
  symptomId: string;
  present: boolean;
  severity?: 1 | 2 | 3;
};

export type CheckIn = {
  id: string;
  checkedAt: string;
  procedureDay?: number;
  answers: CheckInAnswer[];
  rulePackVersion: string;
};

export type ContactActionType =
  'CONTINUE_GUIDE' | 'CONTACT_CLINIC' | 'CONTACT_CLINIC_PROMPTLY' | 'EMERGENCY_GUIDANCE';

export type ContactAction = {
  type: ContactActionType;
  title: string;
  body: string;
};
