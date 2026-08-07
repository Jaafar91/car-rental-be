import json
import re
from pathlib import Path

root = Path('.')
js_files = list(root.glob('car_rental_api/static/js/pages/*.js'))
key_pattern = re.compile(r"t\(\s*['\"]([A-Za-z0-9_]+)['\"]")
brace_pattern = re.compile(r"\{\{([A-Za-z0-9_]+)\}\}")
template_pattern = re.compile(r"t\(\s*`([^`]+)`\)")
keys = set()

# Known dynamic key suffix values for template literals used in several page files.
known_dynamic_values = {
    'status': ['active', 'completed', 'overdue', 'cancelled', 'scheduled', 'in_progress', 'pending'],
    's': ['active', 'completed', 'overdue', 'cancelled', 'scheduled', 'in_progress', 'pending'],
    'role': ['admin', 'manager', 'agent'],
    'r': ['admin', 'manager', 'agent'],
}

def parse_array_values(text, name):
    match = re.search(rf"const\s+{name}\s*=\s*\[([^\]]*)\]", text)
    if not match:
        return []
    values = []
    for item in match.group(1).split(','):
        item = item.strip().strip('"\'')
        if item:
            values.append(item)
    return values


def expand_template_literal(template, text):
    if '${' not in template:
        return [template]
    parts = re.split(r"\$\{([^}]+)\}", template)
    candidates = ['']
    for i, part in enumerate(parts):
        if i % 2 == 0:
            candidates = [candidate + part for candidate in candidates]
        else:
            values = known_dynamic_values.get(part, [])
            if not values:
                values = parse_array_values(text, part)
            if values:
                candidates = [candidate + value for candidate in candidates for value in values]
            else:
                candidates = [candidate + '${' + part + '}' for candidate in candidates]
    return candidates

for p in js_files:
    text = p.read_text(encoding='utf-8')
    keys.update(key_pattern.findall(text))
    keys.update(brace_pattern.findall(text))
    for raw_template in template_pattern.findall(text):
        if '${' in raw_template:
            keys.update(expand_template_literal(raw_template, text))
        else:
            keys.add(raw_template)

existing_en = json.loads((root / 'car_rental_api/static/locales/en.json').read_text(encoding='utf-8'))
existing_fr = json.loads((root / 'car_rental_api/static/locales/fr.json').read_text(encoding='utf-8'))

missing_en = sorted(k for k in keys if k not in existing_en)
missing_fr = sorted(k for k in keys if k not in existing_fr)
print(f'Missing in en: {len(missing_en)}')
print(f'Missing in fr: {len(missing_fr)}')

# heuristic values for missing keys

def humanize(key):
    if not key:
        return ''
    return ' '.join(word.capitalize() for word in key.replace('-', ' ').replace('.', ' ').split('_'))


def en_value(k):
    if k in existing_en:
        return existing_en[k]
    if k.startswith('btn_add_'):
        return 'Add ' + humanize(k[len('btn_add_'):])
    if k == 'btn_delete':
        return 'Delete'
    if k == 'btn_edit':
        return 'Edit'
    if k.startswith('col_'):
        return humanize(k[len('col_'):])
    if k.startswith('label_'):
        return humanize(k[len('label_'):])
    if k.startswith('ph_'):
        base = k[len('ph_'):]
        perms = {
            'search_branches': '🔍 Search branches...',
            'search_categories': '🔍 Search categories...',
            'search_statuses': '🔍 Search statuses...',
            'search_cars': '🔍 Search cars...',
            'search_customers': '🔍 Search customers...',
            'search_maintenance': '🔍 Search maintenance...',
            'search_payments': '🔍 Search payments...',
            'search_rentals': '🔍 Search rentals...',
            'search_reservations': '🔍 Search reservations...',
            'search_staff': '🔍 Search staff...',
            'set_dates_first': 'Set rental & due date first',
            'auto_calculated': 'Auto-calculated',
            'optional_notes': 'Optional notes...',
            'password': 'Enter password',
            'email': 'e.g. name@example.com',
            'phone': 'e.g. +1 555 123 4567',
            'drivers_license': 'e.g. AB1234567',
            'license_plate': 'e.g. ABC-1234',
            'daily_rate': 'e.g. 49.99',
            'discount_amount': 'e.g. 10.00',
            'cost': 'e.g. 120.00',
            'amount': 'e.g. 49.99',
            'year': 'e.g. 2023',
            'transaction_id': 'e.g. TX12345',
        }
        return perms.get(base, humanize(base))
    if k.startswith('modal_add_'):
        return 'Add ' + humanize(k[len('modal_add_'):])
    if k.startswith('modal_edit_'):
        return 'Edit ' + humanize(k[len('modal_edit_'):])
    if k.startswith('toast_'):
        return humanize(k[len('toast_'):]) + ' successfully.'
    if k.startswith('confirm_delete_'):
        return 'Delete ' + humanize(k[len('confirm_delete_'):]) + '? This cannot be undone.'
    if k.startswith('error_'):
        base = k[len('error_'):]
        mappings = {
            'select_car': 'Please select a car.',
            'select_customer': 'Please select a customer.',
            'rental_date_required': 'Rental date is required.',
            'due_date_required': 'Due date is required.',
            'due_after_rental': 'Due date must be after rental date.',
            'return_before_rental': 'Return date cannot be before rental date.',
            'first_name_required': 'First name is required.',
            'last_name_required': 'Last name is required.',
            'email_required': 'Email is required.',
            'password_length': 'Password must be at least 8 characters.',
            'maintenance_type_required': 'Maintenance type is required.',
            'maintenance_not_found': 'Maintenance record not found.',
            'staff_not_found': 'Staff member not found.',
            'customer_not_found': 'Customer not found.',
            'category_name_required': 'Category name is required.',
            'status_name_required': 'Status name is required.',
            'category_not_found': 'Category not found.',
            'status_not_found': 'Status not found.',
            'invalid_email': 'Email address is invalid.',
            'full_name_required': 'Full name is required.',
            'full_name_length': 'Full name must be at least 3 characters.',
            'license_expiry_required': 'License expiry date is required.',
        }
        return mappings.get(base, humanize(base))
    if k.startswith('stat_'):
        mapv = {
            'active': 'Active',
            'admins': 'Admins',
            'agents': 'Agents',
            'cancelled': 'Cancelled',
            'completed': 'Completed',
            'expiring_soon': 'Expiring Soon',
            'expired': 'Expired',
            'in_progress': 'In Progress',
            'managers': 'Managers',
            'overdue': 'Overdue',
            'scheduled': 'Scheduled',
            'total_customers': 'Total Customers',
            'total_rentals': 'Total Rentals',
            'total_revenue': 'Total Revenue',
            'total_staff': 'Total Staff',
            'valid_licenses': 'Valid Licenses',
        }
        return mapv.get(k[len('stat_'):], humanize(k[len('stat_'):]))
    if k.startswith('status_'):
        mapv = {
            'active': 'Active',
            'inactive': 'Inactive',
            'pending': 'Pending',
            'scheduled': 'Scheduled',
            'in_progress': 'In Progress',
            'completed': 'Completed',
            'cancelled': 'Cancelled',
            'overdue': 'Overdue',
        }
        return mapv.get(k[len('status_'):], humanize(k[len('status_'):]))
    if k == 'appTitle':
        return existing_en.get(k, 'Car Rental Admin')
    if k.startswith('nav_'):
        return humanize(k[len('nav_'):])
    if k == 'loading':
        return existing_en.get(k, 'Loading...')
    if k == 'no_records':
        return existing_en.get(k, 'No records found')
    if k == 'no_data':
        return existing_en.get(k, 'No data available')
    if k == 'placeholder_empty':
        return existing_en.get(k, '—')
    if k == 'placeholder_select':
        return existing_en.get(k, 'Select...')
    if k == 'placeholder_none':
        return existing_en.get(k, 'None')
    if k == 'option_yes':
        return existing_en.get(k, 'Yes')
    if k == 'option_no':
        return existing_en.get(k, 'No')
    return humanize(k)


def fr_value(k):
    if k in existing_fr:
        return existing_fr[k]
    if k.startswith('btn_add_'):
        return 'Ajouter ' + humanize(k[len('btn_add_'):]).lower()
    if k == 'btn_delete':
        return 'Supprimer'
    if k == 'btn_edit':
        return 'Modifier'
    if k.startswith('col_'):
        return humanize(k[len('col_'):])
    if k.startswith('label_'):
        return humanize(k[len('label_'):])
    if k.startswith('ph_'):
        base = k[len('ph_'):]
        perms = {
            'search_branches': '🔍 Rechercher des agences...',
            'search_categories': '🔍 Rechercher des catégories...',
            'search_statuses': '🔍 Rechercher des statuts...',
            'search_cars': '🔍 Rechercher des voitures...',
            'search_customers': '🔍 Rechercher des clients...',
            'search_maintenance': '🔍 Rechercher la maintenance...',
            'search_payments': '🔍 Rechercher des paiements...',
            'search_rentals': '🔍 Rechercher des locations...',
            'search_reservations': '🔍 Rechercher des réservations...',
            'search_staff': '🔍 Rechercher le personnel...',
            'set_dates_first': 'Définissez d’abord la date de location et la date de retour',
            'auto_calculated': 'Calcul automatique',
            'optional_notes': 'Notes facultatives...',
            'password': 'Entrez le mot de passe',
            'email': 'ex. nom@example.com',
            'phone': 'ex. +33 1 23 45 67 89',
            'driver_license': 'ex. AB1234567',
            'license_plate': 'ex. AB-123-CD',
            'daily_rate': 'ex. 49,99',
            'discount_amount': 'ex. 10,00',
            'cost': 'ex. 120,00',
            'amount': 'ex. 49,99',
            'year': 'ex. 2023',
            'transaction_id': 'ex. TX12345',
        }
        return perms.get(base, humanize(base))
    if k.startswith('modal_add_'):
        return 'Ajouter ' + humanize(k[len('modal_add_'):]).lower()
    if k.startswith('modal_edit_'):
        return 'Modifier ' + humanize(k[len('modal_edit_'):]).lower()
    if k.startswith('toast_'):
        return humanize(k[len('toast_'):]) + ' avec succès.'
    if k.startswith('confirm_delete_'):
        return 'Supprimer ' + humanize(k[len('confirm_delete_'):]).lower() + ' ? Cette action est irréversible.'
    if k.startswith('error_'):
        base = k[len('error_'):]
        mappings = {
            'select_car': 'Veuillez sélectionner une voiture.',
            'select_customer': 'Veuillez sélectionner un client.',
            'rental_date_required': 'La date de location est requise.',
            'due_date_required': 'La date de retour est requise.',
            'due_after_rental': 'La date de retour doit être après la date de location.',
            'return_before_rental': 'La date de retour ne peut pas être antérieure à la date de location.',
            'first_name_required': 'Le prénom est requis.',
            'last_name_required': 'Le nom de famille est requis.',
            'email_required': 'L’e-mail est requis.',
            'password_length': 'Le mot de passe doit comporter au moins 8 caractères.',
            'maintenance_type_required': 'Le type de maintenance est requis.',
            'maintenance_not_found': 'Enregistrement de maintenance introuvable.',
            'staff_not_found': 'Employé introuvable.',
            'customer_not_found': 'Client introuvable.',
            'category_name_required': 'Le nom de la catégorie est requis.',
            'status_name_required': 'Le nom du statut est requis.',
            'category_not_found': 'Catégorie introuvable.',
            'status_not_found': 'Statut introuvable.',
            'invalid_email': 'L’adresse e-mail est invalide.',
            'full_name_required': 'Le nom complet est requis.',
            'full_name_length': 'Le nom complet doit comporter au moins 3 caractères.',
            'license_expiry_required': 'La date d’expiration du permis est requise.',
        }
        return mappings.get(base, humanize(base))
    if k.startswith('stat_'):
        mapv = {
            'active': 'Actif',
            'admins': 'Administrateurs',
            'agents': 'Agents',
            'cancelled': 'Annulées',
            'completed': 'Terminées',
            'expiring_soon': 'Expirant bientôt',
            'expired': 'Expirés',
            'in_progress': 'En cours',
            'managers': 'Managers',
            'overdue': 'En retard',
            'scheduled': 'Planifiées',
            'total_customers': 'Clients totaux',
            'total_rentals': 'Locations totales',
            'total_revenue': 'Revenu total',
            'total_staff': 'Personnel total',
            'valid_licenses': 'Permis valides',
        }
        return mapv.get(k[len('stat_'):], humanize(k[len('stat_'):]))
    if k.startswith('status_'):
        mapv = {
            'active': 'Actif',
            'inactive': 'Inactif',
            'pending': 'En attente',
            'scheduled': 'Planifié',
            'in_progress': 'En cours',
            'completed': 'Terminé',
            'cancelled': 'Annulé',
            'overdue': 'En retard',
        }
        return mapv.get(k[len('status_'):], humanize(k[len('status_'):]))
    if k == 'appTitle':
        return existing_fr.get(k, 'Admin Location Voiture')
    if k.startswith('nav_'):
        return humanize(k[len('nav_'):])
    if k == 'loading':
        return existing_fr.get(k, 'Chargement...')
    if k == 'no_records':
        return existing_fr.get(k, 'Aucun enregistrement trouvé')
    if k == 'no_data':
        return existing_fr.get(k, 'Aucune donnée disponible')
    if k == 'placeholder_empty':
        return existing_fr.get(k, '—')
    if k == 'placeholder_select':
        return existing_fr.get(k, 'Sélectionner...')
    if k == 'placeholder_none':
        return existing_fr.get(k, 'Aucun')
    if k == 'option_yes':
        return existing_fr.get(k, 'Oui')
    if k == 'option_no':
        return existing_fr.get(k, 'Non')
    return humanize(k)

keys_sorted = sorted(keys)
new_en = {k: en_value(k) for k in keys_sorted}
new_fr = {k: fr_value(k) for k in keys_sorted}
(root / 'car_rental_api/static/locales/locale_generated_en.json').write_text(
    json.dumps(new_en, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
(root / 'car_rental_api/static/locales/locale_generated_fr.json').write_text(
    json.dumps(new_fr, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('Generated locale_generated_en.json and locale_generated_fr.json')
