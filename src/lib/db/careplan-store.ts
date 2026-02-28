/**
 * LEARN-ALONG: IndexedDB Persistence Layer
 * ==========================================
 * 
 * WHY IndexedDB (not localStorage)?
 * - localStorage is limited to ~5MB and is synchronous (blocks the UI)
 * - IndexedDB can store hundreds of MB, is async, and supports structured data
 * - IndexedDB works offline — critical for a PWA
 * - IndexedDB persists across browser sessions (unlike sessionStorage)
 * 
 * WHY not a cloud database?
 * - Privacy-first: patient data should live on their device by default
 * - Offline-capable: app must work without internet after initial scan
 * - Zero-account: no login = no cloud storage to associate with
 * 
 * HOW IT WORKS:
 * 1. We open a database called "medlens" with an "object store" (like a table)
 * 2. Each care plan is stored as an encrypted blob (AES-256-GCM)
 * 3. The encryption key lives in the browser's secure storage
 * 4. When the user opens the app, we decrypt and display
 * 
 * ARCHITECTURE PATTERN: "Local-First"
 * - Data lives on-device as the source of truth
 * - Cloud sync is OPTIONAL and always encrypted end-to-end
 * - App works fully offline after the initial AI extraction
 */

import type { CarePlan, DischargeData, MedicationReminder, FollowUpStatus, ShareLink } from "@/types";
import { generateEncryptionKey, exportKey, importKey, encrypt, decrypt, generateToken } from "@/lib/crypto/encryption";

const DB_NAME = "medlens";
/**
 * LEARN: Bumped from 1 → 2 to add the "shareLinks" object store.
 * IndexedDB versioning ensures existing users get the schema migration
 * automatically — the onupgradeneeded callback handles both fresh installs
 * (no existing stores) and upgrades (only creates missing stores).
 */
const DB_VERSION = 2;
const STORES = {
  carePlans: "carePlans",   // Encrypted care plan data
  keys: "keys",             // Encryption key storage
  reminders: "reminders",   // Medication reminder state
  shareLinks: "shareLinks", // Share link metadata (not encrypted — no PHI)
} as const;

/**
 * Open (or create) the IndexedDB database.
 * 
 * LEARN: IndexedDB uses a versioning system. When you change the schema
 * (add a store, add an index), you bump the version number. The
 * "onupgradeneeded" callback runs when the version increases — this is
 * where you create/modify object stores.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.carePlans)) {
        db.createObjectStore(STORES.carePlans, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.keys)) {
        db.createObjectStore(STORES.keys, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.reminders)) {
        db.createObjectStore(STORES.reminders, { keyPath: "medicationId" });
      }
      // v2: share link tracking (token, expiry, access count)
      if (!db.objectStoreNames.contains(STORES.shareLinks)) {
        const store = db.createObjectStore(STORES.shareLinks, { keyPath: "token" });
        store.createIndex("carePlanId", "carePlanId", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get or create the encryption key.
 * 
 * LEARN: We store the key in IndexedDB itself. On a real production app,
 * you might use the Web Authentication API (WebAuthn) to protect the key
 * with biometrics. For MVP, IndexedDB storage is sufficient because:
 * - The key is per-browser/per-device
 * - Clearing browser data deletes the key (and the encrypted data)
 * - An attacker who can read IndexedDB already has full browser access
 */
async function getOrCreateKey(): Promise<CryptoKey> {
  const db = await openDB();

  // Try to load existing key
  const existing = await new Promise<{ id: string; key: string } | undefined>((resolve, reject) => {
    const tx = db.transaction(STORES.keys, "readonly");
    const store = tx.objectStore(STORES.keys);
    const request = store.get("main");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  if (existing) {
    return importKey(existing.key);
  }

  // Generate new key
  const key = await generateEncryptionKey();
  const exported = await exportKey(key);

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.keys, "readwrite");
    const store = tx.objectStore(STORES.keys);
    store.put({ id: "main", key: exported });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  return key;
}

/**
 * Save a care plan (encrypted).
 * 
 * LEARN: The flow is:
 * 1. Serialize care plan to JSON
 * 2. Encrypt with AES-256-GCM (produces a random IV each time)
 * 3. Store the encrypted blob in IndexedDB
 * 
 * Even if someone inspects IndexedDB in DevTools, they see gibberish.
 */
export async function saveCarePlan(data: DischargeData): Promise<CarePlan> {
  const key = await getOrCreateKey();
  const db = await openDB();

  const plan: CarePlan = {
    id: generateToken(16),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    dischargeData: data,
    medicationSchedule: createMedicationSchedule(data),
    followUpStatus: (data.followUps ?? []).map((fu) => ({
      followUpId: fu.id,
      status: "pending" as const,
    })),
    warningAcknowledged: {},
  };

  const plaintext = JSON.stringify(plan);
  const encrypted = await encrypt(plaintext, key);

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.carePlans, "readwrite");
    const store = tx.objectStore(STORES.carePlans);
    store.put({ id: plan.id, data: encrypted, updatedAt: plan.updatedAt });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  return plan;
}

/**
 * Load the most recent care plan (decrypted).
 */
export async function loadLatestCarePlan(): Promise<CarePlan | null> {
  const key = await getOrCreateKey();
  const db = await openDB();

  const all = await new Promise<{ id: string; data: string; updatedAt: string }[]>((resolve, reject) => {
    const tx = db.transaction(STORES.carePlans, "readonly");
    const store = tx.objectStore(STORES.carePlans);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  if (all.length === 0) return null;

  // Sort by updatedAt descending, get most recent
  all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const latest = all[0];

  try {
    const decrypted = await decrypt(latest.data, key);
    return JSON.parse(decrypted) as CarePlan;
  } catch {
    console.error("Failed to decrypt care plan — key may have changed");
    return null;
  }
}

/**
 * Update medication taken status.
 * 
 * LEARN: We load the entire plan, modify it, re-encrypt, and save.
 * This is the "local-first" pattern — no API calls, instant updates,
 * works offline. The trade-off is that concurrent edits from multiple
 * tabs could conflict, but for a single-user health app this is fine.
 */
export async function markMedicationTaken(
  planId: string,
  medicationId: string,
  date: string,
  taken: boolean
): Promise<void> {
  const key = await getOrCreateKey();
  const db = await openDB();

  const record = await new Promise<{ id: string; data: string } | undefined>((resolve, reject) => {
    const tx = db.transaction(STORES.carePlans, "readonly");
    const store = tx.objectStore(STORES.carePlans);
    const request = store.get(planId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  if (!record) return;

  const plan = JSON.parse(await decrypt(record.data, key)) as CarePlan;

  // Find and update the medication schedule
  const schedule = plan.medicationSchedule.find((s) => s.medicationId === medicationId);
  if (schedule) {
    schedule.taken[date] = taken;
  }
  plan.updatedAt = new Date().toISOString();

  const encrypted = await encrypt(JSON.stringify(plan), key);

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.carePlans, "readwrite");
    const store = tx.objectStore(STORES.carePlans);
    store.put({ id: plan.id, data: encrypted, updatedAt: plan.updatedAt });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Delete all data — the "nuclear option" for patient control.
 * 
 * LEARN: GDPR and HIPAA both require the ability for users to delete
 * their data. Since everything is local, this is straightforward —
 * just delete the entire IndexedDB database.
 */
export async function deleteAllData(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Create initial medication schedule from discharge data.
 * 
 * LEARN: This is a simple heuristic. A production app would need
 * pharmacist-validated scheduling logic. For MVP, we map frequency
 * keywords to approximate times.
 */
function createMedicationSchedule(data: DischargeData): MedicationReminder[] {
  return (data.medications ?? []).map((med) => {
    const times = frequencyToTimes(med.frequency);
    return {
      medicationId: med.id,
      scheduledTimes: times,
      taken: {},
    };
  });
}

/**
 * Save share link metadata to IndexedDB.
 *
 * LEARN: Share link metadata (token, expiry, label) does NOT contain PHI,
 * so we store it unencrypted for simplicity. The actual care plan data
 * travels in the URL hash, not in IndexedDB.
 */
export async function saveShareLink(link: ShareLink): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.shareLinks, "readwrite");
    const store = tx.objectStore(STORES.shareLinks);
    store.put(link);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get all share links for a given care plan.
 *
 * LEARN: We use an IndexedDB index on carePlanId to efficiently query
 * share links for a specific plan. This lets the UI show "You've shared
 * this plan 3 times" if needed.
 */
export async function getShareLinks(planId: string): Promise<ShareLink[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.shareLinks, "readonly");
    const store = tx.objectStore(STORES.shareLinks);
    const index = store.index("carePlanId");
    const request = index.getAll(planId);
    request.onsuccess = () => resolve(request.result as ShareLink[]);
    request.onerror = () => reject(request.error);
  });
}

function frequencyToTimes(frequency: string): string[] {
  const lower = frequency.toLowerCase();
  if (lower.includes("3 times") || lower.includes("three times")) {
    return ["08:00", "14:00", "20:00"];
  }
  if (lower.includes("twice") || lower.includes("2 times") || lower.includes("two times")) {
    return ["08:00", "20:00"];
  }
  if (lower.includes("every 6 hours") || lower.includes("4 times")) {
    return ["06:00", "12:00", "18:00", "00:00"];
  }
  if (lower.includes("every 8 hours")) {
    return ["08:00", "16:00", "00:00"];
  }
  if (lower.includes("every 4 hours")) {
    return ["06:00", "10:00", "14:00", "18:00", "22:00"];
  }
  if (lower.includes("bedtime") || lower.includes("at night")) {
    return ["21:00"];
  }
  // Default: once daily in the morning
  return ["08:00"];
}
