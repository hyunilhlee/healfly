from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from http.server import SimpleHTTPRequestHandler
import socketserver
import os
import time
import json
import urllib.request
import urllib.error
import traceback

class ProxyHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, OpenAI-Beta')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        SimpleHTTPRequestHandler.end_headers(self)

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def handle_openai_request(self, method):
        try:
            openai_path = self.path.replace('/api/openai/', '')
            openai_url = f'https://api.openai.com/v1/{openai_path}'
            
            print(f"\n=== OpenAI API {method} 요청 ===")
            print(f"URL: {openai_url}")
            print(f"Method: {method}")
            print(f"Headers: {self.headers}")
            
            headers = {
                'Content-Type': 'application/json',
                'Authorization': self.headers.get('Authorization'),
                'OpenAI-Beta': 'assistants=v1'
            }
            
            if method == 'POST':
                content_length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_length) if content_length > 0 else None
                if post_data:
                    print(f"Request Data: {post_data.decode()}\n")
            else:
                post_data = None
            
            req = urllib.request.Request(
                openai_url,
                data=post_data,
                headers=headers,
                method=method
            )
            
            try:
                with urllib.request.urlopen(req) as response:
                    response_data = response.read()
                    print(f"=== OpenAI API 응답 ===")
                    print(f"Status: {response.status}")
                    print(f"Response: {response_data.decode()}\n")
                    
                    self.send_response(response.status)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(response_data)
                    
            except urllib.error.HTTPError as e:
                error_body = e.read().decode()
                print(f"=== OpenAI API 에러 ===")
                print(f"Status: {e.code}")
                print(f"Error: {error_body}\n")
                
                self.send_response(e.code)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(error_body.encode())
            
        except Exception as e:
            print(f"=== 서버 에러 ===")
            print(f"Error: {str(e)}\n")
            print(f"Stack trace: {traceback.format_exc()}\n")
            
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'error': str(e)
            }).encode())

    def do_GET(self):
        if self.path.startswith('/api/openai/'):
            self.handle_openai_request('GET')
        else:
            SimpleHTTPRequestHandler.do_GET(self)

    def do_POST(self):
        if self.path.startswith('/api/openai/'):
            self.handle_openai_request('POST')
        else:
            SimpleHTTPRequestHandler.do_POST(self)

class ChangeHandler(FileSystemEventHandler):
    def on_modified(self, event):
        if event.src_path.endswith(('.js', '.css', '.html')):
            print(f"파일 변경 감지: {event.src_path}")

def find_free_port(start_port=8000, max_attempts=100):
    for port in range(start_port, start_port + max_attempts):
        try:
            with socketserver.TCPServer(("", port), None) as test_server:
                return port
        except OSError:
            continue
    raise OSError("사용 가능한 포트를 찾을 수 없습니다.")

def run_server():
    try:
        os.system("lsof -ti:8000 | xargs kill -9")
    except:
        pass

    try:
        PORT = find_free_port()
        Handler = ProxyHandler

        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            print(f"서버가 포트 {PORT}에서 실행 중입니다...")
            print(f"http://localhost:{PORT} 에서 접속 가능합니다.")
            
            event_handler = ChangeHandler()
            observer = Observer()
            observer.schedule(event_handler, path='.', recursive=True)
            observer.start()

            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                observer.stop()
                observer.join()
                print("\n서버를 종료합니다.")
            finally:
                httpd.server_close()

    except Exception as e:
        print(f"서버 실행 중 오류 발생: {e}")

if __name__ == "__main__":
    run_server() 