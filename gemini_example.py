from pathlib import Path
import os

def load_env_file(env_path: Path):
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        k, v = line.split('=', 1)
        k = k.strip()
        v = v.strip()
        if k and v and k not in os.environ:
            os.environ[k] = v


HERE = Path(__file__).parent
load_env_file(HERE / '.env.local')

key = os.getenv('GEMINI_API_KEY')
if not key:
    print('GEMINI_API_KEY가 설정되어 있지 않습니다. `.env.local` 또는 환경변수를 확인하세요.')
else:
    visible = key if len(key) <= 12 else key[:4] + '...' + key[-4:]
    print('GEMINI_API_KEY 로드됨: ', visible)
    print('참고: 실제 API 호출을 하려면 이 스크립트를 수정하여 HTTP 클라이언트 라이브러리로 요청을 보내세요.')
