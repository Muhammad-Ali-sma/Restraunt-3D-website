#!/usr/bin/env bash
# Rebuilds src/app/fonts/noto-serif-jp-subset.woff2 so it contains only the
# Japanese characters the experience renders (chapter kanji and the title).
# Noto Serif JP is licensed under SIL OFL 1.1.
set -euo pipefail
cd "$(dirname "$0")/.."
chars=$(python3 -c "
import pathlib, re
files = [pathlib.Path('src/lib/scene-config.ts'), pathlib.Path('src/lib/story-copy.ts')]
files += list(pathlib.Path('src/components/cinematic').rglob('*.tsx'))
s = set()
for p in files:
    s |= set(re.findall(r'[　-ヿ一-鿿]', p.read_text()))
print(''.join(sorted(s)))")
enc=$(python3 -c "import urllib.parse, sys; print(urllib.parse.quote(sys.argv[1]))" "$chars")
ua="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
url=$(curl -sS -A "$ua" "https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@900&text=$enc" | grep -o 'https://[^)]*' | head -1)
mkdir -p src/app/fonts
curl -sS "$url" -o src/app/fonts/noto-serif-jp-subset.woff2
echo "Subset rebuilt for: $chars"
