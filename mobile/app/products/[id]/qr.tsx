import { useEffect, useRef, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, TextInput, Switch, Image,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import QRCode from "react-native-qrcode-svg";
import * as SecureStore from "expo-secure-store";
import { api } from "@/lib/api";
import { C, TNUM } from "@/lib/theme";
import { Eyebrow, Loading } from "@/components/ui";
import { printLabel, type LabelConfig, type Template } from "@/lib/brotherPrint";

const WEB_URL = "https://www.proovatile.com";

/* Print is 732 dots wide (62mm @ 300dpi). Preview draws at 1/2.6 so
   every dot value here maps predictably onto the paper. */
const DOTS_W = 732;
const S = 2.6;
const PV_W = DOTS_W / S;

const TEMPLATES: { key: Template; label: string; height: number; blurb: string }[] = [
  { key: "rack",  label: "RACK TAG", height: 560,
    blurb: "Brand band, big design name, size and finish side by side. Reads down a rack at arm's length." },
  { key: "tower", label: "TOWER", height: 720,
    blurb: "Large centred QR with everything stacked below. Best when the label gets scanned more than read." },
  { key: "strip", label: "STRIP", height: 280,
    blurb: "Short and wide. Uses the least roll per label — good for high-volume runs." },
  { key: "boxed", label: "BOXED", height: 520,
    blurb: "Framed card, no solid fills. Least ink and no edge bleed on thermal paper." },
  { key: "custom", label: "CUSTOM", height: 400,
    blurb: "Build your own — position, sizes and alignment all adjustable." },
];

type Cfg = {
  template: Template;
  labelHeight: number;
  showBrand: boolean;
  showName: boolean;
  showSize: boolean;
  showFinish: boolean;
  extra: string;
  // custom only
  layout: "horizontal" | "vertical";
  qrAlign: "left" | "center" | "right";
  textAlign: "left" | "center" | "right";
  qrSize: number;
  brandSize: number;
  nameSize: number;
  metaSize: number;
  boldText: boolean;
};

const DEFAULTS: Cfg = {
  template: "rack",
  labelHeight: 560,
  showBrand: true,
  showName: true,
  showSize: true,
  showFinish: true,
  extra: "",
  layout: "horizontal",
  qrAlign: "left",
  textAlign: "left",
  qrSize: 70,
  brandSize: 30,
  nameSize: 48,
  metaSize: 30,
  boldText: true,
};

export default function ProductQRScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [copies, setCopies] = useState("1");
  const [printing, setPrinting] = useState(false);
  const [printerIp, setPrinterIp] = useState("");
  const [cfg, setCfg] = useState<Cfg>(DEFAULTS);
  const [openCustom, setOpenCustom] = useState(false);
  const [qrB64, setQrB64] = useState<string | null>(null);
  const svgRef = useRef<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => api.getProduct(id!),
    enabled: !!id,
  });

  useEffect(() => {
    SecureStore.getItemAsync("printer_ip").then((v) => v && setPrinterIp(v));
    SecureStore.getItemAsync("label_cfg").then((raw) => {
      if (raw) { try { setCfg({ ...DEFAULTS, ...JSON.parse(raw) }); } catch {} }
    });
  }, []);

  useEffect(() => {
    if (!data) return;
    const t = setTimeout(() => svgRef.current?.toDataURL?.((d: string) => d && setQrB64(d)), 300);
    return () => clearTimeout(t);
  }, [data]);

  function set<K extends keyof Cfg>(k: K, v: Cfg[K]) {
    const next = { ...cfg, [k]: v };
    setCfg(next);
    SecureStore.setItemAsync("label_cfg", JSON.stringify(next));
  }

  function pickTemplate(t: Template) {
    const preset = TEMPLATES.find((x) => x.key === t)!;
    const next = { ...cfg, template: t, labelHeight: preset.height };
    setCfg(next);
    SecureStore.setItemAsync("label_cfg", JSON.stringify(next));
    if (t === "custom") setOpenCustom(true);
  }

  function onIp(v: string) {
    setPrinterIp(v);
    SecureStore.setItemAsync("printer_ip", v);
  }

  async function print() {
    const ip = printerIp.trim();
    if (!ip) {
      Alert.alert("Printer IP needed",
        "Enter the QL-820NWB address.\n\nOn the printer: Menu → Network → WLAN → IP Address");
      return;
    }
    if (!svgRef.current) return;
    setPrinting(true);
    try {
      const b64: string = await new Promise((res, rej) =>
        svgRef.current.toDataURL((d: string) =>
          d ? res(d) : rej(new Error("Couldn't render the QR code."))));
      const n = Math.max(1, Math.min(24, parseInt(copies) || 1));
      const p = data?.product;

      const payload: LabelConfig = {
        template: cfg.template,
        labelHeight: cfg.labelHeight,
        brand: cfg.showBrand ? (p?.brand ?? "") : "",
        name: cfg.showName ? (p?.series_name ?? "") : "",
        size: cfg.showSize ? (p?.size ?? "") : "",
        finish: cfg.showFinish ? (p?.finish ?? "") : "",
        extra: cfg.extra.trim(),
        layout: cfg.layout,
        qrAlign: cfg.qrAlign,
        textAlign: cfg.textAlign,
        qrSize: cfg.qrSize,
        brandSize: cfg.brandSize,
        nameSize: cfg.nameSize,
        metaSize: cfg.metaSize,
        boldText: cfg.boldText,
      };

      await printLabel(ip, b64, n, payload);
      Alert.alert("Printed", `${n} label${n > 1 ? "s" : ""} sent to the printer.`);
    } catch (err: any) {
      Alert.alert("Print failed", String(err?.message ?? err));
    } finally {
      setPrinting(false);
    }
  }

  const p = data?.product;
  if (isLoading || !p) return <View className="flex-1 bg-bg"><Loading /></View>;

  const brand = cfg.showBrand ? (p.brand ?? "") : "";
  const name = cfg.showName ? (p.series_name ?? "") : "";
  const size = cfg.showSize ? (p.size ?? "") : "";
  const finish = cfg.showFinish ? (p.finish ?? "") : "";
  const pvH = cfg.labelHeight / S;
  const active = TEMPLATES.find((t) => t.key === cfg.template)!;

  const Qr = ({ px }: { px: number }) =>
    qrB64 ? (
      <Image source={{ uri: `data:image/png;base64,${qrB64}` }}
        style={{ width: px, height: px }} />
    ) : (
      <View style={{ width: px, height: px, backgroundColor: "#e5e5e5" }} />
    );

  /* Each preview mirrors its Kotlin counterpart at 1/2.6 scale. */
  function Preview() {
    const pad = 26 / S;

    if (cfg.template === "rack") {
      const qrPx = 180 / S;
      return (
        <View style={{ width: PV_W, height: pvH, backgroundColor: "#fff" }}>
          <View style={{ height: 70 / S, backgroundColor: "#000", justifyContent: "center", paddingHorizontal: pad }}>
            <Text numberOfLines={1} style={{ color: "#fff", fontSize: 38 / S, fontWeight: "700", letterSpacing: 1 }}>
              {brand.toUpperCase()}
            </Text>
          </View>
          <View style={{ paddingHorizontal: pad, paddingTop: 24 / S }}>
            <Text numberOfLines={1} style={{ fontSize: 112 / S, fontWeight: "700", color: "#000" }}>
              {name}
            </Text>
          </View>
          {(size || finish) && (
            <View style={{ paddingHorizontal: pad, marginTop: 20 / S }}>
              <View style={{ height: 2 / S, backgroundColor: "#000", marginBottom: 18 / S }} />
              <View style={{ flexDirection: "row" }}>
                {!!size && (
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 24 / S, fontWeight: "700", letterSpacing: 1, color: "#000" }}>SIZE</Text>
                    <Text style={{ fontSize: 40 / S, fontWeight: "700", color: "#000" }}>{size}</Text>
                  </View>
                )}
                {!!finish && (
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 24 / S, fontWeight: "700", letterSpacing: 1, color: "#000" }}>FINISH</Text>
                    <Text numberOfLines={1} style={{ fontSize: 40 / S, fontWeight: "700", color: "#000" }}>
                      {finish.toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
          <View style={{ position: "absolute", left: pad, bottom: pad, flexDirection: "row", alignItems: "center", gap: 24 / S }}>
            <Qr px={qrPx} />
            {!!cfg.extra && (
              <Text numberOfLines={1} style={{ fontSize: 28 / S, fontWeight: "700", color: "#000", letterSpacing: 1 }}>
                {cfg.extra.toUpperCase()}
              </Text>
            )}
          </View>
        </View>
      );
    }

    if (cfg.template === "tower") {
      const qrPx = (DOTS_W * 0.52) / S;
      return (
        <View style={{ width: PV_W, height: pvH, backgroundColor: "#fff", alignItems: "center", padding: pad }}>
          <Qr px={qrPx} />
          <View style={{ marginTop: 26 / S, alignItems: "center", width: "100%" }}>
            {!!brand && <Text numberOfLines={1} style={{ fontSize: 30 / S, fontWeight: "700", letterSpacing: 1, color: "#000" }}>{brand.toUpperCase()}</Text>}
            {!!name && <Text numberOfLines={1} style={{ fontSize: 88 / S, fontWeight: "700", color: "#000", marginTop: 8 / S }}>{name}</Text>}
            {(!!size || !!finish) && <View style={{ height: 2 / S, backgroundColor: "#000", width: "100%", marginVertical: 14 / S }} />}
            {!!size && <Text style={{ fontSize: 40 / S, fontWeight: "700", color: "#000" }}>{size}</Text>}
            {!!finish && <Text numberOfLines={1} style={{ fontSize: 40 / S, fontWeight: "700", color: "#000", marginTop: 8 / S }}>{finish.toUpperCase()}</Text>}
            {!!cfg.extra && <Text numberOfLines={1} style={{ fontSize: 30 / S, color: "#000", marginTop: 8 / S }}>{cfg.extra.toUpperCase()}</Text>}
          </View>
        </View>
      );
    }

    if (cfg.template === "strip") {
      const qrPx = Math.min(pvH - pad * 2, 220 / S);
      const meta = [size, finish.toUpperCase()].filter(Boolean).join("  ·  ");
      return (
        <View style={{ width: PV_W, height: pvH, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", padding: 22 / S, gap: 24 / S }}>
          <Qr px={qrPx} />
          <View style={{ flex: 1 }}>
            {!!brand && <Text numberOfLines={1} style={{ fontSize: 26 / S, fontWeight: "700", letterSpacing: 1, color: "#000" }}>{brand.toUpperCase()}</Text>}
            {!!name && <Text numberOfLines={1} style={{ fontSize: 66 / S, fontWeight: "700", color: "#000", marginTop: 8 / S }}>{name}</Text>}
            {!!meta && <Text numberOfLines={1} style={{ fontSize: 30 / S, color: "#000", marginTop: 8 / S }}>{meta}</Text>}
          </View>
        </View>
      );
    }

    if (cfg.template === "boxed") {
      const qrPx = 190 / S;
      const fields = [["SIZE", size], ["FINISH", finish.toUpperCase()]].filter((f) => f[1]);
      return (
        <View style={{ width: PV_W, height: pvH, backgroundColor: "#fff", padding: 20 / S }}>
          <View style={{ flex: 1, borderWidth: 3 / S, borderColor: "#000", padding: 18 / S }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                {!!brand && (
                  <View style={{ borderWidth: 3 / S, borderColor: "#000", alignSelf: "flex-start", paddingHorizontal: 10 / S, paddingVertical: 5 / S }}>
                    <Text numberOfLines={1} style={{ fontSize: 26 / S, fontWeight: "700", letterSpacing: 1, color: "#000" }}>
                      {brand.toUpperCase()}
                    </Text>
                  </View>
                )}
                {!!name && <Text numberOfLines={2} style={{ fontSize: 76 / S, fontWeight: "700", color: "#000", marginTop: 16 / S }}>{name}</Text>}
              </View>
              <Qr px={qrPx} />
            </View>
            {fields.length > 0 && (
              <View style={{ position: "absolute", left: 18 / S, right: 18 / S, bottom: 18 / S }}>
                <View style={{ height: 2 / S, backgroundColor: "#000", marginBottom: 16 / S }} />
                <View style={{ flexDirection: "row" }}>
                  {fields.map(([lab, val]) => (
                    <View key={lab} style={{ flex: 1 }}>
                      <Text style={{ fontSize: 22 / S, fontWeight: "700", letterSpacing: 1, color: "#000" }}>{lab}</Text>
                      <Text numberOfLines={1} style={{ fontSize: 36 / S, fontWeight: "700", color: "#000" }}>{val}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>
      );
    }

    // custom
    const meta = [size, finish].filter(Boolean).join(" · ");
    const qrPx = cfg.layout === "vertical"
      ? (cfg.qrSize / 100) * (pvH * 0.55)
      : (cfg.qrSize / 100) * (pvH - pad * 2);
    const ta = cfg.textAlign === "center" ? "center" as const
      : cfg.textAlign === "right" ? "right" as const : "left" as const;
    const ai = cfg.textAlign === "center" ? "center"
      : cfg.textAlign === "right" ? "flex-end" : "flex-start";

    const Block = () => (
      <View style={{ flex: cfg.layout === "horizontal" ? 1 : undefined, alignItems: ai, gap: 4 / S }}>
        {!!brand && <Text numberOfLines={1} style={{ fontSize: cfg.brandSize / S, fontWeight: "700", color: "#000", textAlign: ta }}>{brand.toUpperCase()}</Text>}
        {!!name && <Text numberOfLines={2} style={{ fontSize: cfg.nameSize / S, fontWeight: cfg.boldText ? "700" : "400", color: "#000", textAlign: ta }}>{name}</Text>}
        {!!meta && <Text numberOfLines={1} style={{ fontSize: cfg.metaSize / S, color: "#000", textAlign: ta }}>{meta}</Text>}
      </View>
    );

    return (
      <View style={{
        width: PV_W, height: pvH, backgroundColor: "#fff", padding: pad,
        flexDirection: cfg.layout === "vertical" ? "column" : "row",
        alignItems: "center", gap: 10,
      }}>
        {cfg.layout === "horizontal" ? (
          cfg.qrAlign === "right" ? <><Block /><Qr px={qrPx} /></>
            : <><Qr px={qrPx} /><Block /></>
        ) : (
          <View style={{ width: "100%", alignItems: cfg.qrAlign === "center" ? "center" : cfg.qrAlign === "right" ? "flex-end" : "flex-start", gap: 8 / S }}>
            <Qr px={qrPx} />
            <View style={{ width: "100%" }}><Block /></View>
          </View>
        )}
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ padding: 22, paddingBottom: 50 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ position: "absolute", opacity: 0 }} pointerEvents="none">
        <QRCode value={`${WEB_URL}/products/${id}`} size={400}
          color="#000000" backgroundColor="#ffffff"
          getRef={(c) => (svgRef.current = c)} />
      </View>

      {/* ── Preview ─────────────────────────────────────────── */}
      <Eyebrow className="mb-2.5">PREVIEW</Eyebrow>
      <View className="items-center border border-rule bg-field py-6">
        <Preview />
        <Text className="mt-3 font-mono text-[9px] tracking-[0.6px] text-ink-4">
          62MM ROLL · {cfg.labelHeight} DOTS ≈ {Math.round(cfg.labelHeight / 11.8)}MM TALL
        </Text>
      </View>

      {/* ── Template picker ─────────────────────────────────── */}
      <Eyebrow className="mb-2.5 mt-7">TEMPLATE</Eyebrow>
      <View className="flex-row flex-wrap gap-2">
        {TEMPLATES.map((t) => {
          const on = cfg.template === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => pickTemplate(t.key)}
              activeOpacity={0.85}
              className="border px-3.5 py-2.5"
              style={{
                backgroundColor: on ? C.accent : "transparent",
                borderColor: on ? C.accent : C.rule,
              }}
            >
              <Text className="font-mono text-[10px] tracking-[1px]"
                style={{ color: on ? C.onAccent : C.ink3 }}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text className="mt-2.5 font-mono text-[9px] leading-[15px] tracking-[0.6px] text-ink-4">
        {active.blurb.toUpperCase()}
      </Text>

      {/* ── Fields ──────────────────────────────────────────── */}
      <Eyebrow className="mb-2.5 mt-7">SHOW ON LABEL</Eyebrow>
      <Toggle label="BRAND" value={cfg.showBrand} onChange={(v) => set("showBrand", v)} />
      <Toggle label="DESIGN NAME" value={cfg.showName} onChange={(v) => set("showName", v)} />
      <Toggle label="SIZE" value={cfg.showSize} onChange={(v) => set("showSize", v)} />
      <Toggle label="FINISH" value={cfg.showFinish} onChange={(v) => set("showFinish", v)} />

      <View className="mt-2">
        <Eyebrow className="mb-2">EXTRA LINE (OPTIONAL)</Eyebrow>
        <TextInput
          value={cfg.extra}
          onChangeText={(v) => set("extra", v)}
          placeholder="Rack B3, or anything else"
          placeholderTextColor={C.ink4}
          className="border border-rule bg-field px-3.5 py-3 font-sans text-[14px] text-ink"
        />
      </View>

      <View className="mt-4">
        <Stepper label="LABEL HEIGHT" value={cfg.labelHeight} suffix=" dots"
          min={240} max={1000} step={40} onChange={(v) => set("labelHeight", v)} />
      </View>

      {/* ── Custom controls ─────────────────────────────────── */}
      {cfg.template === "custom" && (
        <>
          <TouchableOpacity
            onPress={() => setOpenCustom((v) => !v)}
            activeOpacity={0.8}
            className="mt-5 flex-row items-center justify-between border border-rule px-3.5 py-3"
          >
            <Text className="font-mono text-[10px] tracking-[1.6px] text-ink-3">
              CUSTOM LAYOUT
            </Text>
            <Text className="font-mono text-[11px] text-ink-3">{openCustom ? "−" : "+"}</Text>
          </TouchableOpacity>

          {openCustom && (
            <View className="mt-2">
              <Text className="mb-2 font-mono text-[10px] tracking-[1px] text-ink-3">ARRANGEMENT</Text>
              <Seg options={[{ key: "horizontal", label: "SIDE BY SIDE" }, { key: "vertical", label: "STACKED" }]}
                value={cfg.layout} onChange={(v) => set("layout", v as Cfg["layout"])} />

              <Text className="mb-2 mt-4 font-mono text-[10px] tracking-[1px] text-ink-3">QR POSITION</Text>
              <Seg options={[{ key: "left", label: "LEFT" }, { key: "center", label: "CENTRE" }, { key: "right", label: "RIGHT" }]}
                value={cfg.qrAlign} onChange={(v) => set("qrAlign", v as Cfg["qrAlign"])} />

              <Text className="mb-2 mt-4 font-mono text-[10px] tracking-[1px] text-ink-3">TEXT ALIGN</Text>
              <Seg options={[{ key: "left", label: "LEFT" }, { key: "center", label: "CENTRE" }, { key: "right", label: "RIGHT" }]}
                value={cfg.textAlign} onChange={(v) => set("textAlign", v as Cfg["textAlign"])} />

              <View className="mt-4">
                <Stepper label="QR SIZE" value={cfg.qrSize} suffix="%" min={30} max={95} step={5}
                  onChange={(v) => set("qrSize", v)} />
                <Stepper label="BRAND SIZE" value={cfg.brandSize} suffix=" dots" min={18} max={64} step={2}
                  onChange={(v) => set("brandSize", v)} />
                <Stepper label="NAME SIZE" value={cfg.nameSize} suffix=" dots" min={24} max={120} step={4}
                  onChange={(v) => set("nameSize", v)} />
                <Stepper label="SIZE/FINISH" value={cfg.metaSize} suffix=" dots" min={18} max={64} step={2}
                  onChange={(v) => set("metaSize", v)} />
                <Toggle label="BOLD DESIGN NAME" value={cfg.boldText} onChange={(v) => set("boldText", v)} />
              </View>
            </View>
          )}
        </>
      )}

      <Text className="mt-4 font-mono text-[9px] leading-[15px] tracking-[0.6px] text-ink-4">
        THE PRINTER HAS NO GREY — IT FAKES IT WITH A DOT PATTERN, WHICH IS
        WHAT MAKES SMALL TEXT LOOK FUZZY. EVERYTHING HERE PRINTS PURE BLACK
        AND STAYS ABOVE 18 DOTS.
      </Text>

      <TouchableOpacity
        onPress={() => { setCfg(DEFAULTS); SecureStore.setItemAsync("label_cfg", JSON.stringify(DEFAULTS)); }}
        activeOpacity={0.85}
        className="mt-4 items-center border border-rule py-3"
      >
        <Text className="font-mono text-[10px] tracking-[1px] text-ink-3">RESET TO DEFAULTS</Text>
      </TouchableOpacity>

      {/* ── Printer ─────────────────────────────────────────── */}
      <Eyebrow className="mb-2 mt-7">PRINTER IP ADDRESS</Eyebrow>
      <TextInput
        value={printerIp} onChangeText={onIp}
        placeholder="192.168.1.13" placeholderTextColor={C.ink4}
        keyboardType="decimal-pad" returnKeyType="done"
        className="border border-rule bg-field px-3.5 py-3.5 font-mono text-[15px] text-ink"
      />
      <Text className="mt-2 font-mono text-[9px] leading-[14px] tracking-[0.6px] text-ink-4">
        SAVED AUTOMATICALLY · MENU → NETWORK → WLAN → IP ADDRESS
      </Text>

      <View className="mt-5 flex-row items-center justify-between border border-rule bg-field px-3.5 py-3">
        <Eyebrow>COPIES</Eyebrow>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => setCopies((v) => String(Math.max(1, (parseInt(v) || 1) - 1)))} className="px-3 py-1">
            <Text className="font-sans text-[18px] text-ink-3">−</Text>
          </TouchableOpacity>
          <TextInput value={copies} onChangeText={setCopies} keyboardType="number-pad"
            className="w-10 p-0 text-center font-sans-sb text-[16px] text-ink" style={TNUM} />
          <TouchableOpacity onPress={() => setCopies((v) => String(Math.min(24, (parseInt(v) || 1) + 1)))} className="px-3 py-1">
            <Text className="font-sans text-[18px] text-ink-3">+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        onPress={print} disabled={printing} activeOpacity={0.85}
        className="mt-4 items-center bg-accent py-4"
        style={{ opacity: printing ? 0.6 : 1 }}
      >
        {printing ? <ActivityIndicator color={C.onAccent} />
          : <Text className="font-sans-m text-[14px] text-onAccent">Print label</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

/* ── Controls ──────────────────────────────────────────────── */

function Seg({ options, value, onChange }: {
  options: { key: string; label: string }[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <View className="flex-row">
      {options.map((o, i) => {
        const on = value === o.key;
        return (
          <TouchableOpacity key={o.key} onPress={() => onChange(o.key)} activeOpacity={0.8}
            className="flex-1 items-center border py-3"
            style={{
              backgroundColor: on ? C.accent : "transparent",
              borderColor: on ? C.accent : C.rule,
              marginLeft: i === 0 ? 0 : -1,
            }}>
            <Text className="font-mono text-[10px] tracking-[1px]"
              style={{ color: on ? C.onAccent : C.ink3 }}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Stepper({ label, value, suffix, min, max, step, onChange }: {
  label: string; value: number; suffix: string;
  min: number; max: number; step: number; onChange: (v: number) => void;
}) {
  return (
    <View className="mb-2 flex-row items-center justify-between border border-rule bg-field px-3.5 py-3">
      <Text className="font-mono text-[10px] tracking-[1px] text-ink-3">{label}</Text>
      <View className="flex-row items-center gap-2">
        <TouchableOpacity onPress={() => onChange(Math.max(min, value - step))} hitSlop={8} className="px-2">
          <Text className="font-sans text-[18px] text-ink-3">−</Text>
        </TouchableOpacity>
        <Text className="w-[76px] text-center font-mono text-[11px] text-ink" style={TNUM}>
          {value}{suffix}
        </Text>
        <TouchableOpacity onPress={() => onChange(Math.min(max, value + step))} hitSlop={8} className="px-2">
          <Text className="font-sans text-[18px] text-ink-3">+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Toggle({ label, value, onChange }: {
  label: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <View className="mb-2 flex-row items-center justify-between border border-rule bg-field px-3.5 py-3">
      <Text className="font-mono text-[10px] tracking-[1px] text-ink-3">{label}</Text>
      <Switch value={value} onValueChange={onChange}
        trackColor={{ false: C.rule, true: C.accent }} thumbColor="#fff" />
    </View>
  );
}