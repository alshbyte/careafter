// AI extraction service — calls Azure OpenAI GPT-4o Vision to parse discharge summaries

import type { DischargeData, ConfidenceLevel } from "@/types";

const SYSTEM_PROMPT = `You are a medical document parser for the CareAfter app. Your ONLY job is to extract structured data from discharge summaries.

RULES:
1. Extract ONLY what is explicitly written in the document. Never infer or add medical advice.
2. Assign confidence levels: "high" (clearly readable), "medium" (partially readable), "low" (guessed or unclear).
3. Use plain language for all fields — translate medical jargon into simple English.
4. If a field is not found in the document, omit it entirely.
5. Never provide diagnosis, prognosis, or treatment recommendations beyond what's in the document.

OUTPUT FORMAT: JSON matching the DischargeData schema exactly.`;

const EXTRACTION_PROMPT = `Extract all structured data from this discharge summary image. Return JSON with these fields:
- patientFirstName (first name only, for personalization)
- dischargeDate
- diagnosis (in plain language)
- medications: array of {name, genericName, dosage, frequency, timing, duration, specialInstructions, purpose, confidence}
- followUps: array of {provider, specialty, timeframe, suggestedDate, phoneNumber, reason, confidence}
- warningsSigns: array of {description, severity (urgent/important/informational), action, confidence}
- restrictions: array of {type (dietary/activity/medication/other), description, duration, confidence}
- additionalNotes

Assign each item a confidence level: "high", "medium", or "low".
For severity: "urgent" = call 911/go to ER, "important" = call doctor within 24h, "informational" = monitor.`;

export interface ExtractionResult {
  success: boolean;
  data?: DischargeData;
  error?: string;
  processingTimeMs: number;
}

export async function extractDischargeData(
  imageBase64: string,
  apiKey: string,
  endpoint: string
): Promise<ExtractionResult> {
  const startTime = Date.now();

  try {
    const response = await fetch(`${endpoint}/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: EXTRACTION_PROMPT },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                  detail: "high",
                },
              },
            ],
          },
        ],
        max_tokens: 4096,
        temperature: 0.1, // low temperature for factual extraction
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure OpenAI API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in API response");
    }

    const parsed = JSON.parse(content) as DischargeData;

    // Assign IDs to all items
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
  endpoint: string
): Promise<string> {
  const response = await fetch(`${endpoint}/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content: `You explain medical terms in simple, plain language at a 6th-grade reading level. 
Keep explanations under 2 sentences. Only explain based on the context provided from the patient's own discharge document.
Always end with: "Ask your doctor or pharmacist if you have questions about ${term}."`,
        },
        {
          role: "user",
          content: `Explain "${term}" in simple language. Context from the patient's discharge document: "${context}"`,
        },
      ],
      max_tokens: 200,
      temperature: 0.2,
    }),
  });

  if (!response.ok) throw new Error("Failed to get explanation");

  const result = await response.json();
  return result.choices?.[0]?.message?.content ?? "Unable to explain this term.";
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
