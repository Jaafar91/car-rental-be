import json
from pathlib import Path

root = Path('.')
for lang in ['en', 'fr']:
    target_path = root / f'car_rental_api/static/locales/{lang}.json'
    generated_path = root / f'car_rental_api/static/locales/locale_generated_{lang}.json'
    if not target_path.exists() or not generated_path.exists():
        raise FileNotFoundError(f'Missing locale file for {lang}')

    existing = json.loads(target_path.read_text(encoding='utf-8'))
    generated = json.loads(generated_path.read_text(encoding='utf-8'))
    merged = {**generated, **existing}
    added = [k for k in generated if k not in existing]
    output_path = root / f'car_rental_api/static/locales/{lang}.json'
    output_path.write_text(json.dumps(dict(sorted(merged.items())), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'{lang}: {len(existing)} existing entries, {len(generated)} generated entries, {len(added)} added')
    if added:
        print('Added keys:')
        for key in added:
            print('  -', key)
