import importlib.util
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('checker', Path(__file__).with_name('check-built-pages.py'))
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)

class ExportCheck(unittest.TestCase):
    def test_destinations_fragments_and_alt(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'nested').mkdir()
            (root / 'image.png').write_bytes(b'image')
            (root / 'index.html').write_text('<a href="nested/?x=1#ok">Go</a><img src="image.png" alt="">')
            (root / 'nested/index.html').write_text('<h1 id="ok">OK</h1><a href="../">Home</a>')
            self.assertEqual(checker.check(root), [])
            (root / 'nested/index.html').write_text('<a href="/missing">Missing</a><img src="/absent.png"><a href="/#absent">Bad anchor</a>')
            errors = checker.check(root)
            self.assertEqual(len(errors), 5, errors)

    def test_empty_export_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            self.assertTrue(checker.check(directory))

if __name__ == '__main__':
    unittest.main()
