import { useState } from "react";
import {
    View, Text, ScrollView, TouchableOpacity, Modal,
    KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import Svg, { Path } from "react-native-svg";
import { api } from "@/lib/api";

import { TILE_SIZES, calcSqftPerBox } from "@/lib/tileSizes";
import { Eyebrow, Field, Segments } from "@/components/ui";
import { C, TNUM } from "@/lib/theme";
import { PhotoField } from "@/components/PhotoField";
import { uploadProductPhoto } from "@/lib/superbase";


type Category = "tile" | "material" | "sanitary";

const CATEGORIES: { key: Category; label: string }[] = [
    { key: "tile", label: "Tile" },
    { key: "material", label: "Material" },
    { key: "sanitary", label: "Sanitary" },
];

const UNITS: Record<Category, string[]> = {
    tile: ["box"],
    material: ["bag", "kg", "litre", "box", "piece"],
    sanitary: ["piece", "set", "pair"],
};

const FINISHES = ["Glossy", "Matte", "Satin", "Rustic", "Polished", "Carving", "Wooden"];

export default function NewProductScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();

    const [category, setCategory] = useState<Category>("tile");
    const [sizeOpen, setSizeOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const [form, setForm] = useState({
        brand: "", series_name: "", size: "", finish: "", hsn_code: "",
        unit: "box", location: "", pieces_per_box: "1", sqft_per_box: "",
        reorder_level: "10", price_per_box: "", cost_price: "",
    });

    const [photo, setPhoto] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

    function pickCategory(c: Category) {
        setCategory(c);
        // Clear tile-only fields so a bag of adhesive never carries a tile size.
        setForm((f) => ({
            ...f,
            unit: UNITS[c][0],
            size: c === "tile" ? f.size : "",
            sqft_per_box: c === "tile" ? f.sqft_per_box : "",
            pieces_per_box: c === "tile" ? f.pieces_per_box : "1",
        }));
    }

    function pickSize(value: string) {
        const pieces = parseInt(form.pieces_per_box) || 1;
        setForm((f) => ({ ...f, size: value, sqft_per_box: calcSqftPerBox(value, pieces) }));
        setSizeOpen(false);
    }

    function setPieces(v: string) {
        const pieces = parseInt(v) || 0;
        setForm((f) => ({
            ...f,
            pieces_per_box: v,
            sqft_per_box: f.size ? calcSqftPerBox(f.size, pieces) : f.sqft_per_box,
        }));
    }

    async function save() {
        if (!form.brand.trim() || !form.series_name.trim()) {
            setError("BRAND AND DESIGN NAME ARE REQUIRED");
            return;
        }
        if (category === "tile" && !form.size) {
            setError("PICK A SIZE FOR THIS TILE");
            return;
        }
        setBusy(true);
        setError("");
        try {
            let image_url = "";
            if (photo) {
                setUploading(true);
                image_url = await uploadProductPhoto(photo);
                setUploading(false);
            }
            await api.createProduct({
                ...form,
                category,
                image_url,
                pieces_per_box: parseInt(form.pieces_per_box) || 1,
                reorder_level: parseInt(form.reorder_level) || 0,
            });
            queryClient.invalidateQueries({ queryKey: ["products"] });
            queryClient.invalidateQueries({ queryKey: ["stock"] });
            router.back();
        } catch (err: any) {
            setError((err.message || "COULDN'T SAVE").toUpperCase());
        } finally {
            setBusy(false);
            setUploading(false);
        }
    }

    const sizeLabel = TILE_SIZES.find((s) => s.value === form.size)?.label;
    const sell = parseFloat(form.price_per_box);
    const cost = parseFloat(form.cost_price);
    const margin = sell > 0 && cost > 0 ? Math.round(((sell - cost) / sell) * 100) : null;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            className="flex-1 bg-bg"
        >
            <ScrollView
                contentContainerStyle={{ padding: 22, paddingBottom: 120 }}
                keyboardShouldPersistTaps="handled"
            >
                <PhotoField uri={photo} onPick={setPhoto} onClear={() => setPhoto(null)} />
                <Eyebrow className="mb-2.5">TYPE</Eyebrow>
                <Segments options={CATEGORIES} value={category} onChange={pickCategory} />
                <Text className="mb-7 mt-2.5 font-mono text-[10px] leading-[15px] tracking-[0.6px] text-ink-4">
                    {category === "tile"
                        ? "SIZE AND FINISH APPLY"
                        : category === "material"
                            ? "SOLD BY BAG, KG OR LITRE"
                            : "SOLD BY PIECE OR SET"}
                </Text>

                <Field label="Brand" value={form.brand} onChange={(v) => set("brand", v)}
                    placeholder="Kajaria, Somany, or a new name" />
                <Field label="Design name" value={form.series_name} onChange={(v) => set("series_name", v)}
                    placeholder="Dolomite Grey" />

                {category === "tile" ? (
                    <>
                        <View className="mb-5">
                            <Eyebrow className="mb-2">SIZE</Eyebrow>
                            <TouchableOpacity
                                onPress={() => setSizeOpen(true)}
                                activeOpacity={0.85}
                                className="flex-row items-center justify-between border border-rule bg-field px-3.5 py-3.5"
                            >
                                <Text className="font-sans text-[15px]" style={{ color: sizeLabel ? C.ink : C.ink4 }}>
                                    {sizeLabel ?? "Select a size"}
                                </Text>
                                <Svg width={11} height={7} viewBox="0 0 12 8" fill="none">
                                    <Path d="M1 1l5 5 5-5" stroke={C.ink3} strokeWidth={1.5} strokeLinecap="round" />
                                </Svg>
                            </TouchableOpacity>
                        </View>

                        <Field label="Finish" value={form.finish} onChange={(v) => set("finish", v)}
                            placeholder="Matte" />
                        <View className="-mt-2 mb-6 flex-row flex-wrap gap-2">
                            {FINISHES.map((f) => (
                                <TouchableOpacity
                                    key={f}
                                    onPress={() => set("finish", f)}
                                    activeOpacity={0.8}
                                    className="border border-rule px-2.5 py-1.5"
                                >
                                    <Text className="font-mono text-[10px] tracking-[0.6px] text-ink-3">
                                        {f.toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View className="flex-row gap-3">
                            <View className="flex-1">
                                <Field label="Pieces / box" value={form.pieces_per_box} onChange={setPieces} keyboard="number-pad" />
                            </View>
                            <View className="flex-1">
                                <Field
                                    label="Sq.ft / box"
                                    hint={form.size ? "auto" : undefined}
                                    value={form.sqft_per_box}
                                    onChange={(v) => set("sqft_per_box", v)}
                                    keyboard="decimal-pad"
                                />
                            </View>
                        </View>
                    </>
                ) : (
                    <View className="mb-5">
                        <Eyebrow className="mb-2">SOLD BY</Eyebrow>
                        <View className="flex-row flex-wrap gap-2">
                            {UNITS[category].map((u) => {
                                const on = form.unit === u;
                                return (
                                    <TouchableOpacity
                                        key={u}
                                        onPress={() => set("unit", u)}
                                        activeOpacity={0.8}
                                        className="border px-3.5 py-2"
                                        style={{
                                            backgroundColor: on ? C.accent : "transparent",
                                            borderColor: on ? C.accent : C.rule,
                                        }}
                                    >
                                        <Text className="font-mono text-[10px] tracking-[1px]" style={{ color: on ? C.onAccent : C.ink3 }}>
                                            {u.toUpperCase()}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        {category === "sanitary" && (
                            <View className="mt-5">
                                <Field label="Model / colour" value={form.finish} onChange={(v) => set("finish", v)}
                                    placeholder="White, Chrome, EWC 001" />
                            </View>
                        )}
                    </View>
                )}

                <View className="my-2 h-px bg-hairline" />

                <View className="mt-6 flex-row gap-3">
                    <View className="flex-1">
                        <Field label="Sells at" value={form.price_per_box} onChange={(v) => set("price_per_box", v)} keyboard="decimal-pad" placeholder="₹0" />
                    </View>
                    <View className="flex-1">
                        <Field label="Costs" value={form.cost_price} onChange={(v) => set("cost_price", v)} keyboard="decimal-pad" placeholder="₹0" />
                    </View>
                </View>

                {/* Margin as you type — you find out here, not on the list later */}
                {margin !== null && (
                    <View className="-mt-2 mb-6 flex-row items-baseline justify-between border border-rule bg-field px-3.5 py-3">
                        <Text className="font-mono text-[10px] tracking-[1px] text-ink-3">YOUR MARGIN</Text>
                        <Text
                            className="font-sans-sb text-[15px]"
                            style={{ color: margin < 10 ? C.red : margin < 20 ? C.amber : C.accent, ...TNUM }}
                        >
                            {margin}%  ·  ₹{Math.round(sell - cost).toLocaleString("en-IN")}
                        </Text>
                    </View>
                )}

                <Field label="Reorder level" value={form.reorder_level} onChange={(v) => set("reorder_level", v)}
                    keyboard="number-pad" hint="alerts below this" />
                <Field label="Godown location" value={form.location} onChange={(v) => set("location", v)}
                    placeholder="Rack B3, front wall" />
                <Field label="HSN code" value={form.hsn_code} onChange={(v) => set("hsn_code", v)} keyboard="number-pad" />

                {!!error && (
                    <Text className="font-mono text-[10px] leading-[15px] tracking-[1px] text-red">{error}</Text>
                )}
            </ScrollView>

            <View className="absolute bottom-0 left-0 right-0 border-t border-rule bg-bg px-[22px] pb-8 pt-3">
                <TouchableOpacity
                    onPress={save}
                    disabled={busy}
                    activeOpacity={0.85}
                    className="items-center bg-accent py-4"
                    style={{ opacity: busy ? 0.6 : 1 }}
                >
                    {busy && !uploading ? (
                        <ActivityIndicator color={C.onAccent} />
                    ) : (
                        <Text className="font-sans-m text-[14px] text-onAccent">
                            {uploading ? "Uploading photo…" : "Add product"}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Size picker */}
            <Modal visible={sizeOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSizeOpen(false)}>
                <View className="flex-1 bg-bg">
                    <View className="flex-row items-center justify-between border-b border-rule px-[22px] py-4">
                        <Text className="font-mono text-[11px] tracking-[1.4px] text-ink">SELECT SIZE</Text>
                        <TouchableOpacity onPress={() => setSizeOpen(false)} hitSlop={10}>
                            <Text className="font-mono text-[14px] text-ink-3">×</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView>
                        {TILE_SIZES.map((s) => (
                            <TouchableOpacity
                                key={s.value}
                                onPress={() => pickSize(s.value)}
                                activeOpacity={0.85}
                                className="flex-row items-baseline justify-between border-b border-hairline px-[22px] py-4"
                            >
                                <Text className="font-sans-m text-[15px]" style={{ color: form.size === s.value ? C.accent : C.ink }}>
                                    {s.label} mm
                                </Text>
                                <Text className="font-mono text-[10px] tracking-[0.6px] text-ink-3" style={TNUM}>
                                    {s.sqftPerPiece} SQ.FT / PIECE
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}