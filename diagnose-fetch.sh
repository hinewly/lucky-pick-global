#!/bin/bash
# diagnose-fetch.sh - 看 4 个彩票网站能不能抓到 HTML
# 输出每个文件的大小、HTTP 状态，方便判断是反爬、JS SPA、还是 URL 错了

UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

OUT=/tmp/lottery-diag
mkdir -p "$OUT"
rm -f "$OUT"/*.html

echo "=== 开始抓取 ==="
echo ""

for pair in \
  "powerball|https://www.lotteryusa.com/powerball/year" \
  "megamillions|https://www.lotteryusa.com/mega-millions/year" \
  "euromillions|https://www.euro-millions.com/en/results/history" \
  "uklotto|https://www.national-lottery.co.uk/lotto/results"
do
  name="${pair%%|*}"
  url="${pair##*|}"
  echo "--- $name ---"
  echo "URL: $url"
  status=$(curl -L -A "$UA" -s -o "$OUT/$name.html" -w "%{http_code}" --max-time 15 "$url" 2>&1)
  size=$(wc -c < "$OUT/$name.html" 2>/dev/null || echo "0")
  echo "HTTP: $status"
  echo "Size: $size bytes"
  if [ "$size" -lt 5000 ] && [ "$size" -gt 0 ]; then
    echo "First 500 chars:"
    head -c 500 "$OUT/$name.html"
    echo ""
  elif [ "$size" -gt 5000 ]; then
    echo "First 200 chars (likely a real page):"
    head -c 200 "$OUT/$name.html"
    echo ""
  fi
  echo ""
done

echo "=== 文件清单 ==="
ls -la "$OUT"
echo ""
echo "如果你看到 sizes 都很小（< 1 KB），那是被反爬或者 URL 404 了。"
echo "如果有某个文件 size > 50 KB，那应该能解析。"
echo ""
echo "下一步：把上面输出贴给 Codex，让 ta 看 HTML 调 parser。"
