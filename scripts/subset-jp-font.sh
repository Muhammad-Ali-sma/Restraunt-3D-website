#!/usr/bin/env bash
# Rebuilds src/app/fonts/noto-serif-jp-subset.woff2 containing only the
# Japanese characters used in src/. Noto Serif JP is licensed under SIL OFL 1.1.
set -euo pipefail
cd "$(dirname "$0")/.."
chars=$(python3 -c "
import pathlib, re
s = set()
for p in pathlib.Path('src').rglob('*.ts*'):
    s |= set(re.findall(r'[　-ヿ一-鿿]', p.read_text()))
print(''.join(sorted(s)))")
enc=$(python3 -c "import urllib.parse, sys; print(urllib.parse.quote(sys.argv[1]))" "$chars")
ua="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
url=$(curl -sS -A "$ua" "https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@500&text=$enc" | grep -o 'https://[^)]*' | head -1)
curl -sS "$url" -o src/app/fonts/noto-serif-jp-subset.woff2
echo "Subset rebuilt for: $chars"
