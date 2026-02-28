import { NextRequest, NextResponse } from "next/server";
import { askQuestion } from "@/lib/ai/extraction";

// Rate limiting
const requestCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30; // questions per hour
const RATE_WINDOW_MS = 60 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);
  if (!record || now > record.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (record.count >= RATE_LIMIT) return false;
  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many questions. Please try again later." },
      { status: 429 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    const { question, context, language } = await request.json();

    if (!question || typeof question !== "string" || question.length > 500) {
      return NextResponse.json({ error: "Invalid question" }, { status: 400 });
    }

    if (!context || typeof context !== "string") {
      return NextResponse.json({ error: "No discharge context" }, { status: 400 });
    }

    const answer = await askQuestion(question, context, apiKey, language);

    return NextResponse.json({
      question,
      answer,
      disclaimer:
        "This answer is based on your discharge papers only. Always consult your healthcare provider for medical decisions.",
    });
  } catch (error) {
    console.error("Ask API error:", error);
    return NextResponse.json({ error: "Failed to answer question" }, { status: 500 });
  }
}
