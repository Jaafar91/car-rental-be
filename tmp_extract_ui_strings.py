import pathlib
import re
import json

root = pathlib.Path('car_rental_api/static')
files = list(root.rglob('*.js')) + list(root.rglob('*.html'))
strings = set()
for f in files:
    text = f.read_text(encoding='utf-8')
    # template literal contents
    for m in re.findall(r'`([^`]+)`', text, re.S):
        if '${' in m:
            continue
        for line in m.splitlines():
            s = line.strip()
            if len(s) < 2 or len(s) > 120: continue
            if re.search(r'[A-Za-z]', s) and re.search(r'[\s\.,;:\?\!\-\(\)]', s):
                if not re.search(r'^(?:function|const|let|var|return|if|else|for|while|switch|case|break|continue|try|catch|finally|new|this|typeof|instanceof|class|extends|constructor|super|import|from|export|default|true|false|null|undefined|await|async)$', s):
                    strings.add(s)
    # normal strings
    for m in re.findall(r'"([^"\\]*(?:\\.[^"\\]*)*)"|\'([^'\\]*(?:\\.[^'\\]*)*)\'', text, re.S):
        s = next((x for x in m if x), '')
        s = s.strip()
        if len(s) < 2 or len(s) > 120: continue
        if re.search(r'[A-Za-z]', s) and re.search(r'[\s\.,;:\?\!\-\(\)]', s):
            if '${' in s: continue
            if not re.search(r'http[s]?://|/static|\.\w|^\s*$|[=\(\)\{\};]$', s):
                strings.add(s)
    if f.suffix == '.html':
        for m in re.findall(r'>([^<>]+)<', text):
            s = m.strip()
            if len(s) < 2 or len(s) > 120: continue
            if re.search(r'[A-Za-z]', s) and re.search(r'[\s\.,;:\?\!\-\(\)]', s):
                strings.add(s)
print(json.dumps(sorted(strings), indent=2, ensure_ascii=False))
