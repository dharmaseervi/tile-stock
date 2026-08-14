import { ReactNode } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { C, TNUM } from "@/lib/theme";

/** Full-bleed dark screen. Pass `inset` on tab screens that draw their own
 *  masthead; pushed screens get their spacing from the navigator header. */
export function Screen({ children, inset = false }: { children: ReactNode; inset?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-bg" style={inset ? { paddingTop: insets.top + 10 } : undefined}>
      <StatusBar style="light" />
      {children}
    </View>
  );
}

/** Mono uppercase rule at the top of a tab screen — left title, right status. */
export function Masthead({ left, right }: { left: string; right?: string }) {
  return (
    <View className="flex-row items-baseline justify-between px-[22px]">
      <Text className="font-mono text-[10px] tracking-[1.4px] text-ink-3">
        {left.toUpperCase()}
      </Text>
      {!!right && (
        <Text className="font-mono text-[10px] tracking-[1.4px] text-ink-3">
          {right.toUpperCase()}
        </Text>
      )}
    </View>
  );
}

/** Mono eyebrow above a value or a section. */
export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <Text className={`font-mono text-[10px] tracking-[1.6px] text-ink-3 ${className}`}>
      {children}
    </Text>
  );
}

/** Sticky band that heads a group of ledger rows. */
export function GroupBand({ left, right }: { left: string; right?: string }) {
  return (
    <View className="flex-row items-baseline justify-between bg-band px-[22px] pb-[7px] pt-3.5">
      <Text className="font-mono text-[10px] tracking-[1.6px] text-ink-3">{left}</Text>
      {!!right && (
        <Text className="font-mono text-[10px] tracking-[1.6px] text-ink-3" style={TNUM}>
          {right}
        </Text>
      )}
    </View>
  );
}

/** Square accent button. The ledger has no rounded corners anywhere. */
export function Btn({ label, onPress, busy, full, tone = "accent" }: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  full?: boolean;
  tone?: "accent" | "ghost" | "danger";
}) {
  const bg = tone === "accent" ? C.accent : "transparent";
  const fg = tone === "accent" ? C.onAccent : tone === "danger" ? C.red : C.inkSoft;
  const border = tone === "accent" ? "transparent" : tone === "danger" ? C.red : C.ghost;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={busy}
      activeOpacity={0.85}
      className={`items-center justify-center border px-4 py-3 ${full ? "w-full" : ""}`}
      style={{ backgroundColor: bg, borderColor: border, opacity: busy ? 0.6 : 1 }}
    >
      {busy ? (
        <ActivityIndicator color={tone === "accent" ? C.onAccent : C.inkSoft} />
      ) : (
        <Text className="font-sans-m text-[13px]" style={{ color: fg }}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

/** Underlined text action — secondary to the accent button. */
export function LinkAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} className="border-b border-link pb-1">
      <Text className="font-sans-m text-[12px] text-ink-soft">{label}</Text>
    </TouchableOpacity>
  );
}

/** Labelled input. Label is a mono eyebrow so forms read like the ledger. */
export function Field({ label, value, onChange, placeholder, keyboard, hint, multiline }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboard?: "default" | "number-pad" | "decimal-pad" | "email-address";
  hint?: string;
  multiline?: boolean;
}) {
  return (
    <View className="mb-5">
      <View className="mb-2 flex-row items-baseline">
        <Eyebrow>{label.toUpperCase()}</Eyebrow>
        {!!hint && (
          <Text className="ml-2 font-mono text-[10px] tracking-[1px] text-accent">{hint.toUpperCase()}</Text>
        )}
      </View>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.ink4}
        keyboardType={keyboard ?? "default"}
        multiline={multiline}
        autoCapitalize={keyboard === "email-address" ? "none" : "sentences"}
        className="border border-rule bg-field px-3.5 py-3 font-sans text-[15px] text-ink"
        style={multiline ? { minHeight: 84, textAlignVertical: "top" } : undefined}
      />
    </View>
  );
}

/** Chooser rendered as square segments rather than pills. */
export function Segments<T extends string>({ options, value, onChange }: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View className="flex-row">
      {options.map((o, i) => {
        const on = o.key === value;
        return (
          <TouchableOpacity
            key={o.key}
            onPress={() => onChange(o.key)}
            activeOpacity={0.8}
            className="flex-1 items-center border py-2.5"
            style={{
              backgroundColor: on ? C.accent : "transparent",
              borderColor: on ? C.accent : C.rule,
              marginLeft: i === 0 ? 0 : -1, // collapse shared borders
            }}
          >
            <Text
              className="font-mono text-[10px] tracking-[1px]"
              style={{ color: on ? C.onAccent : C.ink3 }}
            >
              {o.label.toUpperCase()}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** A row of the ledger: name, mono meta, right-aligned figure. */
export function LedgerLine({ name, meta, figure, figureColor, nameColor, onPress, children }: {
  name: string;
  meta?: string;
  figure?: string;
  figureColor?: string;
  nameColor?: string;
  onPress?: () => void;
  children?: ReactNode;
}) {
  const Wrapper: any = onPress ? TouchableOpacity : View;
  return (
    <Wrapper onPress={onPress} activeOpacity={0.85} className="border-t border-hairline">
      <View className="flex-row items-baseline gap-3 px-[22px] py-[11px]">
        <Text
          numberOfLines={1}
          className="min-w-0 flex-1 font-sans-m text-[15px] leading-[18px]"
          style={{ color: nameColor ?? C.ink }}
        >
          {name}
        </Text>
        {!!meta && (
          <Text className="font-mono text-[10px] tracking-[0.4px] text-ink-3">{meta}</Text>
        )}
        {figure !== undefined && (
          <Text
            className="w-[46px] text-right font-sans-sb text-[17px]"
            style={{ color: figureColor ?? C.ink, ...TNUM }}
          >
            {figure}
          </Text>
        )}
      </View>
      {children}
    </Wrapper>
  );
}

/** Empty and error states. An empty screen is an invitation to act. */
export function Empty({ title, body, action }: {
  title: string;
  body: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View className="items-center px-8 py-16">
      <Text className="font-sans-sb text-[16px] text-ink">{title}</Text>
      <Text className="mt-2 text-center font-sans text-[13px] leading-[19px] text-ink-3">
        {body}
      </Text>
      {action && (
        <View className="mt-6">
          <Btn label={action.label} onPress={action.onPress} />
        </View>
      )}
    </View>
  );
}

export function Loading() {
  return <ActivityIndicator color={C.ink3} className="mt-12" />;
}