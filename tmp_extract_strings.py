import pathlib
import re
import json

root = pathlib.Path('car_rental_api/static')
files = list(root.rglob('*.js')) + list(root.rglob('*.html'))
strings = set()
for f in files:
    text = f.read_text(encoding='utf-8')
    for pat in [r'`([^`]+)`', r'"([^"\\]*(?:\\.[^"\\]*)*)"', r"'([^'\\]*(?:\\.[^'\\]*)*)'"]:
        for m in re.findall(pat, text, re.S):
            s = m.strip()
            if 1 < len(s) <= 120 and re.search(r'[A-Za-z]', s):
                strings.add(s)
    if f.suffix == '.html':
        for m in re.findall(r'>([^<>]+)<', text):
            s = m.strip()
            if 1 < len(s) <= 120 and re.search(r'[A-Za-z]', s):
                strings.add(s)
print(json.dumps(sorted(strings), indent=2, ensure_ascii=False))
