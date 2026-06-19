# Youns_PG
윤이네 놀이터

이방은 윤이네 가족들과 필요한 친구들이 함께 공유하는 방입니다.
많은 도움이 되시고, 즐겁게 즐기세요~~^^

## Gemini AI 설정

로컬에서 Gemini AI를 사용할 수 있도록 기본 설정 파일을 추가했습니다.

- 비밀키는 `.env.local`에 저장되어 있습니다. 이 파일은 프로젝트 루트에 위치하며 Git으로 커밋되지 않습니다.
- 예제 스크립트 `gemini_example.py`가 제공되며, 실행하면 `.env.local` 또는 환경변수에서 `GEMINI_API_KEY`를 읽어 로드 여부를 확인합니다.

실행 방법 (PowerShell):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python gemini_example.py
```

보안 주의:

- API 키를 공개 저장소에 업로드하지 마세요. 키가 유출되었다고 의심되면 즉시 키를 재발급(rotate)하세요.
- 더 안전한 대안으로 운영체제의 비밀 관리자(Windows Credential Manager, macOS Keychain 등)를 사용하거나 CI/CD 비밀 저장소에 보관하세요.

다음 단계:

- 실제 Gemini/Vertex AI API 호출 예제를 추가해 드리겠습니다(원하시면 어떤 언어/라이브러리로 할지 알려주세요).

## GitHub Actions CI 및 비밀 등록

저장소에 CI를 추가했고, GitHub Actions에서 `GEMINI_API_KEY`를 비밀로 등록해 사용하도록 구성했습니다.

1. GitHub에 비밀 등록하기:

	- 리포지토리 페이지에서 `Settings` → `Secrets and variables` → `Actions`로 이동하세요.
	- `New repository secret` 클릭 후, 이름에 `GEMINI_API_KEY`, 값에 API 키를 붙여넣고 저장하세요.
	- 직접 링크: https://github.com/patter-ksw/Youns_PG/settings/secrets/actions

2. 워크플로 동작 방식:

	- 푸시 또는 PR 시 `main` 브랜치에 대해 `ci.yml` 워크플로가 실행됩니다.
	- 워크플로는 `GEMINI_API_KEY`를 환경변수로 주입하여 `gemini_example.py`를 실행합니다.

3. 배포:

	- 워크플로 내 `deploy` 단계는 `main` 브랜치에 병합될 때 실행되는 자리 표시자입니다. 실제 배포 명령(예: FTP, SSH, cloud provider CLI)은 여기에 추가하세요.

보안 권고: 리포지토리 비밀은 읽기 전용으로 저장되며 워크플로 내에서만 사용됩니다. 민감한 키는 공개 저장소나 로그에 출력되지 않도록 주의하세요.
