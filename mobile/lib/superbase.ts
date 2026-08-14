import * as FileSystem from "expo-file-system";

/* Same bucket and publishable key the web app uses. The anon key is safe
   to ship — it only grants what the bucket's policies allow. */
const SUPABASE_URL = "https://usxhuhlsfyvmgueqtotf.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzeGh1aGxzZnl2bWd1ZXF0b3RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MTMzNzksImV4cCI6MjEwMTI4OTM3OX0.KkYHJPTRCznhVv6akQoor6mXvpAgPgocPwQmnCpmMHo";
const BUCKET = "product-photos";
/**;
 * Uploads a local image URI to Supabase Storage and returns its public URL.
 *
 * Uses FileSystem.uploadAsync rather than fetch + FormData: it streams the
 * file natively, so a 5 MB photo from the camera never has to sit in JS
 * memory as base64.
 */
export async function uploadProductPhoto(uri: string): Promise<string> {
  const ext = (uri.split(".").pop() || "jpg").toLowerCase().split("?")[0];
  const mime =
    ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const res = await FileSystem.uploadAsync(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${name}`,
    uri,
    {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": mime,
        "x-upsert": "true",
      },
    },
  );

  if (res.status !== 200) {
    // Supabase returns a JSON error body; surface its message where possible.
    let detail = `HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(res.body);
      detail = parsed.message || parsed.error || detail;
    } catch {
      /* body wasn't JSON — keep the status */
    }
    throw new Error(`Photo upload failed: ${detail}`);
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${name}`;
}
