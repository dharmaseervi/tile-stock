cat << 'SCRIPT'
# ─── ADVERSARIAL TEST SCRIPT — run this in your terminal ───
# Uses your existing $TOKEN. Set it first:
# TOKEN="eyJ..."

BASE="https://tile-stock.onrender.com/api"

echo "═══════════════════════════════════════════"
echo " 1. JWT TAMPERING — swap org_id in payload"
echo "═══════════════════════════════════════════"
# Take your token, decode payload, change org_id, re-encode WITHOUT re-signing.
# A correct server rejects this because the signature won't match.
HEADER=$(echo "$TOKEN" | cut -d. -f1)
SIG=$(echo "$TOKEN" | cut -d. -f3)
FAKE_PAYLOAD=$(echo '{"exp":9999999999,"org_id":"00000000-0000-0000-0000-000000000000","role":"owner","user_id":"hacker"}' | base64 | tr -d '=' | tr '/+' '_-')
curl -s -H "Authorization: Bearer ${HEADER}.${FAKE_PAYLOAD}.${SIG}" "$BASE/stock/current"
echo "  ↑ EXPECT: invalid token"

echo "\n═══════════════════════════════════════════"
echo " 2. ALG=none ATTACK — strip the signature"
echo "═══════════════════════════════════════════"
NONE_HEADER=$(echo '{"alg":"none","typ":"JWT"}' | base64 | tr -d '=' | tr '/+' '_-')
NONE_PAYLOAD=$(echo '{"exp":9999999999,"org_id":"a50e0831-f8f8-40a9-a721-ed50da67ceeb","role":"owner","user_id":"x"}' | base64 | tr -d '=' | tr '/+' '_-')
curl -s -H "Authorization: Bearer ${NONE_HEADER}.${NONE_PAYLOAD}." "$BASE/stock/current"
echo "  ↑ EXPECT: invalid token"

echo "\n═══════════════════════════════════════════"
echo " 3. SQL INJECTION — in login email"
echo "═══════════════════════════════════════════"
curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"admin@x.com'"'"' OR 1=1 --","password":"x"}'
echo "  ↑ EXPECT: invalid credentials or validation error, NOT a token"

echo "\n═══════════════════════════════════════════"
echo " 4. SQL INJECTION — in product search/id path"
echo "═══════════════════════════════════════════"
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/products/1';DROP%20TABLE%20products;--"
echo "  ↑ EXPECT: invalid uuid / not found, NOT a 500 with SQL error"

echo "\n═══════════════════════════════════════════"
echo " 5. NEGATIVE / OVERFLOW stock movement"
echo "═══════════════════════════════════════════"
PID=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE/products" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
curl -s -X POST "$BASE/stock/movements" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"product_id\":\"$PID\",\"movement_type\":\"in\",\"boxes\":-99999}"
echo "  ↑ EXPECT: rejected, or at least not a negative stock exploit"

echo "\n═══════════════════════════════════════════"
echo " 6. MALFORMED movement_type"
echo "═══════════════════════════════════════════"
curl -s -X POST "$BASE/stock/movements" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"product_id\":\"$PID\",\"movement_type\":\"'; DELETE FROM stock_movements; --\",\"boxes\":1}"
echo "  ↑ EXPECT: rejected — invalid movement type"

echo "\n═══════════════════════════════════════════"
echo " 7. MASS ASSIGNMENT — inject org_id into create"
echo "═══════════════════════════════════════════"
curl -s -X POST "$BASE/products" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"brand":"X","series_name":"MassAssign","category":"tile","size":"600x600","unit":"box","org_id":"00000000-0000-0000-0000-000000000000","role":"admin"}'
echo "  ↑ EXPECT: created under YOUR org, ignoring the injected org_id"

echo "\n═══════════════════════════════════════════"
echo " 8. OVERSIZED PAYLOAD — 1MB brand name"
echo "═══════════════════════════════════════════"
BIG=$(head -c 1000000 /dev/zero | tr '\0' 'A')
curl -s -o /dev/null -w "HTTP %{http_code}\n" -X POST "$BASE/products" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"brand\":\"$BIG\",\"series_name\":\"x\",\"category\":\"tile\",\"size\":\"600x600\",\"unit\":\"box\"}"
echo "  ↑ EXPECT: 400/413, not 500 or hang"

echo "\n═══════════════════════════════════════════"
echo " 9. RATE LIMIT — 15 rapid logins"
echo "═══════════════════════════════════════════"
for i in $(seq 1 15); do
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/auth/login" \
    -H "Content-Type: application/json" -d '{"email":"none@none.com","password":"wrong"}')
  printf "%s " "$code"
done
echo "\n  ↑ EXPECT: some 429s after ~10 requests"

echo "\n═══════════════════════════════════════════"
echo " 10. WRONG HTTP METHOD / verb tampering"
echo "═══════════════════════════════════════════"
curl -s -o /dev/null -w "TRACE: HTTP %{http_code}\n" -X TRACE "$BASE/products"
curl -s -X OPTIONS "$BASE/products" -o /dev/null -w "OPTIONS: HTTP %{http_code}\n"
echo "  ↑ EXPECT: 404/405, no reflected data"
SCRIPT
echo ""
echo "Saved conceptually — copy the block above into hack-test.sh"
Output

# ─── ADVERSARIAL TEST SCRIPT — run this in your terminal ───
# Uses your existing $TOKEN. Set it first:
# TOKEN="eyJ..."

BASE="https://tile-stock.onrender.com/api"

echo "═══════════════════════════════════════════"
echo " 1. JWT TAMPERING — swap org_id in payload"
echo "═══════════════════════════════════════════"
# Take your token, decode payload, change org_id, re-encode WITHOUT re-signing.
# A correct server rejects this because the signature won't match.
HEADER=$(echo "$TOKEN" | cut -d. -f1)
SIG=$(echo "$TOKEN" | cut -d. -f3)
FAKE_PAYLOAD=$(echo '{"exp":9999999999,"org_id":"00000000-0000-0000-0000-000000000000","role":"owner","user_id":"hacker"}' | base64 | tr -d '=' | tr '/+' '_-')
curl -s -H "Authorization: Bearer ${HEADER}.${FAKE_PAYLOAD}.${SIG}" "$BASE/stock/current"
echo "  ↑ EXPECT: invalid token"

echo "\n═══════════════════════════════════════════"
echo " 2. ALG=none ATTACK — strip the signature"
echo "═══════════════════════════════════════════"
NONE_HEADER=$(echo '{"alg":"none","typ":"JWT"}' | base64 | tr -d '=' | tr '/+' '_-')
NONE_PAYLOAD=$(echo '{"exp":9999999999,"org_id":"a50e0831-f8f8-40a9-a721-ed50da67ceeb","role":"owner","user_id":"x"}' | base64 | tr -d '=' | tr '/+' '_-')
curl -s -H "Authorization: Bearer ${NONE_HEADER}.${NONE_PAYLOAD}." "$BASE/stock/current"
echo "  ↑ EXPECT: invalid token"

echo "\n═══════════════════════════════════════════"
echo " 3. SQL INJECTION — in login email"
echo "═══════════════════════════════════════════"
curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"admin@x.com'"'"' OR 1=1 --","password":"x"}'
echo "  ↑ EXPECT: invalid credentials or validation error, NOT a token"

echo "\n═══════════════════════════════════════════"
echo " 4. SQL INJECTION — in product search/id path"
echo "═══════════════════════════════════════════"
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/products/1';DROP%20TABLE%20products;--"
echo "  ↑ EXPECT: invalid uuid / not found, NOT a 500 with SQL error"

echo "\n═══════════════════════════════════════════"
echo " 5. NEGATIVE / OVERFLOW stock movement"
echo "═══════════════════════════════════════════"
PID=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE/products" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
curl -s -X POST "$BASE/stock/movements" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"product_id\":\"$PID\",\"movement_type\":\"in\",\"boxes\":-99999}"
echo "  ↑ EXPECT: rejected, or at least not a negative stock exploit"

echo "\n═══════════════════════════════════════════"
echo " 6. MALFORMED movement_type"
echo "═══════════════════════════════════════════"
curl -s -X POST "$BASE/stock/movements" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"product_id\":\"$PID\",\"movement_type\":\"'; DELETE FROM stock_movements; --\",\"boxes\":1}"
echo "  ↑ EXPECT: rejected — invalid movement type"

echo "\n═══════════════════════════════════════════"
echo " 7. MASS ASSIGNMENT — inject org_id into create"
echo "═══════════════════════════════════════════"
curl -s -X POST "$BASE/products" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"brand":"X","series_name":"MassAssign","category":"tile","size":"600x600","unit":"box","org_id":"00000000-0000-0000-0000-000000000000","role":"admin"}'
echo "  ↑ EXPECT: created under YOUR org, ignoring the injected org_id"

echo "\n═══════════════════════════════════════════"
echo " 8. OVERSIZED PAYLOAD — 1MB brand name"
echo "═══════════════════════════════════════════"
BIG=$(head -c 1000000 /dev/zero | tr '\0' 'A')
curl -s -o /dev/null -w "HTTP %{http_code}\n" -X POST "$BASE/products" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"brand\":\"$BIG\",\"series_name\":\"x\",\"category\":\"tile\",\"size\":\"600x600\",\"unit\":\"box\"}"
echo "  ↑ EXPECT: 400/413, not 500 or hang"

echo "\n═══════════════════════════════════════════"
echo " 9. RATE LIMIT — 15 rapid logins"
echo "═══════════════════════════════════════════"
for i in $(seq 1 15); do
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/auth/login" \
    -H "Content-Type: application/json" -d '{"email":"none@none.com","password":"wrong"}')
  printf "%s " "$code"
done
echo "\n  ↑ EXPECT: some 429s after ~10 requests"

echo "\n═══════════════════════════════════════════"
echo " 10. WRONG HTTP METHOD / verb tampering"
echo "═══════════════════════════════════════════"
curl -s -o /dev/null -w "TRACE: HTTP %{http_code}\n" -X TRACE "$BASE/products"
curl -s -X OPTIONS "$BASE/products" -o /dev/null -w "OPTIONS: HTTP %{http_code}\n"
echo "  ↑ EXPECT: 404/405, no reflected data"

Saved conceptually — copy the block above into hack-test.sh