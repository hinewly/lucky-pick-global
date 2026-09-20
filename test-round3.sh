#!/bin/bash
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'

# Round 3: more data sources
sources=(
  "wikipedia-eu-list|https://en.wikipedia.org/wiki/List_of_EuroMillions_draws_(2020%E2%80%932024)"
  "wikipedia-eu-draws2|https://en.wikipedia.org/wiki/EuroMillions_draws"
  "wikipedia-uk-draws|https://en.wikipedia.org/wiki/Lotto_(United_Kingdom)"
  "lottoextreme-eu|https://www.lottoextreme.com/euromillions.htm"
  "thelotter-eu|https://www.thelotter.com/euro-millions/results"
  "thelotter-uk|https://www.thelotter.com/uk-lotto/results"
  "uk-lotterylive|https://www.lottery.co.uk/lotto"
  "eu-euromillions|https://www.euromillions.com/en/results/history"
)

for pair in "${sources[@]}"; do
  name="${pair%%|*}"
  url="${pair##*|}"
  status=$(curl -L -A "$UA" -s -o /tmp/lottery-diag/$name.html -w "%{http_code}" --max-time 15 "$url" 2>&1)
  size=$(wc -c < /tmp/lottery-diag/$name.html 2>/dev/null || echo "0")
  echo "$name: HTTP=$status, size=$size"
done
