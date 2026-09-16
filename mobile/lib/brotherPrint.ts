import { requireOptionalNativeModule } from "expo";

// Local Expo module in modules/brother-print (Android only).
const BrotherPrint = requireOptionalNativeModule<{
  printLabel(ip: string, qrBase64: string, copies: number, config: LabelConfig): Promise<string>;
}>("BrotherPrint");

export type Template = "rack" | "tower" | "strip" | "boxed" | "custom";

export type LabelConfig = {
  template: Template;
  /** Label height in dots at 300dpi. 11.8 dots ≈ 1mm. */
  labelHeight: number;

  brand: string;
  name: string;
  size: string;
  finish: string;
  /** Optional fifth line — godown location, price, whatever fits. */
  extra: string;

  // Custom-template only. Ignored by the four presets.
  layout: "horizontal" | "vertical";
  qrAlign: "left" | "center" | "right";
  textAlign: "left" | "center" | "right";
  qrSize: number;
  brandSize: number;
  nameSize: number;
  metaSize: number;
  boldText: boolean;
};

export async function printLabel(
  ip: string,
  qrBase64: string,
  copies: number,
  config: LabelConfig
): Promise<void> {
  if (!BrotherPrint) {
    throw new Error("BrotherPrint native module not found — rebuild the app.");
  }
  await BrotherPrint.printLabel(ip, qrBase64, copies, config);
}
