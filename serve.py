import http.server

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Remove conditional headers so we never return 304
        if 'If-Modified-Since' in self.headers:
            del self.headers['If-Modified-Since']
        if 'If-None-Match' in self.headers:
            del self.headers['If-None-Match']
        super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

http.server.HTTPServer(('', 8080), NoCacheHandler).serve_forever()
