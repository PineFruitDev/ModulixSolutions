"""Validate exported HTML without network access or third-party dependencies."""
import sys
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit, unquote

ORIGIN = 'https://modulixsolutions.com'

class Page(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.ids, self.links, self.images = set(), [], []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.add(attrs['id'])
        if tag == 'a' and 'name' in attrs:
            self.ids.add(attrs['name'])
        if tag in ('a', 'area') and 'href' in attrs:
            self.links.append(attrs['href'])
        if tag in ('img', 'input') and (tag == 'img' or attrs.get('type') == 'image'):
            self.images.append(attrs)

    handle_startendtag = handle_starttag


def check(root):
    root = Path(root).resolve()
    pages = {p: Page(p.read_text()) for p in root.rglob('*.html')}
    errors = []
    if not pages:
        return ['No built HTML pages found; run npm run build first.']
    for path, page in pages.items():
        route = '/' + path.relative_to(root).as_posix()
        if route.endswith('index.html'):
            route = route[:-10]
        references = [(href, True) for href in page.links]
        for img in page.images:
            if 'alt' not in img or img['alt'] is None:
                errors.append(f'{route}: image missing alt: {img.get("src", "(no src)")}')
            if img.get('src'):
                references.append((img['src'], False))
        for raw, fragment in references:
            try:
                url = urlsplit(urljoin(ORIGIN + route, raw))
                if url.scheme not in ('http', 'https') or url.netloc not in (urlsplit(ORIGIN).netloc, 'www.modulixsolutions.com'):
                    continue
                target = (root / unquote(url.path).lstrip('/')).resolve()
                if not target.is_relative_to(root):
                    raise ValueError('path outside export')
                candidates = [target / 'index.html'] if url.path.endswith('/') else [target, target / 'index.html', Path(str(target) + '.html')]
                target = next((p for p in candidates if p.is_file()), None)
                if target is None:
                    errors.append(f'{route}: broken internal destination: {raw}')
                elif fragment and url.fragment and target in pages and unquote(url.fragment) not in pages[target].ids:
                    errors.append(f'{route}: missing fragment target: {raw}')
            except ValueError as exc:
                errors.append(f'{route}: invalid URL {raw!r}: {exc}')
    print(f'Checked {len(pages)} built HTML pages.')
    return errors

if __name__ == '__main__':
    errors = check(sys.argv[1] if len(sys.argv) > 1 else 'out')
    for error in errors:
        print(error, file=sys.stderr)
    sys.exit(bool(errors))
