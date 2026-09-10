#!/usr/bin/env python3
"""キャッシュを無効化するローカル開発用サーバー。
iPad側で古いJS/HTMLがキャッシュされ続けて更新が反映されない問題を防ぐため、
すべてのレスポンスに no-store を付けて配信する。
"""
import http.server
import socketserver

PORT = 8899


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), NoCacheHandler) as httpd:
        print(f"serving on port {PORT} (no-cache)")
        httpd.serve_forever()
