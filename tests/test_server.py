"""Небольшие проверки локального API."""

import json
import sys
import threading
import unittest
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from server import Handler, LabServer  # noqa: E402


class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.httpd = LabServer(('127.0.0.1', 0), Handler)
        cls.address = f'http://127.0.0.1:{cls.httpd.server_port}'
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()
        cls.thread.join(timeout=3)

    def get_json(self, path):
        with urlopen(self.address + path, timeout=4) as response:
            return response.status, json.load(response)

    def post_json(self, value):
        request = Request(
            self.address + '/api/temperature',
            data=json.dumps(value, ensure_ascii=False).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        try:
            with urlopen(request, timeout=4) as response:
                return response.status, json.load(response)
        except HTTPError as error:
            return error.code, json.loads(error.read())

    def test_gallery_has_eight_images(self):
        status, data = self.get_json('/api/images')
        self.assertEqual(status, 200)
        self.assertEqual(len(data), 8)
        self.assertTrue(all(item['url'].endswith('.svg') for item in data))

    def test_empty_gallery(self):
        status, data = self.get_json('/api/images?demo=empty')
        self.assertEqual((status, data), (200, []))

    def test_gallery_error(self):
        with self.assertRaises(HTTPError) as raised:
            self.get_json('/api/images?demo=error')
        self.assertEqual(raised.exception.code, 503)

    def test_post_valid_temperature(self):
        status, data = self.post_json({'room': '310', 'temperature': 22.5})
        self.assertEqual(status, 200)
        self.assertIn('310', data['message'])
        self.assertEqual(self.httpd.measurements[-1], {'room': '310', 'temperature': 22.5})

    def test_post_requires_correct_data_types(self):
        status, data = self.post_json({'room': 310, 'temperature': '22.5'})
        self.assertEqual(status, 400)
        self.assertIn('error', data)

    def test_post_rejects_bool_as_temperature(self):
        status, data = self.post_json({'room': '310', 'temperature': True})
        self.assertEqual(status, 400)
        self.assertIn('error', data)


if __name__ == '__main__':
    unittest.main()
