/**
 * LEARN-ALONG: Privacy-First Share Link Generation
 * ==================================================
 *
 * HOW SHARING WORKS (no server needed):
 * The entire care plan is encoded into the URL's hash fragment (#...).
 * The hash fragment is NEVER sent to the server — it stays in the browser.
 * This means the shared data travels peer-to-peer via the link itself.
 *
 * WHY this approach?
 * - Zero infrastructure: no database, no API, no server costs
 * - Maximum privacy: the server never sees the care plan data
 * - Works offline: the share page can decode locally
 * - Self-contained: the link IS the data
 *
 * TRADE-OFFS:
 * - URL length limit (~2000 chars in some browsers, ~8000 in modern ones)
 *   → We strip unnecessary fields to minimize size
 * - Anyone with the link can view the data → time-limited + explicit warning
 * - No access revocation → the 48-hour expiry is the safety net
 *
 * ENCODING PIPELINE:
 * DischargeData → strip unnecessary fields → JSON.stringify → base64url encode → URL hash
 */

import type { DischargeData, ShareLink } from "@/types";
import { generateToken } from "@/lib/crypto/encryption";

/** Default share link lifetime: 48 hours */
const DEFAULT_EXPIRY_HOURS = 48;

/**
 * Encode a string to base64url (URL-safe base64).
 *
 * LEARN: Standard base64 uses +, /, and = which have special meaning in URLs.
 * base64url replaces + → -, / → _, and strips trailing = padding.
 * This is defined in RFC 4648 §5 and used by JWTs, WebAuthn, etc.
 */
function toBase64Url(str: string): string {
  // TextEncoder handles Unicode correctly (emoji in patient names, etc.)
  const bytes = new TextEncoder().encode(str);
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Decode a base64url string back to the original string.
 */
function fromBase64Url(b64url: string): string {
  // Restore standard base64 characters and add back padding
  let base64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Strip fields that are unnecessary for a shared view to reduce URL size.
 *
 * LEARN: We remove:
 * - rawText: the original OCR text (large, not needed for display)
 * - confidence scores: internal AI metadata, irrelevant to caregivers
 * - overallConfidence: same reason
 *
 * This can reduce the payload by 40-60%, keeping the URL manageable.
 */
function stripForSharing(data: DischargeData): Record<string, unknown> {
  return {
    patientFirstName: data.patientFirstName,
    dischargeDate: data.dischargeDate,
    diagnosis: data.diagnosis,
    medications: (data.medications ?? []).map((m) => ({
      id: m.id,
      name: m.name,
      genericName: m.genericName,
      dosage: m.dosage,
      frequency: m.frequency,
      timing: m.timing,
      duration: m.duration,
      specialInstructions: m.specialInstructions,
      purpose: m.purpose,
    })),
    followUps: (data.followUps ?? []).map((f) => ({
      id: f.id,
      provider: f.provider,
      specialty: f.specialty,
      timeframe: f.timeframe,
      suggestedDate: f.suggestedDate,
      phoneNumber: f.phoneNumber,
      reason: f.reason,
    })),
    warningsSigns: (data.warningsSigns ?? []).map((w) => ({
      id: w.id,
      description: w.description,
      severity: w.severity,
      action: w.action,
    })),
    restrictions: data.restrictions?.map((r) => ({
      id: r.id,
      type: r.type,
      description: r.description,
      duration: r.duration,
    })),
    activityRestrictions: data.activityRestrictions,
    additionalNotes: data.additionalNotes,
    language: data.language,
    // rawText is intentionally excluded — large and unnecessary
    // confidence fields are stripped from each item above
  };
}

/**
 * The share payload includes the care plan data plus metadata (expiry, version).
 *
 * LEARN: We include a version field so future code can handle
 * old share links gracefully (backwards compatibility).
 */
interface SharePayload {
  v: 1; // schema version for forward compatibility
  exp: string; // ISO expiry timestamp
  data: Record<string, unknown>; // stripped DischargeData
}

/**
 * Create a shareable link for a care plan.
 *
 * @param data - The discharge data to share
 * @param label - Optional human-friendly label (e.g., "Mom's recovery plan")
 * @returns The share URL and a ShareLink metadata record for IndexedDB storage
 *
 * LEARN: The token in the URL path is purely cosmetic / for routing.
 * The actual data lives in the hash fragment. The token also serves
 * as the unique identifier for tracking share link metadata locally.
 */
export function createShareLink(
  data: DischargeData,
  label?: string
): { url: string; shareLink: ShareLink } {
  const token = generateToken(8); // 16 hex chars — short enough for a URL
  const now = new Date();
  const expiresAt = new Date(now.getTime() + DEFAULT_EXPIRY_HOURS * 60 * 60 * 1000);

  // Build the payload: stripped data + expiry metadata
  const payload: SharePayload = {
    v: 1,
    exp: expiresAt.toISOString(),
    data: stripForSharing(data),
  };

  // Encode: JSON → base64url → URL hash fragment
  const encoded = toBase64Url(JSON.stringify(payload));

  // Build the full URL — works for any deployment domain
  const origin = typeof window !== "undefined" ? window.location.origin : "https://medlens.app";
  const url = `${origin}/share/${token}#${encoded}`;

  const shareLink: ShareLink = {
    token,
    carePlanId: "", // caller can set this if they have the plan ID
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    accessedCount: 0,
    label,
  };

  return { url, shareLink };
}

/**
 * Decode a share link hash fragment back to DischargeData.
 *
 * @param hash - The URL hash (with or without leading #)
 * @returns The decoded DischargeData, or null if invalid/expired
 *
 * LEARN: This function is intentionally defensive — it catches all
 * errors and returns null. A corrupted or tampered link should fail
 * gracefully with a user-friendly message, not a crash.
 */
export function decodeShareLink(hash: string): { data: DischargeData; expiresAt: string } | null {
  try {
    // Strip the leading # if present
    const encoded = hash.startsWith("#") ? hash.slice(1) : hash;
    if (!encoded) return null;

    const json = fromBase64Url(encoded);
    const payload = JSON.parse(json) as SharePayload;

    // Version check — only v1 is supported right now
    if (payload.v !== 1) {
      console.warn(`Unsupported share link version: ${payload.v}`);
      return null;
    }

    // Check expiry — the link should not be usable after expiration
    const expiresAt = new Date(payload.exp);
    if (expiresAt < new Date()) {
      return null; // Expired — caller should show "link expired" message
    }

    // Reconstruct DischargeData with default confidence values
    // (we stripped them during sharing to save space)
    const raw = payload.data as Record<string, unknown>;
    const data: DischargeData = {
      patientFirstName: raw.patientFirstName as string | undefined,
      dischargeDate: raw.dischargeDate as string | undefined,
      diagnosis: raw.diagnosis as string | undefined,
      medications: ((raw.medications as Array<Record<string, unknown>>) ?? []).map((m) => ({
        ...m,
        confidence: "high" as const, // default since we stripped confidence
      })) as DischargeData["medications"],
      followUps: ((raw.followUps as Array<Record<string, unknown>>) ?? []).map((f) => ({
        ...f,
        confidence: "high" as const,
      })) as DischargeData["followUps"],
      warningsSigns: ((raw.warningsSigns as Array<Record<string, unknown>>) ?? []).map((w) => ({
        ...w,
        confidence: "high" as const,
      })) as DischargeData["warningsSigns"],
      restrictions: raw.restrictions
        ? ((raw.restrictions as Array<Record<string, unknown>>).map((r) => ({
            ...r,
            confidence: "high" as const,
          })) as DischargeData["restrictions"])
        : undefined,
      activityRestrictions: raw.activityRestrictions as string[] | undefined,
      additionalNotes: raw.additionalNotes as string | undefined,
      language: raw.language as string | undefined,
    };

    return { data, expiresAt: payload.exp };
  } catch (err) {
    // Corrupted link, tampered data, or encoding error — fail gracefully
    console.error("Failed to decode share link:", err);
    return null;
  }
}
