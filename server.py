"""Небольшой локальный сервер для проверки лабораторной работы №5.

Запуск: python3 server.py (MacBook) или py server.py (Windows).
Используются только стандартные библиотеки Python.
"""

import json
import math
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock
from urllib.parse import parse_qs, urlsplit

PROJECT_DIR = Path(__file__).resolve().parent
PORT = 8000


class LabServer(ThreadingHTTPServer):
    def __init__(self, server_address, handler_class):
        super().__init__(server_address, handler_class)
        self.measurements = []
        self.unstable_calls = 0
        self.data_lock = Lock()


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PROJECT_DIR), **kwargs)

    def send_json(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        request = urlsplit(self.path)
        if request.path == '/api/images':
            demo = parse_qs(request.query).get('demo', [''])[0]
            if demo == 'error':
                self.send_json(503, {'error': 'Сервер изображений временно недоступен.'})
                return
            if demo == 'empty':
                self.send_json(200, [])
                return
            if demo == 'unstable':
                with self.server.data_lock:
                    self.server.unstable_calls += 1
                    call = self.server.unstable_calls
                if call <= 2:
                    self.send_json(503, {'error': 'Временная ошибка. Повторите запрос.'})
                    return

            photos = [
                {'id': 1, 'url': '/assets/gallery-01.svg', 'title': 'Рассвет в горах', 'description': 'Мягкий утренний свет над горными вершинами.'},
                {'id': 2, 'url': '/assets/gallery-02.svg', 'title': 'У моря', 'description': 'Спокойное побережье и тёплые оттенки неба.'},
                {'id': 3, 'url': '/assets/gallery-03.svg', 'title': 'Лесная тропинка', 'description': 'Прогулка среди деревьев и свежего воздуха.'},
                {'id': 4, 'url': '/assets/gallery-04.svg', 'title': 'Вечерний город', 'description': 'Огни города после захода солнца.'},
                {'id': 5, 'url': '/assets/gallery-05.svg', 'title': 'Тихое озеро', 'description': 'Гладь воды и отражения окружающих гор.'},
                {'id': 6, 'url': '/assets/gallery-06.svg', 'title': 'Домик в горах', 'description': 'Уютный домик на фоне спокойного пейзажа.'},
                {'id': 7, 'url': '/assets/gallery-07.svg', 'title': 'Полевые цветы', 'description': 'Летний пейзаж с цветущим лугом и облаками.'},
                {'id': 8, 'url': '/assets/gallery-08.svg', 'title': 'Северное сияние', 'description': 'Ночное небо и мягкие зелёные линии света.'}
            ]
            self.send_json(200, photos)
            return

        if request.path == '/favicon.ico':
            self.send_response(204)
            self.end_headers()
            return

        super().do_GET()

    def do_POST(self):
        if urlsplit(self.path).path != '/api/temperature':
            self.send_json(404, {'error': 'Такой адрес не найден.'})
            return

        try:
            content_length = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            self.send_json(400, {'error': 'Неверная длина запроса.'})
            return

        if content_length < 2 or content_length > 4096:
            self.send_json(400, {'error': 'Размер данных не подходит.'})
            return

        if 'application/json' not in self.headers.get('Content-Type', '').lower():
            self.send_json(415, {'error': 'Данные нужно отправлять в формате JSON.'})
            return

        try:
            payload = json.loads(self.rfile.read(content_length).decode('utf-8'))
        except (UnicodeDecodeError, ValueError):
            self.send_json(400, {'error': 'Неверный формат JSON.'})
            return

        if not isinstance(payload, dict):
            self.send_json(400, {'error': 'Ожидается объект с номером аудитории и температурой.'})
            return

        room = payload.get('room')
        temperature = payload.get('temperature')

        if not isinstance(room, str) or not room.strip() or len(room.strip()) > 20:
            self.send_json(400, {'error': 'Укажите номер аудитории (до 20 символов).'})
            return

        if type(temperature) not in (float, int) or not math.isfinite(temperature) or not -100 <= temperature <= 100:
            self.send_json(400, {'error': 'Укажите температуру числом от −100 до 100 °C.'})
            return

        room = room.strip()
        with self.server.data_lock:
            self.server.measurements.append({'room': room, 'temperature': temperature})
        self.send_json(200, {'message': f'Температура для аудитории {room} успешно сохранена.'})


def main():
    server = LabServer(('127.0.0.1', PORT), Handler)
    print(f'Лабораторная №5: http://localhost:{PORT}')
    print('Для остановки нажмите Ctrl + C.')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nСервер остановлен.')
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
