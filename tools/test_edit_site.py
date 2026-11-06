"""Persistence and request-boundary checks for the local source editor."""
import importlib.util
import json
from pathlib import Path
import tempfile
import threading
import unittest
from urllib.error import HTTPError
from urllib.request import Request, urlopen

spec = importlib.util.spec_from_file_location('edit_site', Path(__file__).with_name('edit-site.py'))
editor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(editor)


class EditorTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.old_root = editor.ROOT
        editor.ROOT = Path(self.temp.name)
        self.html = '<html><body><h1>Same</h1><p>Same <strong>bold</strong> &amp; more</p></body></html>'
        self.shared = 'window.SITE_DATA = { name: "Original", copyrightYear: new Date().getFullYear() };\n'
        (editor.ROOT / 'page.html').write_text(self.html)
        (editor.ROOT / 'site-data.js').write_text(self.shared)
        self.server = editor.ThreadingHTTPServer(('127.0.0.1', 0), editor.Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.origin = f'http://127.0.0.1:{self.server.server_port}'

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        editor.ROOT = self.old_root
        self.temp.cleanup()

    def save(self, **overrides):
        payload = dict(page='page.html', version=editor.digest(self.html), sharedVersion=editor.digest(self.shared), edits={}, sharedEdits={})
        payload.update(overrides)
        return urlopen(Request(self.origin + '/__editor/save', data=json.dumps(payload).encode(), headers={
            'Content-Type': 'application/json', 'Origin': self.origin, 'X-Editor-Token': editor.TOKEN}))

    def test_edits_target_one_text_segment_and_preserve_markup(self):
        self.save(edits={'1': 'Changed <safely> '}).close()
        output = (editor.ROOT / 'page.html').read_text()
        self.assertEqual(output, self.html.replace('<p>Same ', '<p>Changed &lt;safely&gt; '))
        self.assertIn('<h1>Same</h1>', output)
        self.assertIn('<strong>bold</strong> &amp; more', output)

    def test_shared_text_saves_without_rewriting_javascript(self):
        self.save(sharedEdits={'0': 'New "name" — ✓'}).close()
        self.assertEqual((editor.ROOT / 'site-data.js').read_text(), self.shared.replace('"Original"', json.dumps('New "name" — ✓', ensure_ascii=False)))

    def test_stale_save_does_not_overwrite_external_change(self):
        (editor.ROOT / 'page.html').write_text(self.html + '<!-- external change -->')
        with self.assertRaises(HTTPError) as context:
            self.save(edits={'0': 'Overwrite'})
        self.assertEqual(context.exception.code, 409)
        context.exception.close()
        self.assertTrue((editor.ROOT / 'page.html').read_text().endswith('<!-- external change -->'))

    def test_cross_origin_write_is_rejected(self):
        request = Request(self.origin + '/__editor/save', data=b'{}', headers={'Origin': 'https://example.com', 'X-Editor-Token': editor.TOKEN})
        with self.assertRaises(HTTPError) as context:
            urlopen(request)
        self.assertEqual(context.exception.code, 403)
        context.exception.close()
        self.assertEqual((editor.ROOT / 'page.html').read_text(), self.html)

    def test_hidden_files_are_not_served(self):
        (editor.ROOT / '.secret').write_text('private')
        with self.assertRaises(HTTPError) as context:
            urlopen(self.origin + '/.secret')
        self.assertEqual(context.exception.code, 404)
        context.exception.close()


if __name__ == '__main__':
    unittest.main()
