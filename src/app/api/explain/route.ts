import { NextRequest, NextResponse } from "next/server";
import { explainTerm } from "@/lib/ai/extraction";

export async function POST(request: NextRequest) {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;

  if (!apiKey || !endpoint) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    const { term, context } = await request.json();

    if (!term || typeof term !== "string") {
      return NextResponse.json({ error: "No term provided" }, { status: 400 });
    }

    const explanation = await explainTerm(term, context ?? "", apiKey, endpoint);

    return NextResponse.json({
      term,
      explanation,
      source: "discharge_document",
      disclaimer:
        "This explanation is based on your discharge papers. Always consult your healthcare provider for medical decisions.",
    });
  } catch (error) {
    console.error("Explain API error:", error);
    return NextResponse.json({ error: "Failed to explain term" }, { status: 500 });
  }
}
