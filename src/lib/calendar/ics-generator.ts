/**
 * LEARN-ALONG: iCalendar (.ics) File Generation
 * ================================================
 * 
 * THE SMARTEST REMINDER APPROACH:
 * Instead of building our own notification system, we piggyback on
 * the one your phone already has — the Calendar app.
 * 
 * iCalendar (.ics) is a universal standard (RFC 5545) supported by:
 * - Apple Calendar (iPhone/iPad/Mac)
 * - Google Calendar (Android/Web)
 * - Outlook (Windows/Mac/Web)
 * - Samsung Calendar
 * - Every calendar app ever made
 * 
 * When the user downloads an .ics file, their phone says:
 * "Would you like to add these events to your calendar?"
 * They tap "Add" and boom — native reminders with native alarms.
 * 
 * WHY THIS IS GENIUS:
 * 1. Zero server cost (generated entirely client-side)
 * 2. No permission dialogs (calendar is already on their phone)
 * 3. Works offline forever (calendar doesn't need internet)
 * 4. Native snooze/dismiss (OS handles it)
 * 5. Users already trust their calendar app
 * 6. Works on EVERY phone, tablet, and computer
 * 
 * THE .ICS FORMAT:
 * It's just a text file with a specific structure. Think of it as
 * "HTML for calendar events." Here's the anatomy:
 * 
 * BEGIN:VCALENDAR          ← "Start of calendar file"
 * VERSION:2.0              ← "I'm using iCalendar version 2"
 * BEGIN:VEVENT             ← "Here's an event"
 *   DTSTART:20240115T080000 ← "Starts at 8:00 AM on Jan 15"
 *   RRULE:FREQ=DAILY       ← "Repeats daily" (optional)
 *   SUMMARY:Take Lisinopril ← "Event title"
 *   BEGIN:VALARM            ← "Set an alarm"
 *     TRIGGER:PT0M          ← "0 minutes before = at the exact time"
 *     ACTION:DISPLAY        ← "Show a notification"
 *   END:VALARM
 * END:VEVENT
 * END:VCALENDAR
 */

import type { Medication, FollowUp } from "@/types";

/**
 * Format a Date as an iCalendar datetime string.
 * iCalendar uses the format: YYYYMMDDTHHMMSS
 */
function formatICSDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    date.getFullYear().toString() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    "T" +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

/**
 * Generate a unique ID for each calendar event.
 * iCalendar requires a globally unique UID for each event.
 */
function generateUID(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}@careafter.app`;
}

/**
 * Escape special characters in iCalendar text.
 * LEARN: iCalendar has its own escaping rules — commas, semicolons,
 * newlines, and backslashes all need escaping.
 */
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Parse a time string like "08:00" and a reference date into a Date.
 */
function parseTimeToDate(timeStr: string, referenceDate: Date): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const date = new Date(referenceDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Parse a duration string like "30 days", "2 weeks", "ongoing" into days.
 */
function parseDurationToDays(duration: string | undefined): number {
  if (!duration) return 30;
  const lower = duration.toLowerCase().trim();

  if (["ongoing", "indefinite", "long-term", "continuous"].includes(lower)) {
    return 90; // 3 months — user can extend in their calendar
  }

  const match = lower.match(/(\d+)\s*(day|week|month)/);
  if (match) {
    const num = parseInt(match[1]);
    if (match[2] === "day") return num;
    if (match[2] === "week") return num * 7;
    if (match[2] === "month") return num * 30;
  }

  return 30;
}

/**
 * Determine reminder times from frequency/timing strings.
 * Returns times like ["08:00", "20:00"].
 */
function frequencyToTimes(frequency: string | undefined, timing?: string): string[] {
  if (timing) {
    const t = timing.toLowerCase();
    if (t.includes("morning") && t.includes("evening")) return ["08:00", "20:00"];
    if (t.includes("morning")) return ["08:00"];
    if (t.includes("bedtime")) return ["21:00"];
    if (t.includes("evening") || t.includes("night")) return ["20:00"];
  }

  if (!frequency) return ["08:00"];
  const f = frequency.toLowerCase();

  if (f.includes("twice") || f.includes("2x") || f.includes("bid")) return ["08:00", "20:00"];
  if (f.includes("three") || f.includes("3x") || f.includes("tid")) return ["08:00", "14:00", "20:00"];
  if (f.includes("four") || f.includes("4x") || f.includes("qid")) return ["08:00", "12:00", "16:00", "20:00"];
  if (f.includes("every 8")) return ["08:00", "16:00", "00:00"];
  if (f.includes("every 12")) return ["08:00", "20:00"];
  if (f.includes("every 6")) return ["06:00", "12:00", "18:00", "00:00"];

  return ["08:00"];
}

// ===== MEDICATION EVENTS =====

function generateMedicationEvent(
  med: Medication,
  time: string,
  startDate: Date,
  durationDays: number
): string {
  const eventStart = parseTimeToDate(time, startDate);
  const eventEnd = new Date(eventStart.getTime() + 15 * 60 * 1000);

  const specialNote = med.specialInstructions
    ? `\\n\\n📝 ${escapeICS(med.specialInstructions)}`
    : "";

  return [
    "BEGIN:VEVENT",
    `UID:${generateUID()}`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(eventStart)}`,
    `DTEND:${formatICSDate(eventEnd)}`,
    `RRULE:FREQ=DAILY;COUNT=${durationDays}`,
    `SUMMARY:💊 Take ${escapeICS(med.name)} ${escapeICS(med.dosage)}`,
    `DESCRIPTION:Medication: ${escapeICS(med.name)}\\nDosage: ${escapeICS(med.dosage)}\\nFrequency: ${escapeICS(med.frequency ?? "As prescribed")}${specialNote}\\n\\nFrom your CareAfter discharge plan.`,
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:PT0M",
    "ACTION:DISPLAY",
    `DESCRIPTION:Time to take ${escapeICS(med.name)} ${escapeICS(med.dosage)}`,
    "END:VALARM",
    "BEGIN:VALARM",
    "TRIGGER:-PT5M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeICS(med.name)} in 5 minutes`,
    "END:VALARM",
    "END:VEVENT",
  ].join("\r\n");
}

// ===== FOLLOW-UP APPOINTMENT EVENTS =====

function generateFollowUpEvent(followUp: FollowUp, referenceDate: Date): string {
  const targetDate = new Date(referenceDate);
  const timeframe = followUp.timeframe?.toLowerCase() ?? "";

  const daysMatch = timeframe.match(/(\d+)\s*day/);
  const weeksMatch = timeframe.match(/(\d+)\s*week/);

  if (daysMatch) {
    targetDate.setDate(targetDate.getDate() + parseInt(daysMatch[1]));
  } else if (weeksMatch) {
    targetDate.setDate(targetDate.getDate() + parseInt(weeksMatch[1]) * 7);
  } else {
    targetDate.setDate(targetDate.getDate() + 7);
  }

  targetDate.setHours(9, 0, 0, 0);
  const endDate = new Date(targetDate.getTime() + 60 * 60 * 1000);

  const phone = followUp.phoneNumber ? `\\nPhone: ${escapeICS(followUp.phoneNumber)}` : "";
  const reason = followUp.reason ? `\\nReason: ${escapeICS(followUp.reason)}` : "";

  return [
    "BEGIN:VEVENT",
    `UID:${generateUID()}`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(targetDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:📅 Schedule: ${escapeICS(followUp.provider)}${followUp.specialty ? ` (${escapeICS(followUp.specialty)})` : ""}`,
    `DESCRIPTION:Follow-up with ${escapeICS(followUp.provider)}\\nSchedule within: ${escapeICS(followUp.timeframe ?? "1 week")}${phone}${reason}\\n\\n⚠️ Call to schedule this appointment!\\n\\nFrom your CareAfter discharge plan.`,
    "STATUS:TENTATIVE",
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    `DESCRIPTION:Reminder: Schedule follow-up with ${escapeICS(followUp.provider)}`,
    "END:VALARM",
    "BEGIN:VALARM",
    "TRIGGER:PT0M",
    "ACTION:DISPLAY",
    `DESCRIPTION:Today: Follow-up with ${escapeICS(followUp.provider)} is due`,
    "END:VALARM",
    "END:VEVENT",
  ].join("\r\n");
}

// ===== MAIN EXPORT =====

export interface CalendarExportOptions {
  medications?: Medication[];
  followUps?: FollowUp[];
  patientName?: string;
  dischargeDate?: string;
}

/**
 * Generate a complete .ics calendar file with medication reminders
 * and follow-up appointment deadlines.
 */
export function generateCalendarFile(options: CalendarExportOptions): string {
  const { medications = [], followUps = [], patientName, dischargeDate } = options;

  const startDate = dischargeDate ? new Date(dischargeDate) : new Date();
  if (isNaN(startDate.getTime()) || startDate < new Date()) {
    startDate.setTime(Date.now());
    startDate.setDate(startDate.getDate() + 1);
  }
  startDate.setHours(0, 0, 0, 0);

  const events: string[] = [];

  for (const med of medications) {
    const times = frequencyToTimes(med.frequency, med.timing);
    const days = parseDurationToDays(med.duration);
    for (const time of times) {
      events.push(generateMedicationEvent(med, time, startDate, days));
    }
  }

  for (const fu of followUps) {
    events.push(generateFollowUpEvent(fu, startDate));
  }

  const calName = patientName ? `${patientName}'s Recovery Plan` : "CareAfter Recovery Plan";

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CareAfter//Recovery Plan//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeICS(calName)}`,
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

/**
 * Trigger a .ics file download in the browser.
 * 
 * LEARN: On mobile:
 * - iOS: Opens "Add to Calendar" sheet automatically
 * - Android: Opens default calendar with "Add events?" prompt
 * - Desktop: Downloads file, user opens in calendar app
 */
export function downloadCalendarFile(
  options: CalendarExportOptions,
  filename: string = "careafter-reminders.ics"
): void {
  const icsContent = generateCalendarFile(options);
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}
