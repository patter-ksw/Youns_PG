# Youns_PG (윤이네 놀이터)

이 프로젝트는 윤이네 가족들과 친구들이 함께 유용하게 사용할 수 있는 놀이터 공간입니다. "공부방", "놀이방", "옷방" 등의 카테고리를 나누고, 그 안에 여러 편리하고 재미있는 기능들(번역기, 게임기 등)을 연결하여 사용할 수 있는 웹 대시보드 시스템입니다.

---

## 🛠️ 기능 구성
- **서비스 검색**: 상단의 검색창을 통해 필요한 기능 및 서비스를 실시간으로 검색할 수 있습니다.
- **카테고리 관리 (등록/수정/삭제)**: 편집 모드를 켜서 새로운 카테고리를 생성하거나 수정 및 삭제할 수 있습니다.
- **서비스 관리 (등록/수정/삭제)**: 각 카테고리 내부에 새로운 서브 기능(서비스)을 손쉽게 추가하고 편집할 수 있습니다.
- **Supabase 데이터베이스 연동**: 등록한 모든 카테고리와 서비스 데이터는 Supabase 클라우드 데이터베이스에 실시간으로 동기화되어 저장됩니다.

---

## 🚀 빠른 시작 가이드 (로컬 실행)

### 1단계: Supabase 데이터베이스 테이블 생성
대시보드를 실행하기 전에 데이터베이스 구조가 준비되어야 합니다.
1. [Supabase 대시보드](https://supabase.com/dashboard)에 접속합니다.
2. 좌측 메뉴의 **SQL Editor**로 이동한 뒤, **New Query**를 클릭합니다.
3. 이 프로젝트 루트에 생성된 **[schema.sql](schema.sql)** 파일의 내용을 전체 복사하여 붙여넣고 **Run** 버튼을 클릭하여 실행합니다.

### 2단계: 로컬 실행
의존성 패키지를 로드하고 local python server를 구동합니다.

1. **패키지 설치** (가상 환경 활성화 상태에서 실행):
   ```powershell
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```
2. **로컬 서버 기동**:
   ```powershell
   python server.py
   ```
3. **접속**:
   * 웹 브라우저를 열고 **`http://localhost:8000`** 으로 접속합니다.

---

## ⚙️ 환경변수 설정 (`.env.local`)
데이터베이스 연동 및 AI 설정을 위해 프로젝트 루트에 `.env.local` 파일이 다음과 같이 작성되어 있어야 합니다. 이 파일은 Git 추적에서 제외(`.gitignore`)됩니다.

```env
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=https://elfgvesstuizdapwcpxx.supabase.co
SUPABASE_KEY=your_supabase_anon_key
```

---

## 📁 주요 파일 및 폴더 구조
- **`server.py`**: 로컬 파일 서빙 및 `.env.local`의 보안 키를 프론트엔드로 전달하는 경량 Python 웹 서버.
- **`index.html`**: 대시보드의 화면 골격 및 카테고리/서비스 관리용 팝업(모달) 제공.
- **`index.css`**: 글래스모피즘(Glassmorphism)과 딥 퍼플 테마가 적용된 세련된 스타일시트.
- **`app.js`**: Supabase 연동 및 동적 화면 렌더링, 검색, CRUD 기능 수행.
- **`schema.sql`**: Supabase 데이터베이스 구축에 필요한 DDL 테이블 구조 및 초기 데이터 스크립트.
- **`gemini_example.py`**: 로컬 Gemini AI 동작 여부를 확인하기 위한 기존 예제 파일.
- **`supabase_example.py`**: Supabase Python 클라이언트 동작 검증용 예제 파일.

---

## 🔒 보안 주의 사항
- `SUPABASE_KEY` (Anon Key) 및 `GEMINI_API_KEY`와 같은 중요 보안 자격 증명은 절대 GitHub 퍼블릭 저장소에 커밋하지 마세요. (로컬 비밀 관리를 위해 `.env.local`을 사용합니다.)
