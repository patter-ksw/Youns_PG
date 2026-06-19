import http.server
import socketserver
import json
import os
from pathlib import Path

PORT = 8000
HERE = Path(__file__).parent

def load_env_file(env_path: Path):
    config = {}
    if not env_path.exists():
        return config
    for line in env_path.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        k, v = line.split('=', 1)
        config[k.strip()] = v.strip()
    return config

class DashboardHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # Serve static files from the current directory
        return super().translate_path(path)

    def do_GET(self):
        if self.path == '/config':
            env_config = load_env_file(HERE / '.env.local')
            # fallback to os.environ if not in .env.local
            url = env_config.get('SUPABASE_URL') or os.getenv('SUPABASE_URL', '')
            key = env_config.get('SUPABASE_KEY') or os.getenv('SUPABASE_KEY', '')
            
            response_data = {
                'SUPABASE_URL': url,
                'SUPABASE_KEY': key
            }
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json; charset=utf-8')
            # Allow CORS just in case
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response_data).encode('utf-8'))
        else:
            # Standard static file serving
            super().do_GET()

if __name__ == '__main__':
    # Force the working directory to be the script directory so file serving works correctly
    os.chdir(str(HERE))
    
    # Allow port reuse to avoid 'Address already in use' errors on quick restarts
    socketserver.TCPServer.allow_reuse_address = True
    
    with socketserver.TCPServer(("", PORT), DashboardHandler) as httpd:
        print(f"서버가 http://localhost:{PORT} 에서 실행 중입니다.")
        print("종료하려면 Ctrl+C를 누르세요.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n서버를 종료합니다.")
