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

/** Confidence level from AI extraction — can be string category or numeric score */
export type ConfidenceLevel = "high" | "medium" | "low" | number;

/** Complete extracted data from a discharge summary */
export interface DischargeData {
  patientFirstName?: string;
  dischargeDate?: string;
  diagnosis?: string;
  overallConfidence?: number;
  medications: Medication[];
  followUps: FollowUp[];
  warningsSigns: WarningSign[];
  restrictions?: Restriction[];
  activityRestrictions?: string[];
  additionalNotes?: string;
  rawText?: string;
  /** Language code the plan was translated into (e.g., "es", "zh"). Absent or "en" = English. */
  language?: string;
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

/** Supported languages for translation */
export interface SupportedLanguage {
  code: string;        // ISO 639-1 code (e.g., "es", "zh", "vi")
  name: string;        // English name (e.g., "Spanish")
  nativeName: string;  // Name in that language (e.g., "Español")
  flag: string;        // Emoji flag
}

/** All supported languages — GPT-4o handles these natively at zero extra cost */
export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "zh", name: "Chinese (Simplified)", nativeName: "简体中文", flag: "🇨🇳" },
  { code: "tl", name: "Tagalog", nativeName: "Tagalog", flag: "🇵🇭" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", flag: "🇻🇳" },
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷" },
  { code: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇧🇷" },
  { code: "ht", name: "Haitian Creole", nativeName: "Kreyòl Ayisyen", flag: "🇭🇹" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹" },
  { code: "pl", name: "Polish", nativeName: "Polski", flag: "🇵🇱" },
  { code: "uk", name: "Ukrainian", nativeName: "Українська", flag: "🇺🇦" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", flag: "🇧🇩" },
  { code: "my", name: "Burmese", nativeName: "မြန်မာ", flag: "🇲🇲" },
  { code: "am", name: "Amharic", nativeName: "አማርኛ", flag: "🇪🇹" },
];
