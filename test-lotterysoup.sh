#!/bin/bash
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'

# Follow redirects to see where lotterysoup actually goes
echo "=== lotterysoup redirects ==="
curl -L -A "$UA" -s -o /dev/null -w "Final URL: %{url_effective}\nHTTP: %{http_code}\nSize: %{size_download}\n" \
  --max-time 15 "https://www.lotterysoup.com/euro-millions/numbers.asp"

echo ""
echo "=== Try other lotterysoup paths ==="
for path in "" "index.html" "results" "euro-millions" "EuroMillions" "euromillions"; do
  status=$(curl -L -A "$UA" -s -o /tmp/lottery-diag/ls-$path.html -w "%{http_code}|%{size_download}" --max-time 12 "https://www.lotterysoup.com/$path" 2>&1)
  echo "/$path: HTTP=$status"
done
