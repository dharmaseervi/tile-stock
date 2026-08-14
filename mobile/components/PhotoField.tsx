import { useState } from "react";
import { View, Text, Image, TouchableOpacity, Alert, ActionSheetIOS, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import Svg, { Path, Circle, Rect } from "react-native-svg";
import { C } from "@/lib/theme";

/**
 * Square photo slot. Holds a local URI until the form saves — the upload
 * itself happens on submit, so an abandoned form never leaves an orphaned
 * file in the bucket.
 *
 * `existing` is the already-uploaded URL when editing; picking a new photo
 * supersedes it, and Remove clears both.
 */
export function PhotoField({ uri, existing, onPick, onClear }: {
  uri: string | null;
  existing?: string | null;
  onPick: (uri: string) => void;
  onClear: () => void;
}) {
  const [working, setWorking] = useState(false);
  const shown = uri ?? existing ?? null;

  async function launch(mode: "camera" | "library") {
    setWorking(true);
    try {
      const perm =
        mode === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!perm.granted) {
        Alert.alert(
          "Permission needed",
          mode === "camera"
            ? "Allow camera access to photograph a tile."
            : "Allow photo access to pick an image."
        );
        return;
      }

      const opts: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        // Tile photos are reference shots, not print artwork — 0.6 keeps
        // them sharp on screen while cutting upload size several-fold.
        quality: 0.6,
      };

      const res =
        mode === "camera"
          ? await ImagePicker.launchCameraAsync(opts)
          : await ImagePicker.launchImageLibraryAsync(opts);

      if (!res.canceled && res.assets?.[0]) onPick(res.assets[0].uri);
    } finally {
      setWorking(false);
    }
  }

  function choose() {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Cancel", "Take photo", "Choose from library"], cancelButtonIndex: 0 },
        (i) => {
          if (i === 1) launch("camera");
          if (i === 2) launch("library");
        }
      );
    } else {
      Alert.alert("Add photo", undefined, [
        { text: "Cancel", style: "cancel" },
        { text: "Take photo", onPress: () => launch("camera") },
        { text: "Choose from library", onPress: () => launch("library") },
      ]);
    }
  }

  return (
    <View className="mb-6">
      <Text className="mb-2 font-mono text-[10px] tracking-[1.6px] text-ink-3">PHOTO</Text>

      {shown ? (
        <View>
          <Image
            source={{ uri: shown }}
            style={{ width: "100%", height: 190 }}
            resizeMode="cover"
          />
          <View className="flex-row">
            <TouchableOpacity
              onPress={choose}
              disabled={working}
              activeOpacity={0.85}
              className="flex-1 items-center border border-t-0 border-rule py-3"
            >
              <Text className="font-mono text-[10px] tracking-[1px] text-ink-soft">REPLACE</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClear}
              activeOpacity={0.85}
              className="flex-1 items-center border border-l-0 border-t-0 border-rule py-3"
            >
              <Text className="font-mono text-[10px] tracking-[1px]" style={{ color: C.red }}>
                REMOVE
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          onPress={choose}
          disabled={working}
          activeOpacity={0.85}
          className="items-center justify-center border border-rule bg-field py-9"
        >
          <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
            <Rect x={2} y={5} width={20} height={16} stroke={C.ink4} strokeWidth={1.3} />
            <Circle cx={12} cy={13} r={4} stroke={C.ink4} strokeWidth={1.3} />
            <Path d="M8 5l1.5-2h5L16 5" stroke={C.ink4} strokeWidth={1.3} strokeLinejoin="round" />
          </Svg>
          <Text className="mt-3 font-mono text-[10px] tracking-[1.2px] text-ink-3">
            {working ? "OPENING…" : "ADD PHOTO"}
          </Text>
          <Text className="mt-1.5 font-mono text-[9px] tracking-[0.6px] text-ink-4">
            SHOWS ON YOUR PUBLIC PRICE LIST
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}