import { useRef, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, TextInput } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import QRCode from "react-native-qrcode-svg";
import * as Print from "expo-print";
import { api } from "@/lib/api";
import { C, TNUM } from "@/lib/theme";
import { Eyebrow, Loading } from "@/components/ui";

// The payload is a URL so a generic camera app still resolves to something
// useful; the in-app scanner just pulls the UUID out of it.
const WEB_URL = "https://tile-stock-orcin.vercel.app";

export default function ProductQRScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [copies, setCopies] = useState("4");
  const [printing, setPrinting] = useState(false);
  const svgRef = useRef<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => api.getProduct(id!),
    enabled: !!id,
  });

  const p = data?.product;

  async function print() {
    if (!svgRef.current || !p) return;
    setPrinting(true);
    try {
      // A live SVG component can't be printed — pull it out as base64 and
      // embed it in the print HTML instead.
      const base64: string = await new Promise((resolve, reject) => {
        svgRef.current.toDataURL((d: string) =>
          d ? resolve(d) : reject(new Error("Couldn't render the QR code."))
        );
      });

      const n = Math.max(1, Math.min(24, parseInt(copies) || 1));
      const meta = [p.size, p.finish].filter(Boolean).join(" · ");
      const label = `
        <div class="l">
          <img src="data:image/png;base64,${base64}" />
          <div class="t">
            <div class="b">${esc(p.brand)}</div>
            <div class="s">${esc(p.series_name)}</div>
            <div class="m">${esc(meta)}</div>
          </div>
        </div>`;

      await Print.printAsync({
        html: `<html><head><meta charset="utf-8"><style>
          @page { margin: 10mm; }
          body { font-family: -apple-system, Helvetica, sans-serif; margin:0;
                 display:flex; flex-wrap:wrap; gap:6mm; }
          .l { width:45mm; border:1px solid #ddd; padding:3mm; display:flex;
               align-items:center; gap:3mm; page-break-inside:avoid; }
          .l img { width:18mm; height:18mm; }
          .t { flex:1; min-width:0; }
          .b { font-size:7pt; color:#78716C; text-transform:uppercase; letter-spacing:.5pt; }
          .s { font-size:10pt; font-weight:700; color:#1C1917; margin-top:.5mm; }
          .m { font-size:7pt; color:#78716C; margin-top:.5mm; }
        </style></head><body>${label.repeat(n)}</body></html>`,
      });
    } catch (err: any) {
      Alert.alert("Couldn't print", err.message);
    } finally {
      setPrinting(false);
    }
  }

  if (isLoading || !p) return <View className="flex-1 bg-bg"><Loading /></View>;

  return (
    <View className="flex-1 bg-bg px-[22px] pt-6">
      {/* Preview mirrors what actually prints */}
      <View className="items-center border border-rule bg-field py-8">
        <View className="bg-white p-3">
          <QRCode
            value={`${WEB_URL}/products/${id}`}
            size={170}
            color="#161410"
            backgroundColor="#ffffff"
            getRef={(c) => (svgRef.current = c)}
          />
        </View>
        <Text className="mt-6 font-mono text-[10px] tracking-[1.6px] text-ink-3">
          {p.brand?.toUpperCase()}
        </Text>
        <Text className="mt-1.5 font-sans-sb text-[19px] text-ink">{p.series_name}</Text>
        {(p.size || p.finish) && (
          <Text className="mt-1 font-mono text-[10px] tracking-[0.4px] text-ink-3">
            {[p.size, p.finish?.toUpperCase()].filter(Boolean).join("  ·  ")}
          </Text>
        )}
      </View>

      <Text className="mt-4 font-mono text-[10px] leading-[16px] tracking-[0.6px] text-ink-4">
        STICK THIS ON THE DISPLAY TILE. SCANNING IT OPENS STOCK ENTRY FOR
        THIS DESIGN WITHOUT SEARCHING.
      </Text>

      <View className="mt-7 flex-row items-center justify-between border border-rule bg-field px-3.5 py-3">
        <Eyebrow>COPIES PER SHEET</Eyebrow>
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => setCopies((v) => String(Math.max(1, (parseInt(v) || 1) - 1)))}
            className="px-3 py-1"
          >
            <Text className="font-sans text-[18px] text-ink-3">−</Text>
          </TouchableOpacity>
          <TextInput
            value={copies}
            onChangeText={setCopies}
            keyboardType="number-pad"
            className="w-10 p-0 text-center font-sans-sb text-[16px] text-ink"
            style={TNUM}
          />
          <TouchableOpacity
            onPress={() => setCopies((v) => String(Math.min(24, (parseInt(v) || 1) + 1)))}
            className="px-3 py-1"
          >
            <Text className="font-sans text-[18px] text-ink-3">+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        onPress={print}
        disabled={printing}
        activeOpacity={0.85}
        className="mt-3 items-center bg-accent py-4"
        style={{ opacity: printing ? 0.6 : 1 }}
      >
        {printing ? (
          <ActivityIndicator color={C.onAccent} />
        ) : (
          <Text className="font-sans-m text-[14px] text-onAccent">Print labels</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function esc(s: string) {
  return String(s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string)
  );
}