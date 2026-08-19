TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODkzMDk3MDAsIm9yZ19pZCI6ImE1MGUwODMxLWY4ZjgtNDBhOS1hNzIxLWVkNTBkYTY3Y2VlYiIsInJvbGUiOiJvd25lciIsInVzZXJfaWQiOiI1MGFjYzUyYS1lYzJhLTQxZjAtYmY0Ni03NGRhNTI4MDlhNjgifQ.YJFZBeF2brhxaScHwf4NYXtdImmlhf51VhhjPDVXOmk"
PRODUCT_ID="dd83344f-9517-4b1e-b274-9df53c1b6800"
echo "=== 1. LIST PRODUCTS ==="
curl -s -H "Authorization: Bearer $TOKEN" \
  https://tile-stock.onrender.com/api/products | head -c 200

echo "\n=== 2. CREATE PRODUCT ==="
curl -s -X POST https://tile-stock.onrender.com/api/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"brand":"TestBrand","series_name":"Security Test","category":"tile","size":"600x600","finish":"Matte","price_per_box":640,"cost_price":500,"reorder_level":10,"pieces_per_box":4,"unit":"box"}' \
  | tee /tmp/new_product.json

echo "\n=== 3. GET PRODUCT ID ==="
PRODUCT_ID=$(cat /tmp/new_product.json | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Product ID: $PRODUCT_ID"

echo "\n=== 4. STOCK IN ==="
curl -s -X POST https://tile-stock.onrender.com/api/stock/movements \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"product_id\":\"$PRODUCT_ID\",\"movement_type\":\"in\",\"boxes\":50}"

echo "\n=== 5. STOCK OUT ==="
curl -s -X POST https://tile-stock.onrender.com/api/stock/movements \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"product_id\":\"$PRODUCT_ID\",\"movement_type\":\"out\",\"boxes\":10}"

echo "\n=== 6. CHECK STOCK (should be 40) ==="
curl -s -H "Authorization: Bearer $TOKEN" \
  https://tile-stock.onrender.com/api/stock/current \
  | grep -o '"series_name":"Security Test"[^}]*'

echo "\n=== 7. UPDATE PRODUCT ==="
curl -s -X PUT https://tile-stock.onrender.com/api/products/$PRODUCT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"brand":"TestBrand","series_name":"Security Test Updated","category":"tile","size":"600x600","finish":"Matte","price_per_box":700,"reorder_level":15,"pieces_per_box":4,"unit":"box","image_url":""}'



echo "=== 8. CROSS-ORG READ (should be 404) ==="
curl -s -H "Authorization: Bearer $TOKEN" \
  https://tile-stock.onrender.com/api/products/00000000-0000-0000-0000-000000000000

echo ""
echo "=== 9. NO TOKEN (should be 401) ==="
curl -s https://tile-stock.onrender.com/api/products

echo ""
echo "=== 10. MALFORMED TOKEN (should be 401) ==="
curl -s -H "Authorization: Bearer notavalidtoken" \
  https://tile-stock.onrender.com/api/stock/current

echo ""
echo "=== 11. DELETE TEST PRODUCT ==="
curl -s -X DELETE https://tile-stock.onrender.com/api/products/$PRODUCT_ID \
  -H "Authorization: Bearer $TOKEN"

echo ""
echo "=== 12. CONFIRM DELETED (should be 404) ==="
curl -s -H "Authorization: Bearer $TOKEN" \
  https://tile-stock.onrender.com/api/products/$PRODUCT_ID

echo ""
echo "=== ALL TESTS DONE ==="