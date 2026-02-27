// CareAfter — Type Definitions

/** Extracted medication from discharge summary */
export interface Medication {
  id: string;
  name: string;
  genericName?: string;
  dosage: string;
  frequency: string;
  timing: string; // e.g., "morning", "with food", "before bed"
  duration?: string; // e.g., "14 days", "ongoing"
  specialInstructions?: string;
  purpose?: string;
  confidence: ConfidenceLevel;
}

/** Follow-up appointment */
export interface FollowUp {
  id: string;
  provider: string;
  specialty?: string;
  timeframe: string; // e.g., "2 weeks", "1 month"
  suggestedDate?: string;
  phoneNumber?: string;
  reason?: string;
  confidence: ConfidenceLevel;
}

/** Warning sign to watch for */
export interface WarningSign {
  id: string;
  description: string;
  severity: "urgent" | "important" | "informational";
  action: string; // e.g., "Call 911", "Call your doctor", "Monitor closely"
  confidence: ConfidenceLevel;
}

/** Dietary or activity restriction */
export interface Restriction {
  id: string;
  type: "dietary" | "activity" | "medication" | "other";
  description: string;
  duration?: string;
  confidence: ConfidenceLevel;
}

/** Confidence level from AI extraction */
export type ConfidenceLevel = "high" | "medium" | "low";

/** Complete extracted data from a discharge summary */
export interface DischargeData {
  patientFirstName?: string;
  dischargeDate?: string;
  diagnosis?: string;
  medications: Medication[];
  followUps: FollowUp[];
  warningsSigns: WarningSign[];
  restrictions: Restriction[];
  additionalNotes?: string;
  rawText?: string;
}

/** The confirmed, personalized care plan */
export interface CarePlan {
  id: string;
  createdAt: string;
  updatedAt: string;
  dischargeData: DischargeData;
  /** Medication reminders with scheduled times */
  medicationSchedule: MedicationReminder[];
  /** Status of each follow-up */
  followUpStatus: FollowUpStatus[];
  /** Whether each warning sign has been acknowledged */
  warningAcknowledged: Record<string, boolean>;
}

export interface MedicationReminder {
  medicationId: string;
  scheduledTimes: string[]; // ISO time strings
  taken: Record<string, boolean>; // date -> taken
  snoozedUntil?: string;
}

export interface FollowUpStatus {
  followUpId: string;
  status: "pending" | "scheduled" | "completed";
  scheduledDate?: string;
  notes?: string;
}

/** Shared care plan link for caregivers */
export interface ShareLink {
  token: string;
  carePlanId: string;
  createdAt: string;
  expiresAt: string;
  accessedCount: number;
  label?: string; // e.g., "Mom's recovery plan"
}

/** API response from the extraction endpoint */
export interface ExtractionResponse {
  success: boolean;
  data?: DischargeData;
  error?: string;
  processingTimeMs?: number;
}

/** API response from the explain endpoint */
export interface ExplainResponse {
  term: string;
  explanation: string;
  source: "discharge_document";
  disclaimer: string;
}
