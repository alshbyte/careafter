"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAnalytics } from "@/components/analytics-provider";
import { LanguageSelector } from "@/components/language-selector";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/types";

type CaptureState = "idle" | "camera" | "preview" | "uploading" | "error";

export default function ScanPage() {
  const [state, setState] = useState<CaptureState>("idle");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const router = useRouter();
  const { trackEvent } = useAnalytics();

  // Track scan_started when the page mounts
  useEffect(() => {
    trackEvent("scan_started");
    // Restore language preference from sessionStorage
    const savedLang = sessionStorage.getItem("careafter_language");
    if (savedLang) setSelectedLanguage(savedLang);
  }, [trackEvent]);

  const handleLanguageSelect = useCallback((lang: SupportedLanguage) => {
    setSelectedLanguage(lang.code);
    sessionStorage.setItem("careafter_language", lang.code);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState("camera");
    } catch {
      setErrorMessage("Camera access denied. You can upload a photo instead.");
      setState("error");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedImage(dataUrl);
    stopCamera();
    setState("preview");
    trackEvent("scan_completed", { method: "camera" });
  }, [stopCamera, trackEvent]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select an image file (JPEG, PNG, etc.)");
      setState("error");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result as string);
      setState("preview");
      trackEvent("scan_completed", { method: "upload" });
    };
    reader.readAsDataURL(file);
  }, [trackEvent]);

  const submitForExtraction = useCallback(async () => {
    if (!capturedImage) return;
    setState("uploading");

    try {
      const base64 = capturedImage.split(",")[1];

      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, language: selectedLanguage }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errBody.error || `Server error ${response.status}`);
      }

      const result = await response.json();

      // Attach language to the extracted data so downstream pages know
      if (result.data) {
        result.data.language = selectedLanguage;
      }

      // Store in sessionStorage for the confirm page
      sessionStorage.setItem("careafter_extraction", JSON.stringify(result));
      router.push("/confirm");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setErrorMessage(msg);
      setState("error");
    }
  }, [capturedImage, router, selectedLanguage]);

  const retake = useCallback(() => {
    setCapturedImage(null);
    setErrorMessage("");
    setState("idle");
  }, []);

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "var(--color-bg)" }}>
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-4" style={{ backgroundColor: "var(--color-surface)" }}>
        <Link
          href="/"
          className="flex items-center justify-center rounded-xl px-3 py-2 text-base font-medium"
          style={{ color: "var(--color-primary)", minHeight: "var(--touch-target)" }}
          aria-label="Back to home"
        >
          ← Back
        </Link>
        <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
          Scan Your Papers
        </h1>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-8">
        {/* Idle — choose capture method */}
        {state === "idle" && (
          <div className="w-full max-w-md space-y-6 text-center">
            <div className="text-6xl" aria-hidden="true">📄</div>
            <h2 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
              Take a photo of your discharge summary
            </h2>
            <p className="text-base" style={{ color: "var(--color-text-secondary)" }}>
              Make sure all the text is readable. You can take multiple photos if needed.
            </p>

            {/* Language Selector */}
            <div
              className="rounded-2xl p-4 text-left"
              style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              <LanguageSelector
                selectedLanguage={selectedLanguage}
                onSelect={handleLanguageSelect}
              />
            </div>

            <div className="space-y-4">
              <button
                onClick={startCamera}
                className="flex w-full items-center justify-center gap-3 rounded-2xl px-6 py-4 text-lg font-semibold text-white shadow-md transition-all hover:shadow-lg active:scale-[0.98]"
                style={{ backgroundColor: "var(--color-primary)", minHeight: "var(--touch-target)" }}
              >
                <span aria-hidden="true">📷</span>
                Open Camera
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 px-6 py-4 text-lg font-semibold transition-all active:scale-[0.98]"
                style={{
                  borderColor: "var(--color-primary)",
                  color: "var(--color-primary)",
                  backgroundColor: "var(--color-surface)",
                  minHeight: "var(--touch-target)",
                }}
              >
                <span aria-hidden="true">📁</span>
                Upload a Photo
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              aria-label="Upload photo of discharge summary"
            />

            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              🔒 Your photo is processed securely and never stored on our servers.
            </p>
          </div>
        )}

        {/* Camera view */}
        {state === "camera" && (
          <div className="w-full max-w-lg space-y-4">
            <video
              ref={videoRef}
              className="w-full rounded-2xl shadow-lg"
              playsInline
              autoPlay
              muted
              style={{ maxHeight: "60vh", objectFit: "cover" }}
            />
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex gap-4">
              <button
                onClick={() => { stopCamera(); setState("idle"); }}
                className="flex-1 rounded-2xl border-2 px-4 py-4 text-lg font-semibold"
                style={{
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-secondary)",
                  minHeight: "var(--touch-target)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={capturePhoto}
                className="flex-1 rounded-2xl px-4 py-4 text-lg font-semibold text-white shadow-md"
                style={{ backgroundColor: "var(--color-primary)", minHeight: "var(--touch-target)" }}
              >
                📸 Capture
              </button>
            </div>
          </div>
        )}

        {/* Preview captured image */}
        {state === "preview" && capturedImage && (
          <div className="w-full max-w-lg space-y-6">
            <h2 className="text-center text-xl font-bold" style={{ color: "var(--color-text)" }}>
              Is the text readable?
            </h2>
            <img
              src={capturedImage}
              alt="Captured discharge summary"
              className="w-full rounded-2xl shadow-lg"
              style={{ maxHeight: "50vh", objectFit: "contain" }}
            />
            <div className="flex gap-4">
              <button
                onClick={retake}
                className="flex-1 rounded-2xl border-2 px-4 py-4 text-lg font-semibold"
                style={{
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-secondary)",
                  minHeight: "var(--touch-target)",
                }}
              >
                Retake
              </button>
              <button
                onClick={submitForExtraction}
                className="flex-1 rounded-2xl px-4 py-4 text-lg font-semibold text-white shadow-md"
                style={{ backgroundColor: "var(--color-primary)", minHeight: "var(--touch-target)" }}
              >
                ✨ Analyze
              </button>
            </div>
            <p className="text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
              🔒 Your photo is encrypted before processing and deleted immediately after.
            </p>
          </div>
        )}

        {/* Uploading / Processing */}
        {state === "uploading" && (
          <div className="text-center space-y-6">
            <div className="text-6xl animate-pulse" aria-hidden="true">✨</div>
            <h2 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
              {selectedLanguage !== "en"
                ? `Reading & translating your papers...`
                : "Reading your discharge papers..."}
            </h2>
            <p className="text-base" style={{ color: "var(--color-text-secondary)" }}>
              {selectedLanguage !== "en"
                ? `Extracting your medications, follow-ups, and warning signs — and translating into ${SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.nativeName ?? "your language"}.`
                : "This usually takes about 10 seconds. We're extracting your medications, follow-ups, and warning signs."}
            </p>
            <div
              className="mx-auto h-2 w-48 overflow-hidden rounded-full"
              style={{ backgroundColor: "var(--color-surface-alt)" }}
            >
              <div
                className="h-full animate-[loading_2s_ease-in-out_infinite] rounded-full"
                style={{ backgroundColor: "var(--color-primary)", width: "60%" }}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {state === "error" && (
          <div className="w-full max-w-md space-y-6 text-center">
            <div className="text-6xl" aria-hidden="true">😔</div>
            <h2 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
              Something went wrong
            </h2>
            <p className="text-base" style={{ color: "var(--color-text-secondary)" }}>
              {errorMessage}
            </p>
            <button
              onClick={retake}
              className="rounded-2xl px-8 py-4 text-lg font-semibold text-white shadow-md"
              style={{ backgroundColor: "var(--color-primary)", minHeight: "var(--touch-target)" }}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
