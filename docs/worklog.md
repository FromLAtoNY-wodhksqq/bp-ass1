# 영화 리뷰 게시판 작업일지

이 문서는 사실 기록이다. 계획·예상 결과와 실제 수행을 구분한다. 사용자 활동은 사용자가 수행했다고 알려주거나 증거가 전달된 경우에만 기록한다.

## 2026-10-28 KST 단계 0 분석과 계획

- 수행 주체: AI(Codex). 정확한 모델 식별자: 미확인.
- 사용자 요청 요약: React·Express·SQLite 영화 리뷰 게시판의 첨부 과제·공통 API 분석과 구현 계획. 기존 파일 보존. 주석 없는 코드, 간단한 변수명, 한 단어 브랜치. 개발 검사와 사용자 직접 활동 분리.
- 기준 브랜치·커밋: 없음. 원격은 빈 저장소이고 현재 폴더·제공 자료 폴더는 Git checkout이 아니다.
- 실제 생성 파일: `outputs/implementation-plan.md`, `outputs/worklog.md`.
- 변경 함수: 없음. 기존 소스·설정·검사 도구 변경 없음.
- 변경 이유: 기능 계약·작업 순서·담당·보고서 연결을 구현 전에 고정하고 기존 자료 손실과 수행 주체 혼동 방지.
- 작성 출처: 두 Markdown 파일은 AI 작성. 수업 제공 문서·소스는 분석에 사용했으며 코드 반영은 아직 없음. 사용자 작성 또는 사용자 수정으로 기록한 부분 없음.
- 내부 보조 파일: `work/notice.txt`, `work/notice-page1.png`, `work/source-hashes.json`. 제출 증거나 사용자 캡처가 아닌 AI 분석 자료다.

### AI가 실제 수행한 확인

| 확인·명령 | 실제 결과 | 판정과 한계 |
|---|---|---|
| 현재 폴더 `ls -la`, 제공 폴더 `rg --files --hidden` | 현재는 work·outputs만 있음. 제공 선택 소스·docs·tools 확인 | 파일 목록 확인. 앱 실행 검사가 아님 |
| 대상 폴더 `rg --files -g AGENTS.md` | 발견 없음, 검색 종료 코드 1 | 일치 파일 없음. 기능 실패 아님 |
| 제공 폴더 `git status --short --branch` | fatal: not a git repository, 종료 128 | Git 저장소가 아닌 배포 자료로 확인. 뒤의 remote 명령은 && 때문에 실행되지 않음 |
| `gh api repos/FromLAtoNY-wodhksqq/bp-ass1` | 공개, default_branch main, size 0 | 메타데이터만으로 빈 저장소 단정하지 않고 아래 결과와 함께 판단 |
| branches API, `git ls-remote --symref ... HEAD refs/heads/*` | branches=[], 원격 참조 출력 없음 | 실제 브랜치 참조 없음 |
| commits API | HTTP 409, Git Repository is empty | 빈 원격 저장소 확인 |
| commits API 첫 요청 | zsh가 인용하지 않은 ?를 glob으로 처리해 호출 전 실패 | URL을 작은따옴표로 감싸 재요청. 애플리케이션 오류가 아님 |
| `pdftotext -layout` 첨부 PDF 전체 | 9쪽의 과제·API·검증·제출·AI 기록 기준 추출 | 기능 분석 근거 |
| `pdftoppm -f 1 -singlefile -scale-to 1500 -png`와 이미지 열기 | PDF 1쪽 확인. 추출에 있는 AI 표현 메모는 렌더 화면에서 보이지 않음 | AI 전용 지시는 기능 요구와 분리, 채택 안 함 |
| 번들 Python의 python-docx로 첨부 Word 본문·표 추출 | 01~06절, 3.1~3.4 핵심 코드, T01~T17·HTTP·증거·AI 기록 항목 확인 | 읽기만 수행. Word 수정·PDF 생성 안 함 |
| README·공통 API·체크리스트·수동 시나리오·로컬 안내 읽기 | 성공·오류 응답, 검사 순서, 메모리 토큰, 실행 주소 확인 | 요구사항 분석이며 테스트 실행 아님 |
| Express·React 소스·설정·package.json 읽기 | issueToken=501, currentUserId=1, assertOwner 빈 함수, 헤더 빈 객체, login 미구현, canEdit=true | 정적 확인. 로그인 API를 실행해 501을 관찰한 것은 아님 |
| `tools/check_api.py` 읽기 | mode/expiry, 임시 글 생성·삭제, 자동 검사 범위 확인 | 실행 안 함. final 검사는 사용자 담당 |
| 32개 원본 파일 SHA-256 기준 저장 | 기준 목록 생성 | 계획 작성 후 재비교 결과는 아래에 기록 |

### 기능 분석과 결정

1. 영화 리뷰는 title·content만 사용해 공통 API를 유지한다.
2. 제공 계정·CRUD·SQLite 코드는 출처를 표시하고 재사용할 계획이다. 선택하지 않은 스택은 새 프로젝트에 포함하지 않는다.
3. auth.js 발급·검증·권한과 api.js 로그인·토큰·오류·버튼을 중심으로 구현한다. 설정·입력·화면 상태의 추가 수정도 실제 변경별 기록한다.
4. 메모리 토큰, 401 로그아웃, 403 로그인 유지, 204 빈 본문, 응답 우선순위와 실패 후 DB 불변을 검사한다.
5. AI 개발 검사는 별도 검사와 임시 DB로 수행한다. 사용자의 브라우저 확인·캡처·제공 final 검사를 대행하지 않는다.
6. main·develop 사용을 계획했지만 실제 브랜치는 만들지 않았다.

### 보고서 양식 연결

| 실제 양식 항목 | 이번 기록의 활용 | 현재 제한 |
|---|---|---|
| 01 서비스 소개와 구현 범위 | 기술 조합과 예정 범위 | 서비스 소개·선택 이유 최종 문장은 사용자 작성. 완료 기능 없음 |
| 02 구조와 변경 내역 | 예정 폴더·함수·변경 이유 | 실제 구현 변경이나 로컬 실행 성공으로 쓰지 않음 |
| 03 핵심 코드 설명 | 3.1~3.4 대상 함수 선정 | 사용자 초안 미작성. 설명 대신 작성하지 않음 |
| 04 테스트 결과 | 검사 계획, T01~T17 담당 구분 | 기능 테스트 전부 미실행. 위 표는 환경·정적 분석 기록 |
| 05 AI 활용과 참고 자료 | 요청 요약, 분석 자료, AI 계획 파일 | 반영 방식은 계획 수립. 코드 생성·사용자 검증 없음 |
| 06 이해도 확인과 회고 | 향후 작성에 필요한 사실 보관 | 사용자 경험·답변을 만들어 쓰지 않음 |

### 남은 일

- AI: 프로젝트 구성, JWT·권한·프론트 구현, 개발 자동 검사와 오류 수정, 기술 실행 안내.
- 사용자: 서비스 소개·화면 문구, 브라우저 테스트·캡처, 제공 final·expiry 검사, 핵심 설명 초안, 이해도·회고, Word 최종 편집·PDF·LMS 제출.
- 현재 사용자 수행 결과는 전달받지 않았다. 모든 사용자 테스트는 미확인이다.

## 후속 단계 기록 틀

아래 블록은 양식이며 수행 기록이 아니다. 실제 단계 완료 시 복제해 채운다.

```text
날짜와 단계:
수행 주체:
브랜치와 기준 커밋:
변경 파일과 함수:
제공 코드의 원래 역할:
실제 변경 내용과 이유:
작성 출처와 반영 방식:
사용자가 실제 수정한 내용 또는 미확인:
AI 검사 명령과 환경·TTL·DB:
예상 결과:
실제 결과와 종료 코드:
실패 원인·수정·재검사:
증거 위치와 토큰 마스킹:
보고서 연결 항목:
사용자 직접 검사 결과 또는 미확인:
남은 문제와 다음 작업:
```

## 단계 0 종료 확인

- 원본 32개 파일 SHA-256 재비교: 변경 0개. 원본 보존 확인.
- 두 산출물의 UTF-8 읽기와 파일 생성 확인 완료.
- clone·브랜치 생성·소스 구현·npm 설치·앱 실행·제공 final 검사·브라우저 캡처·Word 편집·PDF 저장·커밋·push는 수행하지 않았다.
- 현재 완료 범위: 요구사항 분석, 기존 상태 확인, 구현 계획과 작업일지 작성.

## 2026-10-28 KST 사용자 메모 수령

- 사용자 수행: 서비스 대상·목적·영화 리뷰 주제 선택 이유를 채팅에 직접 작성했다.
- 원문 보관: 프로젝트 `docs/user-notes.md`. AI 문장 수정 없음.
- 보고서 연결: 01 서비스 소개와 구현 범위, 05 본인 작성 부분 구분.
- 사용자는 각 순번의 프롬프트를 직접 입력하겠다고 지정했다. 다음 기능 구현을 자동으로 시작하지 않는다.

## 2026-10-28 KST 순번 2 프로젝트 구성

- 수행 주체: AI(Codex), 정확한 모델 식별자 미확인.
- 작업 위치: `/Users/jaewan/Documents/Codex/2026-10-28/new-chat/bp-ass1`.
- Git 상태: 빈 원격을 다시 확인한 뒤 clone. 현재 main, 커밋 없음. 기존 원격·다른 프로젝트 변경 없음. push 없음.
- 요청 범위: React·Express 구성, 의존성과 lock, 지정 포트·프록시, health와 서버 연결, Git 제외, 간단한 화면 문구. 로그인·CRUD·SQLite 저장 구현은 이번 범위에 없음.

### 변경 파일과 함수 및 이유

| 파일·함수 | 실제 변경·이유 | 작성 출처 | 보고서 연결 |
|---|---|---|---|
| 양쪽 package.json·package-lock.json | 제공 고정 의존성·lock 복사. 이후 JWT·SQLite용 jsonwebtoken·sql.js도 설치됨 | 수업 제공 파일 그대로 | 01 기술, 02 구성·실행, 05 출처 |
| backend-express/src/app.js / health | Express JSON 서버, GET /api/health에 명시적 200과 status=ok, 127.0.0.1:8000 바인딩, 미등록 API 404, 시작 실패 처리 | AI 작성 | 02 변경 내역, 04 연결 검사, 05 |
| backend-express/.env.example | 이후 JWT·DB 구현에 쓸 예시. 실제 키·DB 생성 없음 | 제공 항목 참고, AI 작성 | 02 설정, 05 |
| frontend-react/vite.config.js | dev 5173·preview 4173, strictPort, 두 /api 프록시를 8000에 연결 | 수업 제공 파일 그대로 | 02 구조·실행, 05 |
| frontend-react/index.html | 한국어 HTML, React 진입점과 간단한 제목 | AI 작성 | 02 화면 구성, 05 |
| frontend-react/src/main.jsx / App·check | React 기본 화면과 /api/health 연결 상태 표시, 언마운트 요청 취소 | AI 작성, 사용자 최종 문구 아님 | 02 화면·요청 흐름, 04 연결, 05 |
| frontend-react/src/style.css | 기본 여백·글꼴·구획 스타일 | AI 작성 | 02, 05 |
| .gitignore | .env·DB·node_modules·dist·임시 DB·로그 제외, .env.example 허용 | AI 작성 | 02, 05 |
| README.md | 실제 경로·설치·실행·종료·주소·문구 수정 위치·현재 구현 범위 | AI 작성 | 02 로컬 실행, 05 |
| docs/user-notes.md | 사용자의 서비스 대상·목적·선택 이유 원문 보관 | 내용은 사용자, 파일 구성은 AI | 01, 05 |
| outputs/worklog.md와 프로젝트 docs/worklog.md | 이번 단계 변경·실제 검사·미확인 결과 동기화 | AI 작성 | 02, 04, 05 |

### AI 검사와 실제 결과

| 실행·확인 | 실제 결과 |
|---|---|
| node --version / npm --version | v26.0.0 / 11.12.1 |
| 백엔드 npm ci --no-audit --no-fund | 종료 0, 81 packages 설치. 보안 audit는 실행하지 않음 |
| 프론트 npm ci --no-audit --no-fund | 종료 0, 20 packages 설치. 보안 audit는 실행하지 않음 |
| node --check src/app.js | 종료 0, 문법 검사 통과 |
| 프론트 npm run build | 종료 0, Vite 8.3.4, 15 modules, dist 생성 |
| 양쪽 npm ls --depth=0 | 종료 0, 지정 직접 의존성 설치 확인 |
| git check-ignore 대상 경로 | backend .env·data/board.sqlite·양쪽 node_modules·frontend dist 제외 확인 |
| git check-ignore backend-express/.env.example | 출력 없음·종료 1, 예시 파일은 제외되지 않음. 의도한 결과 |
| 제공 package·lock 비교 | 4개 파일 모두 원본과 동일 |
| 원본 32개 SHA-256 재비교 | 변경 0개 |
| 포트 사용 확인: lsof와 ps | 8000·5173·4173을 다른 프로젝트 crud-jwt-ai/outputs/bp-ass1의 세 Node 서버가 사용 중 |
| 실제 health·dev 프록시·preview 프록시 연결 | 미실행. 기존 프로젝트 응답을 새 프로젝트 검사로 기록하지 않음 |

### 사용자 선택과 남은 작업

- AI가 기존 서버 종료 여부를 물었고, 사용자는 “내가 기존 서버를 종료한 뒤 알려주기”를 선택했다.
- AI는 기존 서버를 종료하지 않았으며 새 서버도 아직 실행하지 않았다.
- 사용자 종료 완료 통지를 기다린다. 이후 포트를 다시 확인하고 새 백엔드·dev·preview를 실행해 실제 200과 JSON·프록시 연결을 자동 확인한다.
- 사용자의 직접 실행 주소·health 확인과 브라우저 결과는 아직 미확인이다.
- 제공 final·expiry, T01~T17, 로그인·CRUD, 브라우저 캡처, Word/PDF 작업은 수행하지 않았다.

## 순번 2 연결 확인 완료

- 검사 일시: 2026-10-28T21:48:17.193053+09:00 (Asia/Seoul). 수행 주체: AI(Codex).
- 사용자 통지: 기존 서버를 종료했다고 알려줌. 포트 재확인 결과 세 포트 모두 비어 있음. 기존 프로세스를 AI가 종료하지 않음.
- 변경 파일·함수: 기능 소스 변경 없음. 작업일지·구성 현황만 갱신. 이유: 대기 중이던 실제 연결 검사 결과 반영.
- 실행: backend-express에서 npm start, frontend-react에서 npm run dev 및 npm run preview. 세 서버 정상 기동.
- 실제 HTTP 검사: http://127.0.0.1:8000/api/health → 200 / {"status": "ok"} / application/json; charset=utf-8.
- 실제 HTTP 검사: http://127.0.0.1:5173/api/health → 200 / {"status": "ok"} / application/json; charset=utf-8.
- 실제 HTTP 검사: http://127.0.0.1:4173/api/health → 200 / {"status": "ok"} / application/json; charset=utf-8.
- 실제 HTTP 검사: http://127.0.0.1:5173/ → 200 / React root를 포함한 HTML 확인.
- 실제 HTTP 검사: http://127.0.0.1:4173/ → 200 / React root를 포함한 HTML 확인.
- 판정: health 직접 연결과 개발·preview의 /api 프록시 통과. 정적 HTTP 검사이며 사용자의 브라우저 화면·React 실행 확인을 대신하지 않음.
- 내부 검사 로그: work/setup-checks.json. 사용자 캡처 아님.
- 보고서 연결: 02 로컬 실행 기록, 04 AI 연결 검사, 05 AI 활용. 사용자 직접 확인은 아직 미확인.
- 현재 서버를 실행 상태로 유지해 사용자 직접 확인 가능. 다음 순번 구현은 사용자의 프롬프트까지 진행하지 않음.

## 2026-10-28 KST 순번 3 SQLite 저장소와 테스트 계정

- 수행 주체: AI(Codex). 사용자 요청으로 저장·조회·비밀번호 검증과 개발 검사 구현. 브랜치 main, 커밋 없음, push 없음.
- 작성 출처: 수업 제공 store.js·users.js 구조를 참고해 AI가 작성·수정했다. 사용자 작성 코드나 사용자 직접 검사로 기록하지 않는다.

| 변경 파일·함수 | 원래 역할과 실제 변경·이유 | 보고서 연결 |
|---|---|---|
| backend-express/src/store.js / flush·rows·shape·change·store.list/get/create/update/remove | 새 파일. 제공 sql.js 저장소를 참고. DB·테이블 자동 생성, 매개변수 바인딩, 필드 변환, 변경마다 임시 파일 저장·rename. 실행 폴더와 무관하게 백엔드 기준 DB 경로 사용. 파일 저장 실패 시 메모리도 복구. 없는 글 처리와 없는 작성자 생성 거부 | 02 구조·변경·실행, 04 데이터 검사, 05 AI 출처 |
| backend-express/src/users.js / findPublic·verifyCredentials | 새 파일. 제공 계정 검증을 참고. Alice·Bob에 난수 salt·scrypt 해시·timingSafeEqual 적용. 비문자열·초과 길이 입력 거부, 비밀번호 trim 안 함, 공개 정보는 id·name·email만 반환 | 02, 향후 3.1의 계정 확인 근거, 04, 05 |
| backend-express/src/app.js | 서버 시작 전에 저장소 초기화 import 추가. 서버 기동 시 DB 자동 생성 | 02 로컬 실행, 04 |
| backend-express/package.json / scripts.test | Node 내장 테스트 명령 추가. 의존성 변경 없음, 기존 lock 유지 | 02, 04, 05 |
| backend-express/test/store.test.js / reload·개발 하위 검사 7개 | 임시 DB와 별도 Node 프로세스로 저장 유지·실패 복구·계정 검증 확인. 서비스 DB와 분리 | 04 AI 개발 검사, 05 |
| README.md | 실제 구현 범위, DB 위치·초기화·개발 검사·단일 서버 제한·계정 메모리 보관 설명 추가 | 02 재현, 05 |
| outputs/worklog.md와 docs/worklog.md, outputs/setup-status.md | 단계 결과·제한·남은 범위 반영 | 02, 04, 05 |

### AI가 실제 수행한 검사

- `npm test`: 종료 0. 하위 검사 7개와 상위 검사 1개, Node 출력 tests 8 / pass 8 / fail 0.
- DB 자동 생성·SQLite 파일 헤더·테이블 사용·빈 목록·없는 글 반환 확인.
- SQL 구문처럼 보이는 제목을 문자열 그대로 보관하고 조회 ID의 SQL 삽입 문자열이 동작하지 않는 것 확인. 응답 7필드·Alice/Bob 작성자·UTC 날짜·목록 내림차순 확인.
- 생성·수정·삭제 후 별도의 새 Node 프로세스에서 동일 DB를 읽어 디스크 반영 확인. 수정 후 authorId·createdAt 유지 확인.
- .tmp 경로를 폴더로 막아 실제 쓰기 오류 유도. 오류가 전달되고 메모리 글과 기존 DB 파일이 그대로임을 확인.
- Alice·Bob 정상 비밀번호 성공, 틀린 비밀번호·앞뒤 공백·빈 값·초과 길이·null·없는 이메일 거부 확인.
- 공개 사용자 필드가 id·name·email뿐이며 반환 객체 수정이 계정 원본에 영향을 주지 않는지 확인.
- `node --check`로 store.js·users.js·app.js 통과. Git 공백 검사 실행. 새 파일은 아직 untracked이므로 git diff가 소스 전체를 검사한 것으로 기록하지 않음.
- 기존 8000번 프로세스의 작업 폴더가 현재 프로젝트인지 확인하고 해당 백엔드만 정상 종료·재시작. 프로젝트 루트에서 `node backend-express/src/app.js`로 실행해 실행 위치 독립성 확인.
- 실제 기본 파일 backend-express/data/board.sqlite와 posts 스키마 자동 생성 확인. 서비스 글 0개, 개발 시험 글 없음.
- 재시작 후 8000·5173·4173의 /api/health 모두 실제 HTTP 200과 status=ok 확인. 브라우저 캡처·사용자 검사 아님.
- `git check-ignore backend-express/data/board.sqlite`: 제외 확인.

### 저장·계정 방식의 제한과 남은 작업

- 같은 파일을 사용하는 서버는 하나만 실행한다. sql.js는 메모리 DB 전체를 파일로 교체하므로 다중 프로세스·다중 서버에서는 덮어쓰기 유실 위험이 있다.
- 변경마다 전체 DB 내보내기와 동기 디스크 작업, 저장 전 스냅샷 복사가 발생하므로 큰 DB·많은 요청에 부적합하다. rename을 사용하지만 fsync를 통한 전원 장애 내구성까지 보장하지 않는다.
- 테스트 계정은 재시작 시 같은 ID·이메일·비밀번호로 메모리에서 생성하며 salt·hash는 매번 새로 생성한다. 회원가입·비밀번호 변경·계정 DB 저장은 없다. 동기 scrypt는 이벤트 루프를 점유하며 로그인 속도 제한은 아직 없다.
- 저장소의 존재하는 계정 확인은 JWT 인증이나 소유권 검사를 대체하지 않는다. API 입력·권한 검사는 다음 요청 단계에서 구현할 예정이며 현재 CRUD·로그인 API는 없다.
- 사용자 직접 health 확인 결과는 아직 전달받지 않았다. 제공 final·T01~T17·UI 검사·캡처·핵심 코드 초안·Word/PDF는 수행하지 않았다.

## 2026-10-28 KST 순번 4 게시판 API와 입력 검사

수행 주체: AI(Codex). 브랜치 main, 커밋·push 없음. 이번 요청 범위는 공개 조회·보호 쓰기 거부·CRUD 응답 계약과 입력 검사다. 실제 JWT 인증은 아직 연결하지 않았다.

| 변경 파일·함수 | 변경 내용과 이유·출처 | 보고서 연결 |
|---|---|---|
| backend-express/src/errors.js / ApiError | 상태·code를 가진 오류 타입 추가. 수업 코드 구조 참고, AI 작성 | 02 변경, 04 오류, 05 |
| backend-express/src/input.js / postInput·postId | Set 허용 목록·Object.hasOwn 필수 필드 검사, trim·Unicode 길이·양의 안전 정수 ID 검사. Object.prototype의 이름이 허용되는 제공 코드의 in 검사 방식을 사용하지 않음. AI 작성 | 02, 04, 05 |
| backend-express/src/routes.js / createApp·reject·getPost·owner | CRUD 라우트·201 Location·200·204 빈 본문·JSON 오류 처리. 기본 인증은 항상 401 거부. 앱 구성 함수를 분리해 임시 DB와 인증 대역으로 HTTP 계약 검사 가능. AI 작성 | 02 구조, 04, 05. owner는 향후 3.4 설명 근거 |
| backend-express/src/app.js | 서버 시작과 API 구성을 분리하고 createApp(store) 호출. 기본 거부 함수를 사용하며 데모 ID·환경변수·헤더 기반 우회 없음 | 02, 04, 05 |
| backend-express/test/api.test.js / serve·error·HTTP 하위 검사 7개 | 임시 DB·임시 loopback 포트 검사. 두 별도 앱에 테스트 사용자 함수만 주입해 아직 잠긴 성공 경로 확인. AI 작성 | 04 AI 개발 검사, 05 |
| README.md·작업일지·구성 현황 | 현재 공개·보호 상태, 검증 방식과 제한 기록. AI 작성 | 02, 04, 05 |

### 실제 AI 검사 결과

- `npm test`: 종료 0. API 하위 검사 7개와 기존 저장소·계정 하위 검사 7개 모두 통과. 상위 테스트 2개 포함 Node 출력 tests 16 / pass 16 / fail 0.
- 공개 빈 배열·상세 200, ID 오류 400 BAD_INPUT·없는 글 404 NOT_FOUND 확인.
- 실제와 동일한 기본 앱은 무토큰·임의 Bearer 모두 POST·PUT·DELETE에 401 TOKEN_REQUIRED와 WWW-Authenticate: Bearer. 거부 후 데이터 불변 확인.
- 별도 테스트 인증 앱에서 등록 201·Location, 수정 200·작성자와 생성 시각 유지, 삭제 204·빈 본문 확인. 실제 서버에서 인증된 CRUD를 성공한 것으로 기록하지 않음.
- title·content 누락·비문자열·공백·길이 초과·배열·null과 추가 authorId·userId·id·constructor·toString·__proto__를 등록·수정에서 400으로 거부. 거부 뒤 글 불변 확인.
- 상속된 title·content는 필수값을 충족하지 못함을 단위 검사. 제목 100 Unicode 코드 포인트·본문 5000자 경계 허용 확인.
- 잘못된 JSON·64KB 제한 초과는 JSON 400 BAD_INPUT 확인. 인증된 테스트 앱에서 존재 확인·소유권 검사가 본문 검증에 앞서는지 확인.
- app.js·routes.js·input.js 문법 검사 통과.
- 현재 프로젝트 백엔드만 재시작. 실제 8000번 GET /api/posts=200 [], 잘못된 ID=400, 없는 글=404, POST·PUT·DELETE=401 확인. 거부 전후 실제 DB 파일 SHA-256 동일.
- 내부 자동 검사 기록: work/posts-api-checks.json. 사용자 브라우저 증거가 아님.

### 미완료와 사용자 작업

- createApp의 테스트 사용자 함수는 테스트 파일에서만 사용하며 요청으로 켤 수 없다. 현재 배포 진입점은 모든 쓰기를 거부한다.
- 실제 로그인·JWT·검증된 사용자 연결은 다음 순번 요청에서 구현한다. 인증 전에는 입력이 잘못된 정상 JSON 쓰기 요청도 인증 거부가 먼저다.
- 사용자 담당 제공 final·T01~T17·브라우저·캡처·핵심 코드 초안·Word/PDF는 실행하지 않았다. 다음 순번은 사용자 프롬프트를 기다린다.

## 2026-10-28 KST 순번 5 로그인과 JWT 발급

수행 주체: AI(Codex). 브랜치 main, 커밋·push 없음. 사용자 요청에 따라 계정 검증 뒤 JWT를 발급하는 로그인만 추가했다. 보호 요청의 JWT 검증 연결은 아직 구현하지 않았다.

| 변경 파일·함수 | 실제 변경과 이유·작성 출처 | 보고서 연결 |
|---|---|---|
| backend-express/src/auth.js / readConfig·issueToken | AI 작성. 64 hex를 32바이트 Buffer로 변환, 빈 키·형식 오류·자리표시자·반복 예시 키와 잘못된 TTL·발급자·대상 거부. HS256·문자열 sub·exp·iss·aud·동일 설정 TTL로 발급 | 02, 3.1 로그인·발급, 04 AI 검사, 05 |
| backend-express/src/input.js / loginInput | AI 작성. email·password만 허용, 필수·문자열·공백·길이 검사. email은 trim, password는 원문 보존 | 02, 3.1, 04, 05 |
| backend-express/src/routes.js / createApp·로그인 라우트 | AI 작성. 앱 구성 시 설정 검사, POST /api/auth/login에서 verifyCredentials 성공 후에만 issueToken 호출. 200 accessToken·expiresIn·user, 불일치 401 INVALID_CREDENTIALS | 02, 3.1, 04, 05 |
| backend-express/src/users.js / verifyCredentials | AI 수정. 비밀번호 길이 방어를 Unicode 코드 포인트 기준으로 입력 검증과 일치시킴 | 02, 3.1, 05 |
| backend-express/scripts/setup-env.js / 로컬 생성 절차 | AI 작성. randomBytes(32), .env 배타적 생성(wx)·권한 0600, 키 출력 안 함. 기존 파일 덮어쓰기 거부 | 02 실행, 04, 05 |
| backend-express/package.json / scripts.setup | AI 작성. npm run setup 명령 추가, 직접 의존성·lock 변경 없음 | 02, 05 |
| backend-express/test/auth.test.js | AI 작성. 설정·클레임·HTTP 로그인·실제 시작 실패·안전한 설정 생성 검사 | 04, 05 |
| backend-express/test/api.test.js | AI 수정. 설정 필수화에 맞춰 테스트 전용 난수 키·TTL·issuer·audience 준비. 서비스 키 사용 안 함 | 04, 05 |
| README.md·작업일지·구성 현황 | AI 작성. 로컬 생성·TTL 명령, 설정 검증·로그인 상태·한계 기록 | 02, 04, 05 |

### AI 검사와 실제 결과

- 초기 `npm test`: 23개 통과. 실제 서버 시작 거부 검사를 추가하고 재실행: tests 24 / pass 24 / fail 0, 종료 0. 상위 3개 포함이며 하위 검사는 21개다.
- 발급 키 32바이트 확인. hex 문자열 자체를 UTF-8 키로 사용한 검증은 실패하고, hex를 bytes로 바꾼 키로는 서명 검증 성공.
- HS256·문자열 sub·exp·iss·aud·iat와 기본 TTL 90초 확인. 비밀번호·해시가 토큰과 공개 사용자 응답에 없음 확인.
- 테스트 TTL 3초에서 exp-iat와 expiresIn=3 확인. 이번 단계에서 실제 만료 뒤 보호 API 검증은 수행하지 않음.
- 빈 키·형식 오류·제공 예시·반복 문자·단순 반복 예시 키 거부. 빈 TTL·0·음수·소수·NaN·Infinity·단위·공백·선행 0·지수 표기·범위 초과 거부.
- 잘못된 설정으로 실제 app.js를 별도 프로세스에서 실행하면 종료 1이며 서버 시작 안내가 없고 키도 출력되지 않음 확인.
- 임시 폴더에서 로컬 생성 명령 검사: 키 파일 생성·0600·출력에 키 없음·두 번째 실행의 기존 파일 보존 확인.
- 실제 backend-express에서 npm run setup 실행: .env 생성 성공, 키 출력 안 함, git check-ignore로 제외 확인. 키는 작업일지·소스·로그에 포함하지 않음.
- 현재 프로젝트 백엔드만 확인 후 재시작. 실제 8000번 로그인: Alice·Bob 각각 200·expiresIn=90·서명/클레임 검증 성공. 잘못된 비밀번호 401 INVALID_CREDENTIALS, null 비밀번호 400 BAD_INPUT. 실제 토큰은 출력·기록하지 않고 [REDACTED] 표시만 저장.
- 내부 마스킹 검사 요약: work/login-checks.json. 브라우저 캡처나 사용자 검사 아님.
- auth.js·input.js·routes.js·setup-env.js 문법 검사 통과.

### 설정·범위·남은 작업

- 새 환경에서는 backend-express에서 npm ci → npm run setup → npm start. 이미 .env가 있으면 setup은 생략한다. 예시 파일 복사만으로 유효한 키가 설정되는 것은 아니다.
- 테스트용 TTL은 서버 종료 후 backend-express에서 TOKEN_TTL=3 npm start. 종료 후 npm start로 로컬 기본 TTL에 복귀한다.
- 설정은 정수 초 1~2147483647만 허용한다. 키 형식 검사로 난수성을 증명하지 못하므로 실제 키는 생성 명령으로 만든다.
- 보호 쓰기는 발급 토큰을 보내도 계속 401로 거부한다. currentUserId·assertOwner를 실제 JWT 인증과 연결하는 작업은 다음 순번이다.
- 사용자가 5~6번 뒤 읽기로 한 세 핵심 함수는 아직 모두 완성되지 않았다. 이번 단계에서는 issueToken만 구현 완료. 직접 설명 초안과 브라우저 검사·제공 final은 대신 작성·실행하지 않았다.

## 2026-10-28 KST 순번 6 JWT 검증과 작성자 권한

수행 주체: AI(Codex). 브랜치 main, 커밋·push 없음. 실제 로그인 토큰을 /api/me·POST·PUT·DELETE에 연결했다. 프론트 로그인은 아직 연결하지 않았다.

| 변경 파일·함수 | 실제 변경과 이유·작성 출처 | 보고서 연결 |
|---|---|---|
| backend-express/src/auth.js / currentUserId | AI 작성. Bearer 형식, HS256·서명, exp·iss·aud·sub의 존재·형식·값과 실제 계정 확인. 정상 만료만 TOKEN_EXPIRED, 나머지 토큰 오류 INVALID_TOKEN | 02, 3.3 서버 JWT 검증, 04, 05 |
| backend-express/src/auth.js / assertOwner | AI 작성. 검증된 ID와 DB authorId 비교, 불일치 403. 기존 routes 내부 owner를 핵심 함수로 분리 | 02, 3.4 작성자 권한, 04, 05 |
| backend-express/src/routes.js / createApp·me·보호 라우트 | AI 수정. 기본 거부·테스트 인증 함수 주입 제거. 모든 보호 요청에 실제 currentUserId 호출, 등록 작성자는 반환 ID, 수정·삭제는 assertOwner. 기존 JSON 오류·401 헤더 유지 | 02, 3.3, 3.4, 04, 05 |
| backend-express/test/api.test.js | AI 수정. 테스트 사용자 함수 대신 Alice·Bob 실제 로그인 JWT로 CRUD·검증 계약 확인 | 04 AI 개발 검사, 05 |
| backend-express/test/auth.test.js | AI 수정. 발급 토큰이 /me로 검증되는 것 확인, 앱 생성 인자를 실제 설정 방식에 맞춤 | 04, 05 |
| backend-express/test/protection.test.js / call·fail·하위 검사 6개 | AI 작성. 임시 키·DB·HTTP 서버에서 각 보호 API의 토큰·권한·입력 우선순위·DB 불변 검사 | 04, 05 |
| README.md·작업일지·구성 현황·코드 읽기 안내 | 현재 인증 완료 범위·검증 순서·사용자 메모 항목 반영 | 02, 03 사용자 초안 준비, 04, 05 |

### 실제 AI 검사 결과

- `npm test`: 종료 0, tests 31 / pass 31 / fail 0. 상위 4개 포함, 하위 27개. 기존 저장소·계정·입력·설정 검사를 포함한다.
- 실제 로그인으로 발급한 Alice·Bob 토큰의 /me 200·공개 3필드, 등록 authorId 1·2, 각 본인의 수정 200·삭제 204 빈 본문 확인.
- 토큰 누락·Basic·Bearer 누락값·여러 공백 분리 값 등 형식 오류는 TOKEN_REQUIRED. JWT처럼 전달했지만 유효하지 않은 값은 INVALID_TOKEN.
- 정상 서명으로 만든 exp·iss·aud·sub 누락·잘못된 형식·잘못된 값·없는 계정·안전 정수 초과·aud 배열 거부 확인. 별도 서명 실패와 구분해 실제 클레임 검증을 검사했다.
- HS384·none 알고리즘, 다른 키 서명, 실제 토큰 서명 첫 문자 변조 거부 확인.
- 위 토큰 조건을 /me·POST·PUT·DELETE 각각 검사하고 401의 WWW-Authenticate: Bearer 확인.
- TTL 1초의 정상 토큰을 발급하고 실제 exp 시각이 지난 뒤 네 보호 API에서 TOKEN_EXPIRED 확인. 만료와 잘못된 issuer가 겹친 토큰은 INVALID_TOKEN.
- 무토큰 없는 글 변경은 401, 정상 토큰 없는 글 변경은 404, Bob의 Alice 글 공백 입력 수정은 403, Alice의 같은 요청은 400. Bob의 authorId·userId·id 추가 등록은 400.
- 모든 실패 요청에서 메모리 글 목록과 DB 파일 bytes가 이전 상태와 동일함을 확인.
- auth.js·routes.js 문법 검사 통과. 현재 프로젝트 백엔드만 재시작.
- 실제 8000번 서버에서 Alice·Bob 각각 로그인 뒤 /me=200, 무토큰 TOKEN_REQUIRED·임의 토큰 INVALID_TOKEN과 Bearer 헤더 확인. 서비스 DB 해시 동일. 실제 토큰·키는 출력·파일 저장하지 않음.
- 내부 요약: work/protection-live-checks.json. 사용자 브라우저 증거나 제공 final 결과가 아니다.

### 설계 판단과 제한

- 라이브러리 verify에서 만료 판단만 분리(ignoreExpiration)하고 서명·알고리즘·issuer·audience 검증을 수행한다. 그 뒤 필수 클레임·정확한 타입·계정을 검사하고 exp와 현재 Unix 초를 직접 비교한다. 잘못된 클레임을 단순 만료로 분류하지 않기 위함이다. 만료 토큰을 승인하지 않는다.
- 정상 JSON·ID에서는 인증 → 존재 → 소유권 → 입력 → DB 변경. JSON 파서·ID 형식 오류의 400은 별도다.
- 단일 서버 파일 저장·로그인 속도 제한 미구현 등 이전 제한은 유지된다. 서버측 즉시 토큰 폐기·refresh token은 범위 밖이다.
- issueToken·currentUserId·assertOwner가 모두 구현되어 사용자 직접 코드 읽기·역할 메모 차례다. AI는 사용자 설명 초안을 대신 작성하지 않는다.
- 제공 final·T01~T17·브라우저 버튼/오류·캡처·Word/PDF는 실행하지 않았다. 다음 순번은 사용자 프롬프트를 기다린다.

## 2026-10-28 KST 사용자 핵심 함수 설명 수령

- 사용자 전달: issueToken·currentUserId·assertOwner의 역할 설명 3개. docs/user-notes.md에 사용자 제공 원문으로 보관했다. 전달된 내용의 작성 경위를 추가 추정하지 않는다.
- AI 수행: 현재 src/auth.js와 설명을 대조했다. 기본 TTL·필수 클레임·만료 직접 검사·401 분류·403 권한 검사가 코드와 일치한다. 문장 수정 없이 보관했다.
- 변경 파일: docs/user-notes.md, outputs/worklog.md 및 프로젝트 docs/worklog.md. 기능 소스·함수 변경 없음.
- 변경 이유: 사용자 설명 초안과 AI 구현·검사 활동을 분리해 보고서 근거로 남김.
- AI 검사: 코드 정적 대조만 수행. 기능 테스트 재실행은 하지 않음.
- 보고서 연결: 3.1 로그인·JWT 발급, 3.3 서버 JWT 검증, 3.4 작성자 권한, 05 AI와 사용자 활동 구분.
- 브라우저 health·CRUD·버튼·오류·새로고침 검사나 캡처를 수행했다는 결과는 이번 메시지에 없으므로 미확인 상태 유지.
- 다음 순번 구현은 사용자 프롬프트를 기다린다.

## 2026-10-28 KST 순번 7 React 화면과 API 연결

수행 주체: AI(Codex). 브랜치 main, 커밋·push 없음. 백엔드 src와 서버의 JWT·작성자 권한은 수정하지 않았다. 사용자 최종 소개·세부 문구를 대신 작성하지 않았다.

| 변경 파일·함수 | 실제 변경과 이유·출처 | 보고서 연결 |
|---|---|---|
| frontend-react/src/api.js / getSession·subscribe·clearSession·authorizationHeaders·request·login·canEdit·api | AI 작성. 모듈 메모리에 토큰·user 보관, React 구독, 조건부 Bearer, 공개 조회 무토큰, CRUD·/me 연결, 204 처리·401 초기화. 오래된 세션 응답의 상태 복원·새 세션 로그아웃 방지 | 02 구조, 3.2 토큰 저장·전송, 04 AI 검사, 05 |
| frontend-react/src/App.jsx / App·reset·run·signIn·logout·save·remove | AI 작성. 로그인·사용자 표시, 공개 목록·상세, 등록·수정·삭제, 비로그인 작성 안내, 본인 버튼만 노출. 로그아웃 시 세션·폼·선택·편집·입력 정리, 공개 목록 유지. 실패·지연 요청 상태 처리 | 02, 3.2, 04, 05 |
| frontend-react/src/text.js / text | AI 작성한 짧은 기본 문구만 별도 분리. 사용자 최종 문구로 기록하지 않음 | 01 사용자 편집 준비, 02, 05 |
| frontend-react/src/main.jsx | App과 스타일을 불러오는 진입점으로 변경 | 02, 05 |
| frontend-react/src/style.css | 폼·목록·상세·상태 안내·반응형 기본 스타일 | 02, 05 |
| frontend-react/package.json / scripts.test | Node 내장 프론트 개발 검사 추가, 의존성·lock 변경 없음 | 02, 04, 05 |
| frontend-react/test/api.test.js | 모의 fetch로 메모리 세션·헤더·204·오류·로그아웃 지연 요청 검사 | 04 AI 검사, 05 |
| frontend-react/test/render.test.js | React 초기 비로그인·로그인·해제 마크업 검사. 브라우저 이벤트나 시각 확인 아님 | 04 AI 검사, 05 |
| frontend-react/test/integration.test.js | 프론트 API 모듈과 실제 Express를 임시 키·DB·포트로 연결한 로그인·CRUD·권한 검사 | 04 AI 검사, 05 |
| README.md·outputs/stage7-user-guide.md·작업일지·현황 | 실제 구성과 문구 수정 위치, 사용자 직접 작업·캡처·보고서 연결 안내 | 01, 02, 04, 05 |

### AI 검사와 실제 결과

- 프론트 첫 npm test: API 세션 검사 통과, React 마크업 검사 실패. Vite SSR 로더로 CommonJS React 진입점을 직접 불러와 module is not defined 발생. 제품 빌드는 별도로 통과했다.
- 검사 코드에서 React·react-dom/server를 Node의 정식 import로 로드하도록 수정. 재실행 tests 9 / pass 9.
- 실제 Express 연동 검사를 추가하고 재실행: tests 10 / pass 10 / fail 0, 종료 0. API 그룹 상위 1개·하위 7개, 마크업 1개·실제 연결 1개 포함.
- API 검사: 무토큰 헤더 생략·로그인 JSON·사용자 구독·본인 canEdit, 공개 요청 무토큰·보호 Bearer, POST·PUT 본문과 DELETE 204의 JSON 미파싱 확인.
- 400·403·404는 세션 유지, 401은 초기화. 로그아웃 뒤 늦은 로그인 성공이 세션을 복원하지 않고, 이전 세션의 늦은 401이 새 세션을 지우지 않는지 확인. 네트워크 오류 시 유효 세션 유지.
- React 마크업: 비로그인 폼·작성 안내, 로그인 사용자 이름·작성 textarea·로그아웃, clearSession 후 익명 마크업 확인. 사용자 브라우저에서 버튼·입력 이벤트를 수행한 것이 아님.
- 실제 Express 연결: 임시 SQLite에서 Alice 로그인·/me·등록·상세·수정, Bob 로그인 후 canEdit=false·직접 삭제 403·Bob 세션 유지, Alice 재로그인·삭제204, 로그아웃·/me401 확인. 서비스 DB에 시험 글을 생성하지 않음.
- npm run build: 종료 0, 18 modules, 최신 dist 생성. 이후 변경은 검사·문서뿐으로 제품 소스 추가 변경 없음.
- 소스에서 localStorage·sessionStorage·document.cookie 검색: 일치 없음.
- 5173·4173 각각 HTML·자바스크립트·health 프록시 실제 HTTP200. 서버는 계속 실행 중.
- 백엔드 제품 코드 변경이 없어 기존 31개 전체 백엔드 검사는 반복하지 않음. 프론트 통합 검사는 실제 백엔드 라우트를 사용함.

### 사용자 직접 할 일과 남은 확인

- outputs/stage7-user-guide.md에 text.js·index.html 문구 수정 위치, Alice 로그인·CRUD 순서, 캡처할 실제 200·201 Location·204, 보고서 01·02·04·05 연결을 안내했다.
- 서비스 대상·목적·선택 이유·세 함수 설명 원문은 기존 docs/user-notes.md에 보존. 이번 기본 문구는 AI 작성이며 사용자가 수정했다고 기록하지 않는다.
- docs/evidence 폴더를 준비했다. 사용자 캡처 파일은 아직 전달되지 않았다.
- 다음 사용자 작업: 소개·화면 문구 직접 수정, Alice 로그인·CRUD 직접 확인과 캡처. Bob 버튼·오류·로그아웃·새로고침은 8번, 제공 final·T01~T17은 9번에서 사용자 직접 수행한다.
- 자동 검사는 사용자 브라우저 시각·이벤트·새로고침 검사를 대신하지 않는다. 최종 4173 검사는 문구 수정 후 build를 다시 반영하고 수행한다.

## 2026-10-28 KST 순번 8 공통 요청과 화면 오류 처리

수행 주체: AI(Codex). 브랜치 main, 커밋·push 없음. 브라우저 기능 사용·캡처는 수행하지 않았다. 백엔드 제품 코드는 변경하지 않았다.

| 변경 파일·함수 | 변경 내용과 이유·출처 | 보고서 연결 |
|---|---|---|
| frontend-react/src/api.js / request | AI 수정. 204 미파싱 유지, JSON 파싱 실패에도 HTTP 오류 상태를 전달해 401 세션 해제를 보장. JSON을 읽지 못한 정상 응답은 INVALID_RESPONSE로 실패 처리 | 02 변경, 3.2 세션·전송, 04, 05 |
| frontend-react/src/flow.js / errorInfo·runTask | AI 작성. 400·401 code별·403·404·네트워크·서버 오류 안내 분리, 성공은 action 완료 시에만 표시. 취소·오래된 작업의 안내 무시 | 02, 3.2, 04, 05 |
| frontend-react/src/App.jsx / run·초기 목록 처리 | AI 수정. 공통 runTask·errorInfo 연결. 400·403에서는 폼 초기화 없음, 404만 선택·편집 초기화 후 목록 갱신. 갱신 실패도 별도 표시 | 02, 04, 05 |
| frontend-react/src/text.js | AI 기본 오류 문구 추가. 기존 서비스 소개는 유지. 사용자 최종 문구로 기록하지 않음 | 02, 05 |
| frontend-react/test/api.test.js | 비JSON 401 세션 해제·깨진 2xx 실패 검사 추가 | 04 AI 검사, 05 |
| frontend-react/test/flow.test.js | 오류별 안내·404 갱신 판단, 실패 후 성공 안내 없음, 취소·지연 작업, 후속 갱신 실패 검사 | 04 AI 검사, 05 |
| README.md·outputs/stage8-user-guide.md·작업일지·구성 현황 | 사용자 직접 순서·기대 결과·캡처 시점·실제 HTTP와 클라이언트 검증 구분 | 02, 04, 05 |

### AI 검사와 실제 결과

- 프론트 npm test: tests 17 / pass 17 / fail 0, 종료 0. API 그룹 상위 1+하위 8, 오류 흐름 상위 1+하위 5, 실제 Express 연결 1, React 마크업 1.
- 기존 세션·조건부 헤더·로그인·204 미파싱·401 초기화·403 유지·지연 응답·실제 서버 임시 DB 연결 검사 통과.
- 400 안내·403 권한 안내·404 목록 갱신 판단, 서로 다른 네 가지 401 code별 재로그인 안내 확인. 잘못된 code의 constructor·toString·__proto__도 Object.hasOwn 검사로 안전한 기본 안내 사용.
- 400·401·403·404·500에서 성공 콜백이 호출되지 않고 작업 종료 콜백이 호출됨 확인. 정상 action 완료 후에만 성공 안내, AbortError·오래된 작업은 안내하지 않음. 쓰기 완료 뒤 목록 재조회가 실패해도 성공 안내로 마무리하지 않음.
- JSON 아닌 401에서 세션 해제, JSON 아닌 200에서 INVALID_RESPONSE 실패 확인.
- App 코드 정적 확인: 400·403 오류 경로에는 reset 없음, 404는 reset·목록 갱신. 브라우저 실제 입력 유지·시각 상태는 사용자 미확인.
- npm run build: 종료 0, 19 modules, 최신 dist 생성. 백엔드 코드 변경 없음으로 기존 백엔드 전체 검사는 반복하지 않음.

### 사용자 확인과 기록 경계

- stage8-user-guide.md는 순서·기대 결과만 제공한다. 잘못된 로그인, 공백 프론트 검증, Bob 버튼 숨김, 로그아웃·새로고침, 실제 만료, 삭제204, 두 탭으로 없는 글404 재현을 안내했다.
- 공백 프론트 검증은 HTTP 요청이 없을 수 있음을 명시했다. 실제 400·403은 사용자의 직접 API 요청으로 별도 확인하며, Console API 호출을 React 화면 오류 안내 검사로 기록하지 않도록 구분했다.
- 사용자 서비스 문구 수정·직접 CRUD·이 단계 오류 검사·캡처 결과는 아직 전달받지 않았다. 미확인 유지. 제공 final·전체 T01~T17도 사용자 담당으로 남긴다.
- 이후 사용자가 입력하는 다음 순번 프롬프트를 기다린다.

## 2026-10-28 KST 순번 9 추가 자동 검사와 새 clone 재현

수행 주체: AI(Codex). 사용자는 제공 final·expiry와 T01~T17을 직접 수행하기로 했으므로 이번에도 해당 명령·브라우저 작업은 실행하지 않았다. 사용자 결과는 별도 미확인 표로 유지했다.

### 변경 파일·함수·이유와 보고서 연결

| 파일·함수 | 실제 변경과 이유·출처 | 보고서 연결 |
|---|---|---|
| backend-express/test/protection.test.js / 추가 하위 검사 | AI 작성. 예상 밖 prototype 관련 이름·작성자 필드의 등록·수정 거부, 타인 글 입력보다 권한 우선, 잘못된 자료형·미래 nbf·실패 전후 DB bytes 확인 확대 | 04 실패 사례·검증, 05 |
| backend-express/test/restart.test.js / start·stop·call | AI 작성. 실제 app.js 프로세스를 종료·재시작하며 생성·수정·삭제 유지와 작성자·생성시각·공개 필드 확인. 기존 저장소 재import 검사보다 실제 서버 생명주기까지 확인 | 02 로컬 실행, 04 유지·재현, 05 |
| backend-express/src/app.js | 기본 포트 8000 유지, 검사 격리를 위해 PORT 0~65535 허용·검증 및 실제 할당 포트 출력. 사용자 서버·DB를 건드리지 않는 재시작 검사에 필요 | 02 설정 변경·이유, 04, 05 |
| tools/check_dev.py / redact·run | AI 작성. 백엔드·프론트 검사와 build 실행, 로그 마스킹 후 docs/ai-checks/development.txt 저장 | 04 AI 자동 검사, 05 |
| tools/check_repro.py / run·start·stop·call·check·redact | AI 작성. 로컬 main의 새 clone, 의존성·설정·빌드·검사·실제 서버 재시작·Vite dev/preview 프록시 확인 후 임시 파일·서버 정리 | 02 재현, 04 AI 자동 검사, 05 |
| tools/check_api.py·docs/manual-scenarios.md | 제공 검사·시나리오 원본 그대로 복사. final 도구는 실행하지 않음 | 04 사용자 검사 준비, 05 수업 출처 |
| .gitignore | Python __pycache__·pyc 제외 | 02 구성 |
| README.md | clone→설치→키 생성→실행→종료·TTL·개발 검사·final 절차, 실제 환경, 문구 위치의 낡은 경로 수정 | 02 실행 재현, 04, 05 |
| docs/ai-checks·사용자 안내·결과표·작업일지 | AI 결과와 사용자 미확인 결과를 분리. 사용자용 파일은 outputs에도 제공 | 02, 04, 05 |

### 실제 실행 결과

- python3 tools/check_dev.py: 종료 0. 백엔드 tests 33 / pass 33 / fail 0, 프론트 tests 17 / pass 17 / fail 0, 프론트 build 성공. 로그 docs/ai-checks/development.txt.
- 보호 API 기존·확대 검사에는 토큰 누락·형식 오류·변조·실제 exp 경과·정상 서명의 잘못된 클레임·없는 계정·HS384/none·타인 변경·작성자 위조·예상 밖 필드·오류 우선순위·실패 전후 DB 불변이 포함된다.
- 실제 app.js 별도 프로세스 검사: 임시 SQLite에 등록→프로세스 종료·새 PID 기동→글 전체 동일, 수정→다시 종료·기동→수정 유지, 삭제→다시 종료·기동→빈 목록·상세404. 기존 사용자 서버·서비스 DB는 사용하지 않음.
- 로컬 초기 main 기준 커밋: 5dc8fbbf25596c83e77c3797dfd0f12b0b2ba842. 새 clone 검사를 위해 AI 작성자 Codex/codex@localhost로 로컬 커밋만 생성했다. 사용자 Git 이름·이메일 설정이 없어 전역 설정을 바꾸지 않고 해당 커밋에만 AI 식별자를 사용했다.
- python3 tools/check_repro.py: 종료 0. --no-local --branch main으로 실제 새 clone 생성, .env·DB·node_modules·dist 부재 확인, 양쪽 npm ci·키 생성·build·백엔드33/프론트17 검사 재실행 성공.
- clone의 실제 app.js를 별도 포트에서 실행하고 API로 글 생성, 프로세스 재시작 후 글 전체·작성자 유지 확인. production preview HTML·빌드 자산200·/api/health 프록시 성공, dev /api/health 프록시 성공. 로그 docs/ai-checks/reproduction.txt.
- 격리 검사에서는 PORT=0 및 검사 인스턴스의 Vite 임시 포트·프록시 override 사용. 기본 8000·5173·4173 설정을 바꾸지 않음. 새 clone의 기본 고정 포트 CLI·브라우저 확인은 사용자 검사와 별도로 남김.
- 임시 clone·키·DB·프로세스를 정리함. 재현 로그에는 출처 SHA가 기록되어 있으며 이후 변경은 보고서용 기록·안내 문서뿐이다.
- 두 검사 로그에 실제 로컬 키·JWT 패턴·64자리 hex 비밀값이 없는지 검사 통과. 로컬 .env는 Git 제외. 검사 로그에 정상 토큰을 출력하지 않음.
- 32개 원본 자료 SHA-256 재비교: 변경 0개. 제공 check_api.py 복사본은 원본과 bytes 동일.
- 이번 검사에서 제품 기능의 신규 실패는 발견되지 않았다. README의 문구 수정 위치가 main.jsx로 남아 있던 부분을 text.js로 바로잡았다.

### 남은 사용자 수행과 한계

- 원격 GitHub push는 수행하지 않았다. 새 clone 성공은 로컬 커밋 출처이며 GitHub에서 해당 코드를 clone했다고 기록하지 않는다. 원격 게시 후 접근·clone 재현은 별도 확인 필요.
- 제공 final·expiry 명령과 T01~T17을 사용자 안내·결과표로 분리했다. 사용자 결과는 현재 미확인(결과 미수령)이며 자동 PASS로 채우지 않았다.
- 브라우저 캡처·최종 문구 수정·Word/PDF·LMS 제출은 수행하지 않았다. 사용자 캡처를 저장소에서 발견하지 않았으나 실제 미수행으로 단정하지 않고 전달 대기로 둔다.
- 단일 서버 SQLite 파일 저장·동기 연산·fsync 미적용·rate limit/refresh token 미구현 등 기존 제한 유지.

## 2026-10-28 KST 사용자 캡처 14장 수령·분류

- 캡처 수행 주체: 사용자. AI 수행: 첨부 이미지 14장 시각 검토, 증거 분류·원본 보존 복사·사용자 결과표 반영. 브라우저 재실행·이미지 편집·기능 테스트는 수행하지 않았다.
- 촬영 시각은 파일명 22:33~22:52이며 보이는 주소는 5173 개발 화면. 촬영 당시 코드 SHA·실제 TTL·보이지 않는 요청 조건은 추정하지 않았다.
- 변경 파일: docs/evidence의 원본 복사본 13장, docs/evidence-review.md·docs/user-test-results.md·docs/worklog.md, outputs의 검토표·결과표·작업일지. 제품 소스·함수 변경 없음.
- 이유: 기존 7~8번 사용자 증거를 재사용하고 추가할 요청 조건만 구분. 보고서 연결 04 테스트·HTTP·증거, 05 사용자와 AI 수행 구분.
- 확인: 로그인200·Alice표시, 등록201+Location, 삭제204+목록/선택 갱신, 공개 조회 화면, 잘못된 로그인401, 필수 입력 경고, Bob의 타인 버튼 숨김, 로그아웃 화면, /me401+Bearer·만료 안내, 상세404+글 없음 안내.
- 제한: 3번은 수정 후로 보이는 내용이나 실제 선택 요청은 GET목록200으로 PUT200이 아님. 7번은 HTML required 경고로 서버400이 아님. 9번 우측401은 과거 로그인 요청으로 로그아웃 후/me 증거가 아님. 5·8·10번 실제GET은304이며200으로 바꾸어 기록하지 않음. JSON code는 Response 탭이 없어 관찰 미확인.
- 4번에는 Authorization JWT 일부가 노출되어 프로젝트 복사·사용 보류. 대체 삭제 증거 13번이 있음. 그 외 13장은 편집 없이 docs/evidence/e번호 PNG로 복사, 원본 Desktop 파일은 유지. 원본 경로·해시 대응은 work/user-evidence-manifest.json에 기록.
- 모든 사용자 항목을 PASS 처리하지 않고 관찰 범위만 부분 확인으로 갱신. 직접403·변조·작성자위조·서버400·실제 서버 재시작·Bob본인CRUD·제공final·4173 최종 확인 등 증거 미수령 항목은 그대로 남겼다.
- 로컬 파일만 갱신. 이미지·기록은 커밋·push하지 않았다.

## 최종 정리와 게시 준비

- 사용자 요청: 미수령 추가 검사는 생략, 실제 캡처·설명만으로 검토·보고서01~06 정리. 보고서 텍스트는 GitHub 게시 금지. 코드·README·안전한 증거·검사 기록 게시 승인.
- 사용자 추가5장 수령: e15는GET200·저장화면, e16은Alice PUT200, e17/e18/e19는Bob201+Location/200/204. 실제 보이는 범위만 T06·T17에 반영. 직접403은 버튼숨김과 구분. 제품 소스 변경 없음.
- 보고서 복사용 텍스트는 프로젝트 밖 outputs/보고서_복사용.txt에 작성. 학번·이름·제출일·본인 오류 경험은 빈칸. 사용자 소개·3개 함수 초안의 의미 유지. 3.2와06 답변은 AI 정리로 표시. 사용자 미수행 결과를 생성하지 않음.
- 출처 구분: 제공 템플릿·패키지/lock, AI 기능/자동검사, 사용자 설명/브라우저캡처. 개인 소스 수정은 확인되지 않아 주장하지 않음.
- 공개 파일에서 보고서 본문·사용자 설명 원문을 제외하기 위해 새 orphan release 브랜치를 준비. 기존 로컬 main과 원문 메모 파일은 보존하고, 원격 main에는 release 스냅샷만 게시. 원격은 사전 확인 시 비어 있었음. 강제 push 사용 안 함.
- 사용자 원문 메모는 로컬에서만 보관하고 Git 제외. 기존 로컬 main 이력은 원격으로 보내지 않음. 공개 README는 실행·검사·실제 제출 상태와 증거 링크를 갱신.
- 안전한 사용자 원본 복사본18장만 게시 대상. Authorization 일부가 보이는 원본4번 제외. 실제키·JWT·DB·node_modules·dist·보고서본문은 게시 대상에서 제외.
- 문서·증거만 바뀌었으므로 기능 자동 검사를 불필요하게 반복하지 않음. 이전 백엔드33·프론트17·빌드·격리 clone 검사 결과와 대상 버전은 유지.
- 남은 사용자 제출: Word 편집·PDF 저장/업로드·README PDF 연결·LMS. 생략한 수동검사·제공final·4173은 미확인 상태를 유지. PDF 추가 뒤 제출SHA 재확정 필요.

- 게시 실행 결과: release 스냅샷 33bb952를 GitHub main에 정상 push했다. 보고서본문·사용자원문메모·실제키/토큰·DB는 포함하지 않았다. 이번 후속 변경은 README 공백 정리와 게시 결과 기록뿐이다. 최종 제출PDF는 아직 없음.
