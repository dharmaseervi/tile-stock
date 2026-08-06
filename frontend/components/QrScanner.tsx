"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Camera, CameraOff, X, ScanLine } from "lucide-react";

/**
 * Inline QR scanner.
 *
 * Runs continuously and calls onHit with the product id each time it reads a
 * new code, so a dealer can walk the wall adding tile after tile without
 * stopping and restarting the camera between each one.
 */
export default function QrScanner({
  onHit,
  onClose,
  /** Codes already handled — re-reading these is ignored rather than duplicated. */
  seenIds = [],
  hint = "Point at the QR label on a display tile",
}: {
  onHit: (productId: string) => void;
  onClose?: () => void;
  seenIds?: string[];
  hint?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  // Rate-limits repeat reads while a sticker sits in frame.
  const lastRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const seenRef = useRef<string[]>(seenIds);

  const [active, setActive] = useState(false);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState(false);

  useEffect(() => { seenRef.current = seenIds; }, [seenIds]);

  function extractId(text: string): string | null {
    const m = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    return m ? m[0] : null;
  }

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActive(false);
  }, []);

  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });

    if (code?.data) {
      const now = Date.now();
      const isRepeat = code.data === lastRef.current.code && now - lastRef.current.at < 2500;
      if (!isRepeat) {
        const id = extractId(code.data);
        if (id && !seenRef.current.includes(id)) {
          lastRef.current = { code: code.data, at: now };
          if (navigator.vibrate) navigator.vibrate(40);
          setFlash(true);
          setTimeout(() => setFlash(false), 260);
          onHit(id);
        }
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [onHit]);

  const start = useCallback(async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setError("Couldn't open the camera. Allow camera access — browsers only permit it over HTTPS.");
    }
  }, [tick]);

  useEffect(() => {
    start();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-grout)" }}>
      <div className="relative aspect-[4/3] flex items-center justify-center" style={{ background: "var(--color-ink)" }}>
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: active ? 1 : 0 }}
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Green wash on a successful read — visible while the phone is at arm's length */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-200"
          style={{ background: "var(--color-moss)", opacity: flash ? 0.4 : 0 }}
        />

        {active ? (
          <div className="relative w-44 h-44 pointer-events-none">
            {["top-0 left-0 border-t-2 border-l-2", "top-0 right-0 border-t-2 border-r-2",
              "bottom-0 left-0 border-b-2 border-l-2", "bottom-0 right-0 border-b-2 border-r-2"].map((pos) => (
              <span key={pos} className={`absolute w-7 h-7 ${pos}`} style={{ borderColor: "#fff", borderRadius: 3 }} />
            ))}
          </div>
        ) : (
          <div className="relative text-center px-6">
            <Camera size={26} className="mx-auto mb-2" style={{ color: "rgba(255,255,255,.45)" }} />
            <p className="text-sm" style={{ color: "rgba(255,255,255,.7)" }}>{hint}</p>
          </div>
        )}

        {onClose && (
          <button
            type="button"
            onClick={() => { stop(); onClose(); }}
            className="absolute top-3 right-3 p-2 rounded-full"
            style={{ background: "rgba(0,0,0,.45)", color: "#fff" }}
            aria-label="Close scanner"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {(error || active) && (
        <div className="px-4 py-2.5 bg-white">
          {error ? (
            <p className="text-sm flex items-start gap-1.5" style={{ color: "var(--color-oxide)" }}>
              <CameraOff size={14} className="mt-0.5 shrink-0" />
              {error}
            </p>
          ) : (
            <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--color-ink-soft)" }}>
              <ScanLine size={12} />
              Scanning — keep pointing at each tile in turn.
            </p>
          )}
        </div>
      )}
    </div>
  );
}