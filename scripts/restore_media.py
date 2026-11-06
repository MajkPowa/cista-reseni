#!/usr/bin/env python3
"""Restore public media from a hash-pinned source snapshot; never edits HTML.

Runtime: Python 3.12+, Pillow==12.1.0, requests==2.32.5.
The original migration used libwebp 1.6.0. Source and resulting full-media hashes
are strict: upstream replacements or a non-reproducible codec build fail closed.

Example:
  python scripts/restore_media.py --report qa/restore-media.json
  python scripts/restore_media.py --only https://www.cistareseni.cz/assets/img/about.jpg \
      --output-dir qa/media-smoke --report qa/media-smoke.json
"""
from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path, PurePosixPath
import sys
import time
from urllib.parse import urlparse
import uuid

import PIL
from PIL import Image, features
import requests

ROOT = Path(__file__).resolve().parents[1]
ALLOWED_HOSTS = {'www.cistareseni.cz', 'cistareseni.cz'}
REQUIRED_PILLOW = '12.1.0'
REQUIRED_REQUESTS = '2.32.5'


def digest(data: bytes) -> str:
    return sha256(data).hexdigest()


def public_path(output: Path, local: str) -> Path:
    value = PurePosixPath(local)
    if value.is_absolute() or '..' in value.parts or not local.startswith('assets/source/'):
        raise ValueError(f'Invalid manifest media path: {local}')
    target = (output / value).resolve()
    if not target.is_relative_to(output.resolve()):
        raise ValueError(f'Media path escapes output directory: {local}')
    return target


def read_source(url: str, expected: dict, retries: int) -> bytes:
    parsed = urlparse(url)
    if parsed.scheme != 'https' or parsed.hostname not in ALLOWED_HOSTS:
        raise ValueError('Source URL must be the original HTTPS cistareseni.cz resource')
    if not expected.get('source_sha256') or not expected.get('source_bytes'):
        raise ValueError('Source snapshot is not hash-pinned')
    for attempt in range(retries):
        try:
            # Explicitly inspect redirects; do not fetch arbitrary third-party assets.
            response = requests.get(url, timeout=(15, 90), allow_redirects=False,
                                    headers={'User-Agent': 'CistaReseni authorized read-only media restoration'})
            if response.is_redirect:
                raise ValueError(f'Unexpected source redirect: HTTP {response.status_code}')
            response.raise_for_status()
            raw = response.content
            if len(raw) != expected['source_bytes']:
                raise ValueError('Source size changed since the approved snapshot')
            if digest(raw) != expected['source_sha256']:
                raise ValueError('Source SHA-256 changed since the approved snapshot')
            return raw
        except ValueError:
            raise  # Changed source is not transient and must never be silently adopted.
        except requests.RequestException:
            if attempt + 1 == retries:
                raise
            time.sleep(min(2 ** attempt, 12))
    raise RuntimeError('Unreachable retry state')


def encoded_original(raw: bytes, expected: dict) -> bytes:
    if not expected['local'].endswith('.webp'):
        return raw  # PDF/SVG remain byte-for-byte identical.
    image = Image.open(BytesIO(raw))
    if expected.get('source_dimensions') and list(image.size) != expected['source_dimensions']:
        raise ValueError('Source image dimensions differ from the snapshot')
    image.thumbnail((2000, 2000), Image.Resampling.LANCZOS)
    if image.mode not in ('RGB', 'RGBA'):
        image = image.convert('RGBA' if 'transparency' in image.info else 'RGB')
    output = BytesIO()
    image.save(output, 'WEBP', quality=90, method=6)
    return output.getvalue()


def verify_full(data: bytes, expected: dict) -> None:
    if len(data) != expected['bytes'] or digest(data) != expected['sha256']:
        raise ValueError('Restored media differs from the snapshot output SHA-256/size; check Pillow/libwebp versions')
    if expected['local'].endswith('.webp'):
        with Image.open(BytesIO(data)) as image:
            if image.size != (expected['width'], expected['height']):
                raise ValueError('Restored image dimensions differ from the snapshot')
    if expected['local'].endswith('.pdf') and not data.startswith(b'%PDF'):
        raise ValueError('PDF source is not a valid PDF header')


def atomic_write(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(path.name + '.' + uuid.uuid4().hex + '.tmp')
    try:
        temp.write_bytes(data)
        temp.replace(path)
    finally:
        if temp.exists():
            temp.unlink()


def restore_one(url: str, expected: dict, thumbs: dict, output: Path, retries: int) -> dict:
    target = public_path(output, expected['local'])
    cached = False
    if target.exists():
        data = target.read_bytes()
        try:
            verify_full(data, expected)
            cached = True
        except ValueError:
            pass  # Replace only from the exact pinned original, never from live metadata.
    if not cached:
        raw = read_source(url, expected, retries)
        data = encoded_original(raw, expected)
        verify_full(data, expected)
        atomic_write(target, data)
    thumbnail_bytes = 0
    if expected['local'].endswith('.webp'):
        thumb = thumbs.get(url)
        if not thumb:
            raise ValueError('Missing thumbnail metadata in the snapshot')
        image = Image.open(BytesIO(data))
        image.thumbnail((720, 720), Image.Resampling.LANCZOS)
        encoded = BytesIO()
        image.save(encoded, 'WEBP', quality=81, method=6)
        thumbnail = encoded.getvalue()
        if image.size != (thumb['width'], thumb['height']) or len(thumbnail) != thumb['bytes']:
            raise ValueError('Thumbnail dimensions/size differ from the snapshot; check codec versions')
        if thumb.get('sha256') and digest(thumbnail) != thumb['sha256']:
            raise ValueError('Thumbnail SHA-256 differs from the snapshot')
        thumb_target = public_path(output, thumb['local'])
        # Re-encode from verified full media; do not trust a same-sized cached thumbnail.
        if not thumb_target.exists() or thumb_target.read_bytes() != thumbnail:
            atomic_write(thumb_target, thumbnail)
        thumbnail_bytes = len(thumbnail)
    return {'url': url, 'local': expected['local'], 'cached': cached,
            'bytes': len(data), 'thumbnail_bytes': thumbnail_bytes,
            'source_sha256': expected['source_sha256'], 'sha256': digest(data)}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', type=Path, default=ROOT/'docs/source-inventory/content.json')
    parser.add_argument('--thumbnails', type=Path, default=ROOT/'docs/source-inventory/thumbnails.json')
    parser.add_argument('--output-dir', type=Path, default=ROOT/'dist')
    parser.add_argument('--only', action='append', default=[], help='Exact original media URL; repeat for smoke tests')
    parser.add_argument('--workers', type=int, default=6)
    parser.add_argument('--retries', type=int, default=4)
    parser.add_argument('--report', type=Path, help='Optional local JSON validation report')
    args = parser.parse_args()
    if not 1 <= args.workers <= 12 or not 1 <= args.retries <= 8:
        parser.error('workers must be 1–12 and retries 1–8')
    if PIL.__version__ != REQUIRED_PILLOW or requests.__version__ != REQUIRED_REQUESTS:
        parser.error(f'Install Pillow=={REQUIRED_PILLOW} requests=={REQUIRED_REQUESTS}; found Pillow {PIL.__version__}, requests {requests.__version__}')
    if not features.check('webp'):
        parser.error('Pillow requires WebP codec support')
    manifest = json.loads(args.manifest.read_text(encoding='utf-8'))
    thumbs = json.loads(args.thumbnails.read_text(encoding='utf-8'))
    assets = manifest['assets']
    if args.only:
        unknown = sorted(set(args.only) - set(assets))
        if unknown:
            parser.error(f'URLs are absent from the approved snapshot: {unknown}')
        assets = {url: assets[url] for url in dict.fromkeys(args.only)}
    # Reject unpinned manifests before making any network requests.
    for url, asset in assets.items():
        if asset.get('url') != url or not all(asset.get(k) for k in ('source_sha256','source_bytes','sha256','bytes','local')):
            parser.error(f'Incomplete hash-pinned metadata: {url}')
        public_path(args.output_dir, asset['local'])
    errors, results = [], []
    started = time.monotonic()
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(restore_one, url, asset, thumbs, args.output_dir, args.retries): url for url, asset in assets.items()}
        for future in as_completed(futures):
            url = futures[future]
            try:
                results.append(future.result())
            except Exception as exc:
                errors.append({'url': url, 'error': str(exc)})
    report = {'expected_assets': len(assets), 'verified_assets': len(results),
              'downloaded_assets': sum(not r['cached'] for r in results),
              'verified_cached_assets': sum(r['cached'] for r in results),
              'full_media_bytes': sum(r['bytes'] for r in results),
              'thumbnail_bytes': sum(r['thumbnail_bytes'] for r in results),
              'seconds': round(time.monotonic() - started, 2),
              'runtime': {'python': sys.version.split()[0], 'pillow': PIL.__version__, 'requests': requests.__version__, 'libwebp': features.version('webp')},
              'errors': errors, 'results': results}
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({key: value for key, value in report.items() if key != 'results'}, ensure_ascii=False, indent=2))
    return 1 if errors else 0


if __name__ == '__main__':
    raise SystemExit(main())
