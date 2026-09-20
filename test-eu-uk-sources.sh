#!/bin/bash
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'

# Try multiple data sources for EU and UK
sources=(
  "wikipedia-eu|https://en.wikipedia.org/wiki/EuroMillions"
  "wikipedia-uk|https://en.wikipedia.org/wiki/National_Lottery_(United_Kingdom)"
  "lotterysoup-eu|https://www.lotterysoup.com/euro-millions/numbers.asp"
  "lotteryextreme-eu|https://www.lotteryextreme.com/EuroMillions.asp"
  "lotterysoup-uk|https://www.lotterysoup.com/uk-lotto/numbers.asp"
)

for pair in "${sources[@]}"; do
  name="${pair%%|*}"
  url="${pair##*|}"
  status=$(curl -L -A "$UA" -s -o /tmp/lottery-diag/$name.html -w "%{http_code}" --max-time 15 "$url" 2>&1)
  size=$(wc -c < /tmp/lottery-diag/$name.html 2>/dev/null || echo "0")
  echo "$name: HTTP=$status, size=$size, url=$url"
done
