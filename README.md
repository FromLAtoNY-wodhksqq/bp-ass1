# 영화 리뷰 게시판

영화를 단순한 재미의 유무를 넘어 다양한 시선으로 바라보고, 서로 다른 감상을 리뷰로 나누는 서비스입니다. 서비스 대상·목적은 사용자 원문을 바탕으로 AI가 문장만 정리했습니다.

작성자: 

React·Express·SQLite 과제 프로젝트입니다. 현재 프로젝트 구성, 상태 확인 API, SQLite 저장소, 계정 검증·JWT 발급 로그인과 게시판 API를 구현했습니다. 공개 목록·상세, 로그인·JWT 검증·내 정보 조회와 작성자 본인의 CRUD를 사용할 수 있습니다. React 로그인·공개 목록·상세·리뷰 작성·수정·삭제 화면도 API에 연결했습니다. 브라우저 수동 검증은 사용자 수행 결과가 전달되기 전까지 미확인입니다.

## 실행 환경

실제 개발 검증 환경은 macOS·Node.js v26.0.0·npm 11.12.1입니다. Vite 의존성의 Node 조건을 만족하는 22.12 이상 환경을 사용하세요. Python 3은 개발 검사와 제공 final 도구 실행에 사용합니다. 의존성 버전은 각 package.json과 package-lock.json에 고정합니다. 이 단계에서 제공 과제의 의존성과 lock을 사용했습니다.

## 설치와 실행

새 폴더에 clone한 뒤 아래 순서로 실행합니다. 원격 저장소에 해당 커밋이 push되어 있어야 GitHub clone으로 재현할 수 있습니다. 이번 자동 재현 검사는 로컬 main 커밋에서 새 clone을 만들어 수행하며 GitHub push·원격 clone 확인과 구분합니다.

```sh
git clone https://github.com/FromLAtoNY-wodhksqq/bp-ass1.git
cd bp-ass1
```

다음 터미널별 명령은 각각 프로젝트 루트에서 시작합니다. 기존 8000·5173·4173 서버를 종료한 상태에서 실행하며, 같은 DB 파일을 여러 백엔드가 열지 않도록 합니다. 빈 clone에는 실제 .env·DB·node_modules·dist가 없어야 합니다.

```sh
cd backend-express
npm ci
npm run setup
npm start
```

```sh
cd frontend-react
npm ci
npm run dev
```

빌드 결과를 확인하려면 프론트 폴더에서 실행합니다.

```sh
npm run build
npm run preview
```

- 백엔드: http://127.0.0.1:8000
- 개발 화면: http://127.0.0.1:5173
- 빌드 preview: http://127.0.0.1:4173
- 상태 API: GET /api/health → 200, {"status":"ok"}
- 개발·preview의 /api 요청은 8000번 백엔드로 프록시합니다.
- 종료: 각 실행 터미널에서 Ctrl+C.

서버 시작 시 DB 폴더·SQLite 파일·posts 테이블이 자동 생성됩니다. `.env.example`은 설정 예시이며 실제 키는 포함하지 않습니다. 로그인 구현 이후에는 유효한 JWT 설정이 필요합니다. `npm run setup`은 키를 출력하지 않고 새 .env를 생성하며 기존 파일은 덮어쓰지 않습니다. 이미 설정이 있다면 이 명령은 생략합니다. 실제 .env·DB·node_modules·dist는 Git에서 제외합니다.

화면 제목·소개·기본 안내는 frontend-react/src/text.js에서, 브라우저 제목은 frontend-react/index.html에서 수정할 수 있습니다. 현재 소개는 AI 기본값이며 사용자 최종 문구로 기록하지 않습니다.

## 작업 출처와 기록

의존성 파일·lock과 Vite 프록시 설정은 수업 제공 JWT-Assignment의 선택 스택에서 복사했습니다. 최소 Express health 서버와 React 기본 화면은 AI(Codex)가 작성했습니다. 서비스 대상·목적·선택 이유와 핵심 함수 설명의 사용자 원문 메모는 로컬에만 보관합니다. 보고서 본문도 GitHub에 게시하지 않습니다. 단계별 작업·검사·보고서 연결은 [작업일지](docs/worklog.md)에 기록합니다.

## SQLite 저장소와 테스트 계정

기본 DB는 backend-express/data/board.sqlite입니다. 기본·상대 DB_FILE 경로는 backend-express 폴더를 기준으로 해석하며 절대 경로도 설정할 수 있습니다. 서버 작업 폴더가 바뀌어도 기본 파일 위치는 같습니다. DB 초기화가 필요하면 서버를 종료하고 해당 파일을 별도로 백업한 뒤 삭제하면 다음 시작 때 빈 DB가 생성됩니다.

src/store.js의 store.list·get·create·update·remove가 저장과 조회를 담당합니다. 입력 값은 매개변수로 바인딩합니다. 반환 필드는 id·title·content·authorId·authorName·createdAt·updatedAt입니다. 목록은 ID 내림차순이며 수정 시 작성자와 생성 시각은 유지합니다. 없는 글 조회·수정은 null, 없는 글 삭제는 false를 반환합니다. title·content의 HTTP 입력 검증과 JWT·작성자 권한 검사는 API 계층에서 수행합니다.

sql.js는 SQLite 전체를 서버 메모리에 올리고 변경마다 임시 파일로 내보낸 뒤 rename으로 교체합니다. 저장 실패 시 메모리 상태도 이전 상태로 복구하고 오류를 호출자에게 전달합니다. 같은 DB 파일을 사용하는 서버는 반드시 하나만 실행합니다. 여러 프로세스가 각각 읽은 DB를 덮어쓰면 데이터가 유실될 수 있습니다. DB 전체 내보내기와 동기 파일 쓰기는 데이터가 커지면 응답을 지연시키며, 전원 장애까지 보장하는 fsync 처리는 하지 않습니다. 실패 뒤 남은 .tmp 파일은 복구본으로 자동 사용하지 않습니다. 운영용 대규모·다중 서버 저장소를 위한 방식은 아닙니다.

Alice(id 1, alice@class.test), Bob(id 2, bob@class.test)을 서버 시작 때 준비합니다. 공통 실습 비밀번호는 Classroom!2026입니다. 계정마다 난수 salt와 scrypt 해시를 생성하고 timingSafeEqual로 비교합니다. 없는 이메일도 해시 비교를 수행합니다. 비밀번호 원문은 trim하지 않으며 공개 함수는 id·name·email만 반환합니다. 계정은 메모리에 준비되므로 재시작 때 salt·hash가 새로 생성되지만 ID·이메일·실습 비밀번호는 같습니다. 회원가입·비밀번호 변경·계정 DB 저장·로그인 속도 제한은 현재 구현하지 않았습니다. 동기 scrypt도 요청을 처리하는 동안 이벤트 루프를 점유하므로 로컬 실습 규모를 전제로 합니다.

## 개발 검사

백엔드 폴더에서 실행합니다.

```sh
npm test
```

Node 내장 검사 도구로 임시 폴더의 별도 DB에서 자동 생성, 바인딩, 응답 필드·정렬, 수정·삭제, 별도 Node 프로세스에서 저장 유지, 저장 실패 복구, 계정 검증·공개 정보 제한을 검사하고 임시 파일을 삭제합니다. API 검사는 별도 임시 포트의 HTTP 서버에서 수행합니다. 실행 중인 서비스 DB를 사용하지 않습니다. 이 검사는 AI 개발 검사이며 사용자 담당인 제공 final 검사·브라우저 T01~T17을 대신하지 않습니다.

## 게시판 API와 현재 인증 상태

GET /api/posts는 공개 목록을 200과 ID 내림차순 배열로 반환합니다. GET /api/posts/{id}는 공개 상세를 200으로 반환하며, 잘못된 ID는 400 BAD_INPUT, 없는 글은 404 NOT_FOUND입니다.

POST /api/posts, PUT /api/posts/{id}, DELETE /api/posts/{id}에는 검증된 JWT가 필요합니다. 등록은 토큰으로 확인한 사용자를 작성자로 저장하고 201과 Location을 반환합니다. 수정·삭제는 DB 작성자와 사용자 ID를 비교해 타인이면 403 FORBIDDEN으로 거부합니다. 본인 수정은 200, 삭제는 204와 빈 본문입니다. GET /api/me는 검증된 사용자의 id·name·email만 반환합니다.

정상 JSON과 ID의 보호 요청은 인증 → 글 존재 → 작성자 권한 → 입력 → DB 변경 순서입니다. JSON 문법 오류와 크기 제한 초과는 파서에서 먼저 400 BAD_INPUT이 될 수 있습니다.

src/input.js의 postInput은 title·content가 모두 본인 소유 필드인 문자열인지 검사하고, 공백 정리 후 Unicode 코드 포인트 기준 각각 1~100자·1~5000자인지 확인합니다. Set에 없는 추가 필드는 constructor·toString·__proto__를 포함해 모두 거부합니다. postId는 양의 안전 정수 ID를 확인합니다. 오류는 JSON의 code·message로 반환합니다.

src/routes.js의 createApp은 저장소와 JWT 설정을 받으며 src/auth.js의 실제 currentUserId·assertOwner를 호출합니다. 테스트도 실제 로그인 JWT와 별도 임시 DB·포트를 사용합니다. 테스트용 사용자 함수를 주입하는 경로는 제거했습니다.

## 로그인과 로컬 JWT 설정

backend-express 폴더에서 `npm run setup`으로 로컬 설정을 생성합니다. Node의 randomBytes(32)로 만든 64자리 hex 난수를 .env에 기록하고 파일 권한은 0600으로 지정합니다. 키는 출력하지 않으며 기존 .env는 유지합니다. 이 명령은 로컬 개발용입니다. .env 내용을 로그·보고서에 복사하지 않습니다.

POST /api/auth/login은 email·password JSON만 받습니다. 이메일은 공백 정리 후 1~254자, 비밀번호는 원문 기준 1~128자이며 공백만 있는 값은 거부합니다. 비밀번호 원문을 바꾸어 비교하지 않습니다. 성공은 200과 accessToken·expiresIn·user, 계정 불일치는 401 INVALID_CREDENTIALS, 입력 오류는 400 BAD_INPUT입니다. user는 id·name·email만 포함합니다.

JWT는 HS256으로 발급하며 문자열 sub, exp, iss=webservice-class, aud=board-api를 포함합니다. 기본 TTL은 90초입니다. 64자리 hex는 Buffer.from(secret, "hex")로 32바이트 키로 변환합니다. 빈 키·형식 오류·제공 자리표시자·동일 문자 반복·단순 반복 예시 키는 거부합니다. 형식 검사로 난수성을 증명할 수는 없으므로 키는 반드시 생성 명령으로 만듭니다.

TOKEN_TTL은 1~2147483647 범위의 정수 초만 허용하며 빈 값·0·음수·소수·공백·지수 표기 등을 거부합니다. JWT_ISSUER와 JWT_AUDIENCE를 설정했다면 지정한 값과 일치해야 합니다. 잘못된 설정이면 서버가 포트를 열기 전에 실패합니다. TTL 테스트는 백엔드 폴더에서 `TOKEN_TTL=3 npm start`로 실행하고, 끝나면 종료한 뒤 `npm start`로 기본 설정에 복귀합니다.

currentUserId는 Bearer 헤더, HS256·서명, exp·iss·aud·sub의 필수 여부와 엄격한 형식·값, 실제 계정 존재를 검사합니다. exp는 양의 안전 정수 초, sub는 계정의 양의 안전 정수 ID를 나타내는 문자열이며 iss·aud는 지정 문자열과 같아야 합니다. aud 배열은 허용하지 않습니다. 토큰 누락·Bearer 형식 오류는 401 TOKEN_REQUIRED, 서명·알고리즘·클레임·없는 계정은 401 INVALID_TOKEN, 다른 검사가 모두 정상인 만료 토큰은 401 TOKEN_EXPIRED입니다. 보호 API의 401은 WWW-Authenticate: Bearer를 포함합니다.

라이브러리에서 서명·알고리즘·issuer·audience를 검증하고 만료 판단만 잠시 분리해 수행합니다. 필수 클레임과 계정까지 확인한 뒤 exp를 현재 Unix 초와 비교하므로 잘못된 클레임과 만료가 겹치면 INVALID_TOKEN입니다. 만료된 정상 토큰이 승인되는 경로는 없습니다. 로그인 rate limit·refresh token·서버측 토큰 폐기 기능은 없습니다.

## React 화면과 메모리 세션

src/api.js에서 로그인 응답의 accessToken·user를 모듈 메모리에만 저장합니다. localStorage·sessionStorage·쿠키를 사용하지 않습니다. 공개 조회는 토큰을 생략하고 보호 요청은 토큰이 있을 때만 Bearer 헤더를 붙입니다. 새로고침은 로그인 상태를 초기화하지만 DB 글은 유지합니다.

App.jsx는 useSyncExternalStore로 세션 변경을 구독합니다. 비로그인은 작성 안내, 로그인 후에는 사용자 이름·작성 폼, 본인 리뷰에만 수정·삭제 버튼이 표시됩니다. 서버의 JWT·권한 검사는 변경하지 않았습니다. 명시적 로그아웃 시 세션·선택·편집·폼·이메일·비밀번호를 정리하고 공개 목록은 유지합니다. 지연된 이전 요청이 세션이나 선택 화면을 되살리지 않게 세션·작업 순번을 검사합니다.

400은 입력을 보존하고 수정 안내를 표시하며, 401은 메모리 세션과 사용자 표시를 해제하고 code별 재로그인 안내를 표시합니다. 403은 세션과 입력을 유지하고 권한 안내를 표시합니다. 404는 글 없음 안내·선택 초기화·목록 갱신을 수행하며 갱신도 실패하면 별도로 알립니다. 삭제 204는 JSON 파싱 없이 처리합니다. src/flow.js의 errorInfo·runTask가 오류 분류와 성공·실패 안내를 분리하므로 실패 요청에 성공 안내를 표시하지 않습니다. JSON이 아닌 401에서도 세션을 지우고, JSON을 읽을 수 없는 성공 응답은 성공으로 간주하지 않습니다. 기본 토큰 TTL은 90초이므로 사용 중 만료 응답을 받으면 다시 로그인합니다.

프론트 폴더에서도 npm test로 API 모듈·React 초기 마크업·실제 Express 연결 개발 검사를 실행할 수 있습니다. 연결 검사는 백엔드 의존성도 설치되어 있어야 하며 별도 임시 DB·키·포트를 사용합니다. 마크업 검사는 브라우저 이벤트·레이아웃 확인을 대신하지 않습니다.

## 새 clone 개발 재현 검사

아래 명령은 프로젝트 루트에서 실행합니다. tools/check_dev.py는 양쪽 검사와 빌드를 수행하고 키·JWT를 마스킹한 로그를 docs/ai-checks/development.txt에 남깁니다.

```sh
python3 tools/check_dev.py
python3 tools/check_repro.py
```

check_repro.py는 로컬 main에 커밋된 파일을 --no-local로 새 임시 clone하여 npm ci, 키 생성, 양쪽 테스트, 프론트 빌드, 실제 백엔드 시작·재시작, dev·preview API 프록시와 빌드 자산 응답을 확인합니다. 먼저 검증하려는 변경을 로컬 main에 커밋해야 합니다. .env·DB·node_modules·dist가 clone에 섞여 있으면 실패합니다. 결과는 docs/ai-checks/reproduction.txt에 기록하고 임시 clone과 프로세스는 정리합니다.

기본 수동 실행 주소는 8000·5173·4173을 유지합니다. 자동 재현은 기존 사용자 서버와 충돌하지 않도록 PORT=0으로 별도 백엔드 포트를 할당하고 Vite의 검사 인스턴스에만 프록시 목적지·임시 포트를 전달합니다. 실제 app.js를 별도 프로세스로 실행합니다. PORT 미설정이면 8000이며 0은 자동 포트 할당용입니다. 새 clone에서의 기본 고정 포트 CLI 실행과 브라우저 사용은 사용자 최종 확인에 남깁니다.

검사 로그는 AI 개발 검사 결과입니다. 제공 final과 사용자의 T01~T17 결과로 옮겨 적지 않습니다. npm ci는 lock을 재현하며 --no-audit는 보안 audit를 수행했다는 뜻이 아닙니다.

## 사용자가 직접 수행할 final과 수동 검증

프로젝트 루트에서, 기본 TTL 90초로 백엔드를 실행한 상태에서 직접 실행합니다.

```sh
python3 tools/check_api.py --mode final
```

만료 검사는 현재 백엔드를 Ctrl+C로 종료하고 backend-express 폴더에서 TOKEN_TTL=3 npm start로 다시 시작한 뒤, 프로젝트 루트의 다른 터미널에서 직접 실행합니다.

```sh
python3 tools/check_api.py --mode final --expiry
```

이후 짧은 TTL 서버를 종료하고 npm start로 기본 설정에 복귀합니다. 제공 도구는 원본 그대로 포함했으며 AI는 이번 개발 과정에서 final·expiry를 실행하지 않았습니다. 도구는 임시 글을 생성하며 실패 시 남은 글이 있을 수 있습니다.

프론트 폴더에서 npm run build → npm run preview 후 4173에서 [T01~T17 원본](docs/manual-scenarios.md)을 사용자가 직접 수행합니다. 요청 조건·예상/실제 HTTP·code·헤더·화면·DB 유지·증거 파일명을 기록하고 미실행은 미실행으로 둡니다. 실행 시각·TTL·코드 커밋을 함께 적고, 201 Location·204 빈 본문·보호 401의 WWW-Authenticate를 확인합니다. 새로고침은 토큰 해제와 글 유지, 서버 재시작은 실제 프로세스 종료·재시작으로 구분합니다. 버튼 숨김만으로 서버403을 확인했다고 기록하지 않습니다.

사용자 캡처는 docs/evidence에 포함했고 [증거 검토](docs/evidence-review.md)와 [사용자 결과표](docs/user-test-results.md)에 실제 확인 범위만 기록했습니다. 추가 수동 검사·제공 final·4173 최종 확인은 사용자 생략 선택으로 결과 미제출이며 PASS로 채우지 않았습니다. AI 백엔드33개·프론트17개 검사와 빌드·별도 clone 재현은 통과했습니다. 보고서 텍스트·사용자 설명 원문 메모는 게시하지 않았으며, 최종 보고서 PDF는 사용자가 편집·저장 후 별도로 업로드할 예정입니다.

[사용자 final·T01~T17 실행 안내](docs/user-verification.md)와 [사용자 결과 기록표](docs/user-test-results.md)는 AI 검사 로그와 별도로 관리합니다.
