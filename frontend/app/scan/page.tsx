"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import {
    Camera, CameraOff, ArrowDownToLine, ArrowUpFromLine,
    CheckCircle2, AlertTriangle, X, Boxes, ScanLine,
} from "lucide-react";
import { api, isLoggedIn } from "@/lib/api";
import Nav from "@/components/Nav";

type Scanned = {
    id: string;
    brand: string;
    series_name: string;
    size: string;
    finish: string | null;
    price_per_box: number;
    reorder_level: number;
    boxes_in_stock: number;
};

const inputStyle = {
    borderColor: "var(--color-grout)",
    ["--tw-ring-color" as any]: "var(--color-glaze)",
};

export default function ScanPage() {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const rafRef = useRef<number | null>(null);
    // Guards against the same sticker firing repeatedly while it sits in frame.
    const lastCodeRef = useRef<string>("");

    const [scanning, setScanning] = useState(false);
    const [camError, setCamError] = useState("");
    const [product, setProduct] = useState<Scanned | null>(null);
    const [lookupError, setLookupError] = useState("");

    const [moveType, setMoveType] = useState<"in" | "out">("out");
    const [boxes, setBoxes] = useState("");
    const [reference, setReference] = useState("");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState("");

    useEffect(() => {
        if (!isLoggedIn()) router.push("/login?next=%2Fscan");
    }, [router]);

    // Pull the product id out of whatever the sticker encodes. Labels hold a
    // full URL, but accept a bare uuid too so hand-made codes still work.
    function extractId(text: string): string | null {
        const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
        const match = text.match(uuid);
        return match ? match[0] : null;
    }

    const stopCamera = useCallback(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setScanning(false);
    }, []);

    async function handleHit(id: string) {
        stopCamera();
        setLookupError("");
        try {
            const { product: p, stock } = await api.getProduct(id);
            setProduct({
                id: p.id,
                brand: p.brand,
                series_name: p.series_name,
                size: p.size,
                finish: p.finish,
                price_per_box: p.price_per_box,
                reorder_level: p.reorder_level,
                boxes_in_stock: stock?.boxes_in_stock ?? 0,
            });
        } catch {
            setLookupError("That code isn't a tile in your catalogue.");
        }
    }

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

        if (code?.data && code.data !== lastCodeRef.current) {
            lastCodeRef.current = code.data;
            const id = extractId(code.data);
            if (id) {
                if (navigator.vibrate) navigator.vibrate(40);
                handleHit(id);
                return;
            }
        }
        rafRef.current = requestAnimationFrame(tick);
    }, [stopCamera]);

    async function startCamera() {
        setCamError("");
        setLookupError("");
        setProduct(null);
        setSaved("");
        lastCodeRef.current = "";
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                // Rear camera — the sticker is on the wall, not the operator's face.
                video: { facingMode: { ideal: "environment" } },
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setScanning(true);
            rafRef.current = requestAnimationFrame(tick);
        } catch {
            setCamError(
                "Couldn't open the camera. Allow camera access for this site, and note that browsers only permit it over HTTPS."
            );
        }
    }

    // Release the camera if the operator navigates away mid-scan.
    useEffect(() => stopCamera, [stopCamera]);

    async function recordMovement(e: React.FormEvent) {
        e.preventDefault();
        if (!product) return;
        setSaving(true);
        setSaved("");
        try {
            await api.recordMovement({
                product_id: product.id,
                movement_type: moveType,
                boxes: parseFloat(boxes),
                reference,
            });
            const delta = moveType === "in" ? parseFloat(boxes) : -parseFloat(boxes);
            setProduct({ ...product, boxes_in_stock: product.boxes_in_stock + delta });
            setSaved(`${moveType === "in" ? "Stock in" : "Stock out"} recorded.`);
            setBoxes("");
            setReference("");
        } catch (err: any) {
            setSaved(err.message);
        } finally {
            setSaving(false);
        }
    }

    const low = product && product.boxes_in_stock <= product.reorder_level;

    return (
        <div className="min-h-screen" style={{ background: "var(--color-kiln)" }}>
            <Nav />
            <main className="p-4 sm:p-6 max-w-lg mx-auto space-y-5 pb-10">
                <h1 className="font-[family-name:var(--font-display)] text-2xl" style={{ color: "var(--color-ink)" }}>
                    Scan a tile
                </h1>

                {/* ── Camera ─────────────────────────────────────── */}
                {!product && (
                    <div className="bg-white rounded-xl grout-border overflow-hidden">
                        <div
                            className="relative aspect-[4/3] flex items-center justify-center"
                            style={{ background: "var(--color-ink)" }}
                        >
                            <video
                                ref={videoRef}
                                playsInline
                                muted
                                className="absolute inset-0 w-full h-full object-cover"
                                style={{ opacity: scanning ? 1 : 0 }}
                            />
                            <canvas ref={canvasRef} className="hidden" />

                            {scanning ? (
                                /* Reticle — a tile-shaped frame, matching what they're aiming at */
                                <div className="relative w-48 h-48 pointer-events-none">
                                    {["top-0 left-0 border-t-2 border-l-2", "top-0 right-0 border-t-2 border-r-2",
                                        "bottom-0 left-0 border-b-2 border-l-2", "bottom-0 right-0 border-b-2 border-r-2"]
                                        .map((pos) => (
                                            <span
                                                key={pos}
                                                className={`absolute w-7 h-7 ${pos}`}
                                                style={{ borderColor: "#fff", borderRadius: 3 }}
                                            />
                                        ))}
                                    <span
                                        className="absolute left-0 right-0 h-px animate-pulse"
                                        style={{ top: "50%", background: "rgba(255,255,255,.7)" }}
                                    />
                                </div>
                            ) : (
                                <div className="relative text-center px-6">
                                    <Camera size={30} className="mx-auto mb-3" style={{ color: "rgba(255,255,255,.45)" }} />
                                    <p className="text-sm" style={{ color: "rgba(255,255,255,.7)" }}>
                                        Point the camera at the QR label on a display tile.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 space-y-3">
                            {camError && (
                                <p className="text-sm flex items-start gap-1.5" style={{ color: "var(--color-oxide)" }}>
                                    <CameraOff size={15} className="mt-0.5 shrink-0" />
                                    {camError}
                                </p>
                            )}
                            {lookupError && (
                                <p className="text-sm flex items-center gap-1.5" style={{ color: "var(--color-oxide)" }}>
                                    <AlertTriangle size={15} /> {lookupError}
                                </p>
                            )}

                            <button
                                onClick={scanning ? stopCamera : startCamera}
                                className="w-full rounded-md py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 text-white"
                                style={{ background: scanning ? "var(--color-ink-soft)" : "var(--color-glaze)" }}
                            >
                                {scanning ? <><X size={15} /> Stop scanning</> : <><ScanLine size={15} /> Start scanning</>}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Result + quick movement ────────────────────── */}
                {product && (
                    <>
                        <div className="bg-white rounded-xl grout-border p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h2 className="font-[family-name:var(--font-display)] text-xl leading-tight" style={{ color: "var(--color-ink)" }}>
                                        {product.brand} — {product.series_name}
                                    </h2>
                                    <p className="text-sm mt-0.5" style={{ color: "var(--color-ink-soft)" }}>
                                        {product.size}{product.finish ? ` · ${product.finish}` : ""}
                                        {product.price_per_box > 0 ? ` · ₹${product.price_per_box.toFixed(2)}/box` : ""}
                                    </p>
                                </div>
                                <button
                                    onClick={startCamera}
                                    className="shrink-0 text-xs px-3 py-1.5 rounded-md grout-border flex items-center gap-1"
                                    style={{ color: "var(--color-glaze-deep)" }}
                                >
                                    <ScanLine size={13} /> Next
                                </button>
                            </div>

                            <div className="flex items-center gap-2 mt-4">
                                <Boxes size={16} style={{ color: low ? "var(--color-ochre)" : "var(--color-moss)" }} />
                                <span
                                    className="font-[family-name:var(--font-mono)] text-2xl leading-none"
                                    style={{ color: low ? "var(--color-ochre)" : "var(--color-ink)" }}
                                >
                                    {product.boxes_in_stock}
                                </span>
                                <span className="text-sm" style={{ color: "var(--color-ink-soft)" }}>boxes in stock</span>
                            </div>
                            {low && (
                                <p className="text-xs mt-2 flex items-center gap-1.5" style={{ color: "var(--color-ochre)" }}>
                                    <AlertTriangle size={12} />
                                    At or below reorder level ({product.reorder_level})
                                </p>
                            )}
                        </div>

                        <form onSubmit={recordMovement} className="bg-white rounded-xl grout-border p-5 space-y-3">
                            {saved && (
                                <p className="text-sm flex items-center gap-1.5" style={{ color: "var(--color-moss)" }}>
                                    <CheckCircle2 size={14} /> {saved}
                                </p>
                            )}

                            <div className="flex gap-2 p-1 rounded-md" style={{ background: "var(--color-kiln-dim)" }}>
                                {(["in", "out"] as const).map((t) => {
                                    const active = moveType === t;
                                    const Icon = t === "in" ? ArrowDownToLine : ArrowUpFromLine;
                                    const colour = t === "in" ? "var(--color-moss)" : "var(--color-oxide)";
                                    return (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setMoveType(t)}
                                            className="flex-1 py-2 rounded text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
                                            style={active ? { background: colour, color: "#fff" } : { color: "var(--color-ink-soft)" }}
                                        >
                                            <Icon size={14} /> Stock {t === "in" ? "In" : "Out"}
                                        </button>
                                    );
                                })}
                            </div>

                            <input
                                type="number" step="0.01" min="0.01" required inputMode="decimal"
                                placeholder="Boxes"
                                value={boxes}
                                onChange={(e) => setBoxes(e.target.value)}
                                className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 font-[family-name:var(--font-mono)]"
                                style={inputStyle}
                            />
                            <input
                                placeholder="Reference / invoice (optional)"
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                                className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2"
                                style={inputStyle}
                            />

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full text-white rounded-md py-2.5 text-sm font-medium disabled:opacity-50"
                                style={{ background: moveType === "in" ? "var(--color-moss)" : "var(--color-oxide)" }}
                            >
                                {saving ? "Recording…" : `Record stock ${moveType}`}
                            </button>
                        </form>

                        <button
                            onClick={() => router.push(`/products/${product.id}`)}
                            className="w-full text-sm py-2.5 rounded-md grout-border bg-white"
                            style={{ color: "var(--color-ink-soft)" }}
                        >
                            Open full tile details
                        </button>
                    </>
                )}
            </main>
        </div>
    );
}