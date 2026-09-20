#!/bin/bash
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'

# Try separate draw history pages
sources=(
  "eu-draws|https://en.wikipedia.org/wiki/List_of_EuroMillions_draws"
  "uk-lotto-history|https://en.wikipedia.org/wiki/UK_Lotto"
  "uk-national-history|https://en.wikipedia.org/wiki/National_Lottery_draws"
  "eu-results|https://www.euro-millions.com/results"
  "eu-results-history|https://www.euro-millions.com/en/results"
)

for pair in "${sources[@]}"; do
  name="${pair%%|*}"
  url="${pair##*|}"
  status=$(curl -L -A "$UA" -s -o /tmp/lottery-diag/$name.html -w "%{http_code}" --max-time 15 "$url" 2>&1)
  size=$(wc -c < /tmp/lottery-diag/$name.html 2>/dev/null || echo "0")
  echo "$name: HTTP=$status, size=$size, url=$url"
done
