import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Svg, { Path } from "react-native-svg";
import { api } from "@/lib/api";
import { C, TNUM } from "@/lib/theme";
import { Field, Eyebrow, Loading } from "@/components/ui";
import { TILE_SIZES, calcSqftPerBox } from "@/lib/tileSizes";
import { PhotoField } from "@/components/PhotoField";
import { uploadProductPhoto } from "@/lib/superbase";


const FINISHES = ["Glossy", "Matte", "Satin", "Rustic", "Polished", "Carving", "Wooden"];
const UNITS: Record<string, string[]> = {
  tile: ["box"],
  material: ["bag", "kg", "litre", "box", "piece"],
  sanitary: ["piece", "set", "pair"],
};

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [sizeOpen, setSizeOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [form, setForm] = useState({
    brand: "", series_name: "", size: "", finish: "", hsn_code: "",
    unit: "box", location: "", pieces_per_box: "1", sqft_per_box: "",
    reorder_level: "10", price_per_box: "", cost_price: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => api.getProduct(id!),
    enabled: !!id,
  });

  const product = data?.product;
  const category: string = product?.category ?? "tile";

  // Hydrate once the product arrives. Numbers become strings because
  // TextInput only speaks strings; they're parsed back on save.
  useEffect(() => {
    if (!product) return;
    setForm({
      brand: product.brand ?? "",
      series_name: product.series_name ?? "",
      size: product.size ?? "",
      finish: product.finish ?? "",
      hsn_code: product.hsn_code ?? "",
      unit: product.unit ?? "box",
      location: product.location ?? "",
      pieces_per_box: String(product.pieces_per_box ?? 1),
      sqft_per_box: product.sqft_per_box != null ? String(product.sqft_per_box) : "",
      reorder_level: String(product.reorder_level ?? 0),
      price_per_box: product.price_per_box ? String(product.price_per_box) : "",
      cost_price: product.cost_price ? String(product.cost_price) : "",
    });
  }, [product]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

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
    setBusy(true);
    setError("");
    try {
      // "" means keep whatever photo is already on the record; a URL
      // replaces it; the sentinel asks the backend to clear it.
      let image_url = "";
      if (photo) {
        setUploading(true);
        image_url = await uploadProductPhoto(photo);
        setUploading(false);
      } else if (removePhoto) {
        image_url = "__CLEAR__";
      }

      await api.updateProduct(id!, {
        ...form,
        category,
        image_url,
        pieces_per_box: parseInt(form.pieces_per_box) || 1,
        reorder_level: parseInt(form.reorder_level) || 0,
      });

      queryClient.invalidateQueries({ queryKey: ["product", id] });
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

  function confirmDelete() {
    Alert.alert(
      "Delete product",
      `${form.brand} — ${form.series_name} will be removed. Its movement history stays in the activity log.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteProduct(id!);
              queryClient.invalidateQueries({ queryKey: ["products"] });
              queryClient.invalidateQueries({ queryKey: ["stock"] });
              router.replace("/(tabs)/products");
            } catch (err: any) {
              Alert.alert("Couldn't delete", err.message);
            }
          },
        },
      ]
    );
  }

  if (isLoading || !product) return <View className="flex-1 bg-bg"><Loading /></View>;

  const sizeLabel = TILE_SIZES.find((s) => s.value === form.size)?.label ?? form.size;
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
        <PhotoField
          uri={photo}
          existing={removePhoto ? null : product.image_url}
          onPick={(u) => { setPhoto(u); setRemovePhoto(false); }}
          onClear={() => { setPhoto(null); setRemovePhoto(true); }}
        />

        {/* Category is fixed after creation — switching would strand the
            size data and collide with the per-category unique indexes. */}
        <View className="mb-7 flex-row items-baseline justify-between border border-rule bg-field px-3.5 py-3">
          <Text className="font-mono text-[10px] tracking-[1px] text-ink-3">TYPE</Text>
          <Text className="font-mono text-[10px] tracking-[1px] text-ink-2">
            {category.toUpperCase()} · FIXED
          </Text>
        </View>

        <Field label="Brand" value={form.brand} onChange={(v) => set("brand", v)} />
        <Field label="Design name" value={form.series_name} onChange={(v) => set("series_name", v)} />

        {category === "tile" ? (
          <>
            <View className="mb-5">
              <Eyebrow className="mb-2">SIZE</Eyebrow>
              <TouchableOpacity
                onPress={() => setSizeOpen(true)}
                activeOpacity={0.85}
                className="flex-row items-center justify-between border border-rule bg-field px-3.5 py-3.5"
              >
                <Text className="font-sans text-[15px]" style={{ color: form.size ? C.ink : C.ink4 }}>
                  {sizeLabel || "Select a size"}
                </Text>
                <Svg width={11} height={7} viewBox="0 0 12 8" fill="none">
                  <Path d="M1 1l5 5 5-5" stroke={C.ink3} strokeWidth={1.5} strokeLinecap="round" />
                </Svg>
              </TouchableOpacity>
            </View>

            <Field label="Finish" value={form.finish} onChange={(v) => set("finish", v)} />
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
              {(UNITS[category] ?? UNITS.material).map((u) => {
                const on = form.unit === u;
                return (
                  <TouchableOpacity
                    key={u}
                    onPress={() => set("unit", u)}
                    activeOpacity={0.8}
                    className="border px-3.5 py-2"
                    style={{ backgroundColor: on ? C.accent : "transparent", borderColor: on ? C.accent : C.rule }}
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
                <Field label="Model / colour" value={form.finish} onChange={(v) => set("finish", v)} />
              </View>
            )}
          </View>
        )}

        <View className="my-2 h-px bg-hairline" />

        <View className="mt-6 flex-row gap-3">
          <View className="flex-1">
            <Field label="Sells at" value={form.price_per_box} onChange={(v) => set("price_per_box", v)} keyboard="decimal-pad" />
          </View>
          <View className="flex-1">
            <Field label="Costs" value={form.cost_price} onChange={(v) => set("cost_price", v)} keyboard="decimal-pad" />
          </View>
        </View>

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

        <Field label="Reorder level" value={form.reorder_level} onChange={(v) => set("reorder_level", v)} keyboard="number-pad" />
        <Field label="Godown location" value={form.location} onChange={(v) => set("location", v)} placeholder="Rack B3" />
        <Field label="HSN code" value={form.hsn_code} onChange={(v) => set("hsn_code", v)} keyboard="number-pad" />

        {!!error && (
          <Text className="mb-4 font-mono text-[10px] leading-[15px] tracking-[1px] text-red">{error}</Text>
        )}

        <TouchableOpacity
          onPress={confirmDelete}
          activeOpacity={0.85}
          className="mt-2 items-center border py-3.5"
          style={{ borderColor: C.red }}
        >
          <Text className="font-sans-m text-[13px]" style={{ color: C.red }}>Delete product</Text>
        </TouchableOpacity>
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
              {uploading ? "Uploading photo…" : "Save changes"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

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