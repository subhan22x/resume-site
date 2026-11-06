#!/usr/bin/env python3
"""Local-only text editor for the static portfolio. Uses only Python's stdlib."""
import argparse
import hashlib
import html
from html.parser import HTMLParser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import re
import secrets
import threading
from urllib.parse import urlsplit, unquote

ROOT = Path(__file__).resolve().parent.parent
TOKEN = secrets.token_urlsafe(32)
LOCK = threading.Lock()
STRINGS = re.compile(r'"(?:[^"\\]|\\.)*"')


def digest(text):
    return hashlib.sha256(text.encode()).hexdigest()


class PageText(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.source = source
        self.lines = [0]
        self.lines.extend(m.end() for m in re.finditer('\n', source))
        self.stack = []
        self.segments = []
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        if tag not in {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}:
            self.stack.append(tag)

    def handle_startendtag(self, tag, attrs):
        pass

    def handle_endtag(self, tag):
        if tag in self.stack:
            self.stack = self.stack[:len(self.stack) - 1 - self.stack[::-1].index(tag)]

    def handle_data(self, data):
        if 'body' not in self.stack or any(t in self.stack for t in ['script', 'style', 'svg', 'button', 'textarea', 'select']):
            return
        if not data.strip():
            return
        line, col = self.getpos()
        start = self.lines[line - 1] + col
        end = self.source.find('<', start)
        if end == -1:
            end = len(self.source)
        self.segments.append({'start': start, 'end': end, 'text': data})

    def annotated(self):
        result = self.source
        for index in range(len(self.segments) - 1, -1, -1):
            segment = self.segments[index]
            start, end = segment['start'], segment['end']
            result = result[:start] + f'<span data-local-edit="{index}">' + result[start:end] + '</span>' + result[end:]
        return result


def shared_strings(source):
    items = []
    for match in STRINGS.finditer(source):
        value = json.loads(match.group())
        prefix = source[max(0, match.start() - 100):match.start()]
        label = re.search(r'(\w+)\s*:\s*$', prefix)
        items.append({'start': match.start(), 'end': match.end(), 'value': value,
                      'label': label.group(1) if label else 'List item'})
    return items


def replace_ranges(source, edits):
    for start, end, value in sorted(edits, reverse=True):
        source = source[:start] + value + source[end:]
    return source


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def respond(self, status, data, content_type='application/json'):
        body = data.encode() if isinstance(data, str) else json.dumps(data).encode()
        self.send_response(status)
        self.send_header('Content-Type', content_type + '; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def valid_host(self):
        return self.headers.get('Host') in {f'127.0.0.1:{self.server.server_port}', f'localhost:{self.server.server_port}'}

    def do_GET(self):
        if not self.valid_host():
            return self.respond(403, {'error': 'Local connections only.'})
        route = unquote(urlsplit(self.path).path)
        if route == '/__editor/client.js' or route == '/__editor/style.css':
            name = 'edit-site.js' if route.endswith('.js') else 'edit-site.css'
            return self.respond(200, (ROOT / 'tools' / name).read_text(), 'text/javascript' if name.endswith('.js') else 'text/css')
        if route == '/__editor/state':
            page = urlsplit(self.path).query
            if page not in {p.name for p in ROOT.glob('*.html')}:
                return self.respond(400, {'error': 'Choose a website page.'})
            source = (ROOT / page).read_text()
            shared = (ROOT / 'site-data.js').read_text()
            return self.respond(200, {'page': page, 'version': digest(source), 'sharedVersion': digest(shared),
                'pages': sorted(p.name for p in ROOT.glob('*.html')),
                'segments': [s['text'] for s in PageText(source).segments],
                'shared': [{'id': i, 'label': s['label'], 'value': s['value']} for i, s in enumerate(shared_strings(shared))]})
        relative = route.lstrip('/') or 'index.html'
        target = (ROOT / relative).resolve()
        if not target.is_relative_to(ROOT) or any(part.startswith('.') for part in Path(relative).parts) or relative.startswith('tools/'):
            return self.respond(404, {'error': 'Not found.'})
        if target.parent == ROOT and target.suffix == '.html' and target.is_file():
            source = target.read_text()
            result = PageText(source).annotated()
            config = json.dumps({'page': target.name, 'token': TOKEN}).replace('<', '\\u003c')
            injection = '<link rel="stylesheet" href="/__editor/style.css"><script>window.LOCAL_EDITOR=' + config + ';</script><script defer src="/__editor/client.js"></script>'
            result = result.replace('</body>', injection + '</body>')
            return self.respond(200, result, 'text/html')
        return super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_POST(self):
        origin = self.headers.get('Origin')
        if (not self.valid_host() or self.path != '/__editor/save' or
            self.headers.get('X-Editor-Token') != TOKEN or
            origin not in {f'http://127.0.0.1:{self.server.server_port}', f'http://localhost:{self.server.server_port}'}):
            return self.respond(403, {'error': 'This save must come from the local editor.'})
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if size < 1 or size > 1_000_000:
                raise ValueError('Save is too large.')
            payload = json.loads(self.rfile.read(size))
            page = payload['page']
            if page not in {p.name for p in ROOT.glob('*.html')}:
                raise ValueError('Unknown page.')
            with LOCK:
                path = ROOT / page
                source = path.read_text()
                shared_path = ROOT / 'site-data.js'
                shared = shared_path.read_text()
                if payload['version'] != digest(source) or payload['sharedVersion'] != digest(shared):
                    return self.respond(409, {'error': 'A source file changed since this page opened. Copy your edits, then reload before saving.'})
                segments, strings = PageText(source).segments, shared_strings(shared)
                edits, shared_edits = [], []
                for key, value in payload.get('edits', {}).items():
                    if not isinstance(value, str):
                        raise ValueError('Text edits must be strings.')
                    index = int(key)
                    if index < 0:
                        raise ValueError('Unknown text segment.')
                    segment = segments[index]
                    edits.append((segment['start'], segment['end'], html.escape(value, quote=False)))
                for key, value in payload.get('sharedEdits', {}).items():
                    if not isinstance(value, str):
                        raise ValueError('Shared edits must be strings.')
                    index = int(key)
                    if index < 0:
                        raise ValueError('Unknown shared field.')
                    segment = strings[index]
                    shared_edits.append((segment['start'], segment['end'], json.dumps(value, ensure_ascii=False)))
                outputs = [(path, replace_ranges(source, edits)), (shared_path, replace_ranges(shared, shared_edits))]
                for file, output in outputs:
                    if output != file.read_text():
                        temporary = file.with_suffix(file.suffix + '.editor-tmp')
                        temporary.write_text(output)
                        temporary.replace(file)
                return self.respond(200, {'saved': len(edits) + len(shared_edits)})
        except (ValueError, KeyError, IndexError, TypeError, json.JSONDecodeError) as error:
            return self.respond(400, {'error': str(error)})


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=3090)
    args = parser.parse_args()
    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    print(f'Edit your site at http://127.0.0.1:{args.port}/grow-jewelry.html', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
