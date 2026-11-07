"""Create faithful first-page thumbnails for the five public PDF documents."""
from pathlib import Path
import json
import fitz
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / 'docs/source-inventory/content.json').read_text(encoding='utf-8'))
destination = ROOT / 'dist/assets/document-covers'
destination.mkdir(parents=True, exist_ok=True)
for document in data['documents']:
    asset = document['asset']
    target = destination / (asset['sha256'][:12] + '.webp')
    with fitz.open(ROOT / 'dist' / asset['local']) as pdf:
        page = pdf[0]
        scale = 640 / max(page.rect.width, page.rect.height)
        pixmap = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
        image = Image.frombytes('RGB', (pixmap.width, pixmap.height), pixmap.samples)
        image.save(target, 'WEBP', quality=85, method=6)
print(f'Rendered {len(data["documents"])} PDF covers.')
