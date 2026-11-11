export type ConditionId = 'cold' | 'ankle' | 'chest' | 'joints' | 'heart';

export type ConditionStatus = 'undiagnosed' | 'known' | 'closed';

export type ConditionClosure = 'recovered' | 'resolved' | 'displaced';

export type VisitKind = 'checkup' | 'treatment';

export interface ConditionRecord {
  id: string;
  catalogId: ConditionId;
  status: ConditionStatus;
  acquiredAtAge: number;
  symptom: string;
  diagnosedAtAge?: number;
  declinedAtAge?: number;
  untreatedYears: number;
  treatedAtAge?: number;
  procedureCompleted?: boolean;
  enrolled?: boolean;
  coverageThroughAge?: number;
  closedAtAge?: number;
  closure?: ConditionClosure;
}

export interface VisitRecord {
  id: string;
  age: number;
  kind: VisitKind;
  pricePaid: number;
  catalogId?: ConditionId;
  complimentary?: boolean;
}

/** Absent until the first doctor visit or the first concern. */
export interface PlayerHealthcare {
  conditions: unknown[];
  visits: unknown[];
  lastConsultAge?: number;
}
