from pathlib import Path
import os
from supabase import create_client, Client

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

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_KEY')

if not url or not key or key == 'your_supabase_anon_key_here':
    print('오류: SUPABASE_URL 또는 SUPABASE_KEY가 설정되지 않았거나 기본값입니다.')
    print('`.env.local` 파일에서 SUPABASE_KEY 값을 올바른 Anon Key로 업데이트하세요.')
else:
    try:
        supabase: Client = create_client(url, key)
        print('Supabase 클라이언트가 성공적으로 초기화되었습니다.')
        print(f'연결된 URL: {url}')
        # 예시: 'users' 테이블 등 조회 (실제 사용시 RLS 및 테이블 구성 필요)
        # response = supabase.table('users').select('*').limit(1).execute()
        # print('데이터 조회 성공:', response.data)
    except Exception as e:
        print('Supabase 초기화 중 오류 발생:', e)
