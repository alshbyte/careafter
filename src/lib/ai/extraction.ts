// AI extraction service — calls Google Gemini Flash to parse discharge summaries
// Supports pluggable models via GEMINI_MODEL env var (default: gemini-2.0-flash)

import type { DischargeData, ConfidenceLevel } from "@/types";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

/**
 * Build the system prompt, optionally instructing translation.
 * When language !== "en", the AI outputs ALL patient-facing text in that language
 * while keeping JSON keys and structure in English (so our code can parse it).
 */
function buildSystemPrompt(languageCode?: string): string {
  const languageLine =
    languageCode && languageCode !== "en"
      ? `\n6. IMPORTANT: Output ALL patient-facing text values (medication names can stay in English, but ALL descriptions, instructions, actions, purposes, reasons, timing, and notes) in ${getLanguageNameForAI(languageCode)}. Keep JSON keys in English.`
      : "";

  return `You are a medical document parser for the CareAfter app. Your ONLY job is to extract structured data from discharge summaries.

RULES:
1. Extract ONLY what is explicitly written in the document. Never infer or add medical advice.
2. Assign confidence levels: "high" (clearly readable), "medium" (partially readable), "low" (guessed or unclear).
3. Use plain language for all fields — translate medical jargon into simple, easy-to-understand language.
4. If a field is not found in the document, omit it entirely.
5. Never provide diagnosis, prognosis, or treatment recommendations beyond what's in the document.${languageLine}

OUTPUT FORMAT: JSON matching the DischargeData schema exactly.`;
}

function buildExtractionPrompt(languageCode?: string): string {
  const langSuffix =
    languageCode && languageCode !== "en"
      ? `\n\nCRITICAL: All text values in the JSON (descriptions, instructions, purposes, actions, timing, notes, reasons, specialInstructions) MUST be written in ${getLanguageNameForAI(languageCode)}. Medication brand names should remain in English but add a translated purpose/description. Keep JSON keys in English.`
      : "";

  return `Extract all structured data from this discharge summary image. Return JSON with these fields:
- patientFirstName (first name only, for personalization)
- dischargeDate
- diagnosis (in plain language)
- summary (a 3-5 sentence plain-language summary of the entire discharge — what happened, what was done, and what the patient needs to do now. Write as if explaining to the patient directly, at a 6th-grade reading level.)
- medications: array of {name, genericName, dosage, frequency, timing, duration, specialInstructions, purpose, confidence}
- followUps: array of {provider, specialty, timeframe, suggestedDate, phoneNumber, reason, confidence}
- warningsSigns: array of {description, severity (urgent/important/informational), action, confidence}
- restrictions: array of {type (dietary/activity/medication/other), description, duration, confidence}
- additionalNotes

Assign each item a confidence level: "high", "medium", or "low".
For severity: "urgent" = call 911/go to ER, "important" = call doctor within 24h, "informational" = monitor.${langSuffix}`;
}

/** Map language code to a name the AI can understand unambiguously */
function getLanguageNameForAI(code: string): string {
  const map: Record<string, string> = {
    es: "Spanish", zh: "Simplified Chinese", tl: "Tagalog (Filipino)",
    vi: "Vietnamese", ar: "Arabic", fr: "French", ko: "Korean",
    ru: "Russian", pt: "Brazilian Portuguese", ht: "Haitian Creole",
    hi: "Hindi", ja: "Japanese", de: "German", it: "Italian",
    pl: "Polish", uk: "Ukrainian", bn: "Bengali", my: "Burmese", am: "Amharic",
  };
  return map[code] ?? "English";
}

export interface ExtractionResult {
  success: boolean;
  data?: DischargeData;
  error?: string;
  processingTimeMs: number;
}

export async function extractDischargeData(
  imageBase64: string,
  apiKey: string,
  language?: string
): Promise<ExtractionResult> {
  const startTime = Date.now();
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  // Trim the key to remove any accidental whitespace/newlines
  const cleanKey = apiKey.trim();

  // Auto-detect MIME type from base64 header, or default to jpeg
  const mimeType = detectMimeType(imageBase64);

  try {
    const url = `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${cleanKey}`;
    console.log(`[Gemini] Calling model=${model}, mimeType=${mimeType}, imageSize=${imageBase64.length} chars`);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: buildSystemPrompt(language) }],
        },
        contents: [
          {
            parts: [
              { text: buildExtractionPrompt(language) },
              {
                inlineData: {
                  mimeType,
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Gemini] API error ${response.status}:`, errorText.substring(0, 500));
      throw new Error(`Gemini API error: ${response.status} ${errorText.substring(0, 200)}`);
    }

    const result = await response.json();
    const content = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error("No content in Gemini API response");
    }

    const parsed = JSON.parse(content) as DischargeData;
    const withIds = assignIds(parsed);

    return {
      success: true,
      data: withIds,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown extraction error",
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/** Generate a plain-language explanation for a medical term */
export async function explainTerm(
  term: string,
  context: string,
  apiKey: string,
  language?: string
): Promise<string> {
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const cleanKey = apiKey.trim();
  const langName = language && language !== "en" ? getLanguageNameForAI(language) : null;
  const langInstruction = langName
    ? `Respond ENTIRELY in ${langName}. `
    : "";
  const askDoctor = langName
    ? `Always end with the equivalent of "Ask your doctor or pharmacist if you have questions about ${term}" in ${langName}.`
    : `Always end with: "Ask your doctor or pharmacist if you have questions about ${term}."`;

  const response = await fetch(
    `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${cleanKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: `${langInstruction}You explain medical terms in simple, plain language at a 6th-grade reading level. 
Keep explanations under 2 sentences. Only explain based on the context provided from the patient's own discharge document.
${askDoctor}`,
            },
          ],
        },
        contents: [
          {
            parts: [
              {
                text: `Explain "${term}" in simple language. Context from the patient's discharge document: "${context}"`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 200,
        },
      }),
    }
  );

  if (!response.ok) throw new Error("Failed to get explanation");

  const result = await response.json();
  return (
    result.candidates?.[0]?.content?.parts?.[0]?.text ??
    "Unable to explain this term."
  );
}

/** Answer a follow-up question about the patient's discharge */
export async function askQuestion(
  question: string,
  dischargeContext: string,
  apiKey: string,
  language?: string
): Promise<string> {
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const cleanKey = apiKey.trim();
  const langName = language && language !== "en" ? getLanguageNameForAI(language) : null;
  const langInstruction = langName ? `Respond ENTIRELY in ${langName}. ` : "";

  const response = await fetch(
    `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${cleanKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: `${langInstruction}You are a helpful assistant for a patient who was recently discharged from the hospital. 
Answer questions ONLY based on the patient's discharge information provided below. 
Use simple, plain language at a 6th-grade reading level. Keep answers under 3 sentences.
If the question cannot be answered from the discharge information, say so and recommend they ask their doctor.
NEVER provide medical advice beyond what's in the discharge document.
Always end with: "Talk to your doctor if you have more questions."

PATIENT'S DISCHARGE INFORMATION:
${dischargeContext}`,
            },
          ],
        },
        contents: [
          {
            parts: [{ text: question }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 300,
        },
      }),
    }
  );

  if (!response.ok) throw new Error("Failed to get answer");

  const result = await response.json();
  return (
    result.candidates?.[0]?.content?.parts?.[0]?.text ??
    "I couldn't answer that. Please ask your doctor or pharmacist."
  );
}

/** Detect image MIME type from base64 data */
function detectMimeType(base64: string): string {
  if (base64.startsWith("/9j/")) return "image/jpeg";
  if (base64.startsWith("iVBOR")) return "image/png";
  if (base64.startsWith("R0lGO")) return "image/gif";
  if (base64.startsWith("UklGR")) return "image/webp";
  return "image/jpeg"; // default fallback
}

function assignIds(data: DischargeData): DischargeData {
  let counter = 0;
  const nextId = () => `item-${++counter}`;

  return {
    ...data,
    medications: (data.medications ?? []).map((m) => ({ ...m, id: nextId() })),
    followUps: (data.followUps ?? []).map((f) => ({ ...f, id: nextId() })),
    warningsSigns: (data.warningsSigns ?? []).map((w) => ({ ...w, id: nextId() })),
    restrictions: (data.restrictions ?? []).map((r) => ({ ...r, id: nextId() })),
  };
}
