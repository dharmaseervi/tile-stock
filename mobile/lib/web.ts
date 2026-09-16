import { jwtDecode } from "jwt-decode";

export const WEB_URL = "https://www.poorvatiles.com";

/** Public price list for the signed-in shop. The page is keyed by org id,
 *  which the session token carries. */
export function priceListUrl(token: string | null): string | null {
  if (!token) return null;
  try {
    const { org_id } = jwtDecode<{ org_id?: string }>(token);
    return org_id ? `${WEB_URL}/price-list/${org_id}` : null;
  } catch {
    return null;
  }
}
