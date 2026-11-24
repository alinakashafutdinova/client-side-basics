"""Небольшой сервер для локальной проверки задания с SSE."""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import random
import time

MOVES = ("rock", "scissors", "paper")
PORT = 8000


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(Path(__file__).parent), **kwargs)

    def do_GET(self):
        if self.path.split("?", 1)[0] != "/events":
            return super().do_GET()
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.end_headers()
        try:
            while True:
                first = random.choice(MOVES)
                second = random.choice(MOVES)
                data = json.dumps({"player1": first, "player2": second}, ensure_ascii=False)
                self.wfile.write(f"event: round\ndata: {data}\n\n".encode("utf-8"))
                self.wfile.flush()
                time.sleep(2)
        except (BrokenPipeError, ConnectionResetError, TimeoutError):
            pass


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Сайт: http://localhost:{PORT}")
    print("Для остановки нажмите Ctrl+C")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
