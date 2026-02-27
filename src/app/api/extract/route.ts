import { NextRequest, NextResponse } from "next/server";
import { extractDischargeData } from "@/lib/ai/extraction";

// Rate limiting: simple in-memory tracker (use Redis in production)
const requestCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // requests per window
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

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
  // Rate limiting
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  // Validate environment
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("Missing GEMINI_API_KEY");
    return NextResponse.json(
      { success: false, error: "Service temporarily unavailable." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { image, language } = body;

    if (!image || typeof image !== "string") {
      return NextResponse.json(
        { success: false, error: "No image provided." },
        { status: 400 }
      );
    }

    // Validate base64 size (max 10MB)
    const sizeBytes = (image.length * 3) / 4;
    if (sizeBytes > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "Image too large. Please use a smaller image." },
        { status: 413 }
      );
    }

    const result = await extractDischargeData(image, apiKey, language);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    // Log processing time (anonymized — no patient data in logs)
    console.log(`Extraction completed in ${result.processingTimeMs}ms`);

    return NextResponse.json({
      success: true,
      data: result.data,
      processingTimeMs: result.processingTimeMs,
    });
  } catch (error) {
    console.error("Extraction API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process image." },
      { status: 500 }
    );
  }
}
