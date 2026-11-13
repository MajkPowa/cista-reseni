"""Fill the CRM demo mode with fictional sample data (collections demo*).

A user whose record in `admins/` has role "demo" sees only these collections,
never real customers or inquiries. All names and contacts below are invented.

    python scripts/seed_demo.py                       # production (needs gcloud login), resets demo data
    python scripts/seed_demo.py --emulator            # local emulator
    python scripts/seed_demo.py --demo-user a@b.cz    # also registers that e-mail as a demo user
"""
from pathlib import Path
from datetime import datetime, timedelta, timezone
import argparse, json, subprocess, sys, urllib.request, urllib.error

sys.stdout.reconfigure(encoding='utf-8')
ROOT = Path(__file__).resolve().parents[1]
PROJECT = json.loads((ROOT / '.firebaserc').read_text(encoding='utf-8'))['projects']['default']
NOW = datetime.now(timezone.utc)
TODAY = NOW.date()


def day(offset):
    return (TODAY + timedelta(days=offset)).isoformat()


def stamp(offset_days=0, hour=9):
    return NOW.replace(hour=hour, minute=15, second=0, microsecond=0) + timedelta(days=offset_days)


def encode(value):
    if value is None: return {'nullValue': None}
    if isinstance(value, bool): return {'booleanValue': value}
    if isinstance(value, int): return {'integerValue': str(value)}
    if isinstance(value, datetime): return {'timestampValue': value.astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%fZ')}
    if isinstance(value, str): return {'stringValue': value}
    if isinstance(value, list): return {'arrayValue': {'values': [encode(v) for v in value]}}
    if isinstance(value, dict): return {'mapValue': {'fields': {k: encode(v) for k, v in value.items()}}}
    raise TypeError(type(value))


BY = 'ukazka'
META = {'createdAt': stamp(-30), 'updatedAt': stamp(-1), 'updatedBy': BY}

CUSTOMERS = {
    'c-novak': {'name': 'Jan Novák', 'type': 'household', 'contactPerson': '', 'phone': '+420 777 000 101', 'email': 'jan.novak@example.cz', 'address': 'Lipová 12', 'city': 'Tábor', 'note': 'Rodinný dům, čistírna z roku 2019.'},
    'c-dvorakova': {'name': 'Petra Dvořáková', 'type': 'household', 'contactPerson': '', 'phone': '+420 777 000 102', 'email': 'dvorakova@example.cz', 'address': 'Na Výsluní 4', 'city': 'Sezimovo Ústí', 'note': 'Novostavba bez kanalizace.'},
    'c-penzion': {'name': 'Penzion U Řeky (ukázka)', 'type': 'company', 'contactPerson': 'Martin Kříž', 'phone': '+420 777 000 103', 'email': 'provoz@penzion-ukazka.example', 'address': 'Nábřežní 8', 'city': 'Bechyně', 'note': 'Sezónní provoz.'},
    'c-obec': {'name': 'Obec Ukázkov', 'type': 'municipality', 'contactPerson': 'Ing. Eva Malá, starostka', 'phone': '+420 777 000 104', 'email': 'starosta@ukazkov.example', 'address': 'Náves 1', 'city': 'Ukázkov', 'note': 'Obecní ČOV, zájem o pravidelný servis.'},
    'c-vyroba': {'name': 'Kovo Příklad s.r.o.', 'type': 'company', 'contactPerson': 'Tomáš Veselý', 'phone': '+420 777 000 105', 'email': 'vesely@kovo-priklad.example', 'address': 'Průmyslová 22', 'city': 'Písek', 'note': 'Výrobní areál, 40 zaměstnanců.'},
    'c-kemp': {'name': 'Kemp Na Louce (ukázka)', 'type': 'company', 'contactPerson': 'Lucie Horáková', 'phone': '+420 777 000 106', 'email': 'kemp@na-louce.example', 'address': 'Luční 3', 'city': 'Lipno nad Vltavou', 'note': 'Provoz květen–září.'},
}
DEVICES = {
    'd-novak': {'customerId': 'c-novak', 'manufacturer': 'ASIO', 'model': 'AS-VARIOcomp 5K', 'capacity': '5 EO', 'location': 'zahrada za domem', 'installedAt': '2019-06', 'program': 'standard', 'lastServiceAt': day(-190), 'nextServiceAt': day(-6), 'note': ''},
    'd-penzion': {'customerId': 'c-penzion', 'manufacturer': 'ENVI-PUR', 'model': 'BC 20 COMFORT', 'capacity': '20 EO', 'location': 'u parkoviště', 'installedAt': '2021-04', 'program': 'premium', 'lastServiceAt': day(-80), 'nextServiceAt': day(11), 'note': 'Přístup přes zadní bránu.'},
    'd-obec': {'customerId': 'c-obec', 'manufacturer': 'ASIO', 'model': 'obecní ČOV', 'capacity': '150 EO', 'location': 'pod obcí u potoka', 'installedAt': '2016-09', 'program': 'premium', 'lastServiceAt': day(-60), 'nextServiceAt': day(31), 'note': ''},
    'd-vyroba': {'customerId': 'c-vyroba', 'manufacturer': 'EKOCIS', 'model': 'ČOV pro 15 EO', 'capacity': '15 EO', 'location': 'za halou B', 'installedAt': '2022-11', 'program': 'standard', 'lastServiceAt': day(-120), 'nextServiceAt': day(62), 'note': ''},
    'd-kemp': {'customerId': 'c-kemp', 'manufacturer': 'ENVI-PUR', 'model': 'BC 50', 'capacity': '50 EO', 'location': 'vedle sociálního zařízení', 'installedAt': '2015-05', 'program': 'none', 'lastServiceAt': '', 'nextServiceAt': '', 'note': 'Zvažují rekonstrukci technologie.'},
}
JOBS = {
    'j-dvorakova': {'title': 'Domovní čistírna – Petra Dvořáková', 'customerId': 'c-dvorakova', 'deviceId': '', 'type': 'cov', 'stage': 'lead', 'value': 0, 'dueDate': day(5), 'assignee': '', 'note': 'Novostavba pro 4 osoby, chce návrh a rozpočet.', 'inquiryId': 'i-dvorakova'},
    'j-kemp': {'title': 'Rekonstrukce ČOV – Kemp Na Louce', 'customerId': 'c-kemp', 'deviceId': 'd-kemp', 'type': 'rekonstrukce', 'stage': 'quote', 'value': 385000, 'dueDate': day(9), 'assignee': '', 'note': 'Nabídka odeslána, čekáme na vyjádření.', 'inquiryId': ''},
    'j-obec': {'title': 'Pravidelný servis PREMIUM – Obec Ukázkov', 'customerId': 'c-obec', 'deviceId': 'd-obec', 'type': 'pravidelny_servis', 'stage': 'scheduled', 'value': 48000, 'dueDate': day(31), 'assignee': '', 'note': 'Smlouva na rok, 4 návštěvy.', 'inquiryId': ''},
    'j-vyroba': {'title': 'Úpravna vody – Kovo Příklad', 'customerId': 'c-vyroba', 'deviceId': '', 'type': 'upravna', 'stage': 'scheduled', 'value': 214000, 'dueDate': day(16), 'assignee': '', 'note': 'Montáž naplánována, materiál objednán.', 'inquiryId': ''},
    'j-penzion': {'title': 'Výměna dmychadla – Penzion U Řeky', 'customerId': 'c-penzion', 'deviceId': 'd-penzion', 'type': 'servis', 'stage': 'done', 'value': 18500, 'dueDate': day(-12), 'assignee': '', 'note': 'Hotovo, čeká na fakturaci.', 'inquiryId': ''},
    'j-novak': {'title': 'Servisní prohlídka – Jan Novák', 'customerId': 'c-novak', 'deviceId': 'd-novak', 'type': 'servis', 'stage': 'invoiced', 'value': 3900, 'dueDate': day(-190), 'assignee': '', 'note': '', 'inquiryId': ''},
    'j-ztracena': {'title': 'Dešťová nádrž – poptávka z webu', 'customerId': 'c-novak', 'deviceId': '', 'type': 'destovka', 'stage': 'lost', 'value': 62000, 'dueDate': '', 'assignee': '', 'note': 'Zákazník realizaci odložil.', 'inquiryId': ''},
}
TASKS = {
    't-novak': {'title': 'Servis: ASIO AS-VARIOcomp 5K – Jan Novák', 'dueDate': day(-6), 'done': False, 'doneAt': None, 'kind': 'service_visit', 'customerId': 'c-novak', 'jobId': '', 'deviceId': 'd-novak', 'assignee': ''},
    't-nabidka': {'title': 'Zavolat kvůli nabídce na rekonstrukci', 'dueDate': day(0), 'done': False, 'doneAt': None, 'kind': 'task', 'customerId': 'c-kemp', 'jobId': 'j-kemp', 'deviceId': '', 'assignee': ''},
    't-zamereni': {'title': 'Zaměření pozemku a návrh čistírny', 'dueDate': day(3), 'done': False, 'doneAt': None, 'kind': 'task', 'customerId': 'c-dvorakova', 'jobId': 'j-dvorakova', 'deviceId': '', 'assignee': ''},
    't-penzion': {'title': 'Servis: ENVI-PUR BC 20 COMFORT – Penzion U Řeky', 'dueDate': day(11), 'done': False, 'doneAt': None, 'kind': 'service_visit', 'customerId': 'c-penzion', 'jobId': '', 'deviceId': 'd-penzion', 'assignee': ''},
    't-faktura': {'title': 'Vystavit fakturu za výměnu dmychadla', 'dueDate': day(-2), 'done': True, 'doneAt': stamp(-2), 'kind': 'task', 'customerId': 'c-penzion', 'jobId': 'j-penzion', 'deviceId': '', 'assignee': ''},
}
ACTIVITIES = {
    'a-1': {'customerId': 'c-novak', 'jobId': '', 'kind': 'visit', 'text': 'Proveden servis: ASIO AS-VARIOcomp 5K', 'at': stamp(-190)},
    'a-2': {'customerId': 'c-novak', 'jobId': '', 'kind': 'call', 'text': 'Domluven termín podzimního servisu.', 'at': stamp(-8)},
    'a-3': {'customerId': 'c-penzion', 'jobId': 'j-penzion', 'kind': 'visit', 'text': 'Výměna dmychadla, kontrola aeračních elementů.', 'at': stamp(-12)},
    'a-4': {'customerId': 'c-kemp', 'jobId': 'j-kemp', 'kind': 'note', 'text': 'Prohlídka na místě: technologie po 10 letech, doporučena rekonstrukce.', 'at': stamp(-20)},
    'a-5': {'customerId': 'c-kemp', 'jobId': 'j-kemp', 'kind': 'system', 'text': 'Zakázka „Rekonstrukce ČOV – Kemp Na Louce“: Poptávka → Nabídka', 'at': stamp(-14)},
    'a-6': {'customerId': 'c-obec', 'jobId': 'j-obec', 'kind': 'call', 'text': 'Starostka potvrdila program PREMIUM.', 'at': stamp(-25)},
    'a-7': {'customerId': 'c-dvorakova', 'jobId': 'j-dvorakova', 'kind': 'system', 'text': 'Převedeno z poptávky z webu: Domovní čistírna', 'at': stamp(-1)},
    'a-8': {'customerId': 'c-vyroba', 'jobId': 'j-vyroba', 'kind': 'note', 'text': 'Rozbor vody dodán, navržena filtrace a UV lampa.', 'at': stamp(-9)},
}
INQUIRIES = {
    'i-servis': {'service': 'servis', 'serviceLabel': 'Servis nebo oprava ČOV', 'kind': 'servis', 'location': 'Milevsko', 'manufacturer': 'ASIO', 'deviceType': 'AS-MONOcomp 4', 'name': 'Karel Ukázka', 'email': 'karel@example.cz', 'phone': '+420 777 000 201', 'message': 'Čistírna zapáchá a dmychadlo je hlučné. Prosím o prohlídku.', 'status': 'new', 'createdAt': stamp(0, 7)},
    'i-pravidelny': {'service': 'pravidelny_servis', 'serviceLabel': 'Pravidelný servis ČOV', 'kind': 'pravidelny', 'program': 'standard', 'location': 'Soběslav', 'manufacturer': 'ENVI-PUR', 'deviceType': 'BC 4', 'name': 'Marie Příkladová', 'email': 'marie@example.cz', 'phone': '', 'message': '', 'status': 'new', 'createdAt': stamp(-1, 16)},
    'i-dvorakova': {'service': 'cov', 'serviceLabel': 'Domovní čistírna', 'kind': 'realizace', 'location': 'Sezimovo Ústí', 'name': 'Petra Dvořáková', 'email': 'dvorakova@example.cz', 'phone': '+420 777 000 102', 'message': 'Stavíme rodinný dům bez přípojky na kanalizaci, potřebujeme návrh čistírny pro 4 osoby.', 'status': 'in_progress', 'createdAt': stamp(-2, 10)},
}


def documents():
    docs = {}
    names = {key: value['name'] for key, value in CUSTOMERS.items()}
    for key, value in CUSTOMERS.items():
        docs[f'demoCustomers/{key}'] = {**value, **META}
    for key, value in DEVICES.items():
        docs[f'demoDevices/{key}'] = {**value, 'customerName': names[value['customerId']], **META}
    for key, value in JOBS.items():
        docs[f'demoJobs/{key}'] = {**value, 'customerName': names[value['customerId']], **META}
    for key, value in TASKS.items():
        docs[f'demoTasks/{key}'] = {**value, 'customerName': names[value['customerId']], **META}
    for key, value in ACTIVITIES.items():
        docs[f'demoActivities/{key}'] = {**value, 'by': BY}
    for key, value in INQUIRIES.items():
        docs[f'demoInquiries/{key}'] = value
    return docs


class Firestore:
    def __init__(self, emulator):
        if emulator:
            self.base, self.token = 'http://127.0.0.1:8080/v1', 'owner'
        else:
            self.base = 'https://firestore.googleapis.com/v1'
            self.token = subprocess.run('gcloud auth print-access-token', shell=True, capture_output=True, text=True, check=True).stdout.strip()
        self.database = f'projects/{PROJECT}/databases/(default)'

    def call(self, method, path, body=None):
        request = urllib.request.Request(f'{self.base}/{self.database}/documents{path}', method=method,
                                         data=json.dumps(body).encode() if body is not None else None,
                                         headers={'Authorization': f'Bearer {self.token}', 'Content-Type': 'application/json', 'x-goog-user-project': PROJECT})
        with urllib.request.urlopen(request, timeout=60) as response:
            return json.loads(response.read() or b'{}')

    def clear(self, collection):
        listing = self.call('GET', f'/{collection}?pageSize=300&mask.fieldPaths=title') or {}
        names = [item['name'] for item in listing.get('documents', [])]
        for start in range(0, len(names), 20):
            self.call('POST', ':commit', {'writes': [{'delete': name} for name in names[start:start + 20]]})
        return len(names)

    def write(self, docs):
        writes = [{'update': {'name': f'{self.database}/documents/{path}', 'fields': encode(fields)['mapValue']['fields']}} for path, fields in docs.items()]
        for start in range(0, len(writes), 20):
            self.call('POST', ':commit', {'writes': writes[start:start + 20]})


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--emulator', action='store_true')
    parser.add_argument('--demo-user', action='append', default=[], metavar='EMAIL', help='register this e-mail as a demo user (repeatable)')
    args = parser.parse_args()
    store = Firestore(args.emulator)
    removed = sum(store.clear(name) for name in ['demoCustomers', 'demoDevices', 'demoJobs', 'demoTasks', 'demoActivities', 'demoInquiries'])
    docs = documents()
    for email in args.demo_user:
        email = email.strip().lower()
        docs[f'admins/{email}'] = {'email': email, 'role': 'demo', 'addedAt': NOW, 'addedBy': 'seed_demo'}
    store.write(docs)
    print(json.dumps({'target': 'emulator' if args.emulator else 'production', 'removed_old': removed, 'written': len(docs), 'demo_users': len(args.demo_user)}))


if __name__ == '__main__':
    main()
