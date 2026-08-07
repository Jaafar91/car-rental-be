import re
import json
from pathlib import Path
root = Path('.')
files = [root / 'car_rental_api/static/js/pages/maintenance.js',
         root / 'car_rental_api/static/js/pages/staff.js',
         root / 'car_rental_api/static/js/pages/rentals.js']
key_pattern = re.compile(r"t\(\s*['\"]([A-Za-z0-9_]+)['\"]")
brace_pattern = re.compile(r"\{\{([A-Za-z0-9_]+)\}\}")
keys = set()
for p in files:
    text = p.read_text(encoding='utf-8')
    keys.update(key_pattern.findall(text))
    keys.update(brace_pattern.findall(text))
print('JS keys count', len(keys))
for k in sorted(keys):
    print(k)
for lang in ['en', 'fr']:
    path = root / f'car_rental_api/static/locales/{lang}.json'
    data = json.loads(path.read_text(encoding='utf-8'))
    missing = sorted(k for k in keys if k not in data)
    print(f'\nMissing in {lang} ({len(missing)}):')
    for k in missing:
        print(k)
