# 9번 사용자 직접 final 검사와 T01~T17

이 안내는 사용자 수행 절차와 기대 결과다. AI는 제공 final·expiry 명령과 수동 시나리오·캡처를 실행하지 않았다. AI의 별도 개발 검사와 새 로컬 clone 검사는 작업일지·AI 검사 로그에 기록했다.

## 1 실행 환경과 코드 기준 기록

프로젝트 루트는 `/Users/jaewan/Documents/Codex/2026-10-28/new-chat/bp-ass1`이다. 터미널에서 아래 명령으로 실제 코드 기준을 확인해 결과표에 적는다.

```sh
cd /Users/jaewan/Documents/Codex/2026-10-28/new-chat/bp-ass1
git rev-parse HEAD
node --version
npm --version
```

현재 로컬 main에 커밋이 있으며 GitHub에는 push하지 않았다. AI의 새 clone 검사는 이 로컬 저장소의 기준 커밋을 새 폴더로 clone한 결과다. GitHub clone 재현은 해당 커밋을 push한 뒤 별도 확인해야 한다. 제출 기준 SHA는 최종 문서·증거까지 포함한 커밋으로 나중에 확정한다.

## 2 빌드된 화면 준비

현재 백엔드와 preview가 켜져 있으면 중복 실행하지 않는다. 꺼져 있을 때만 터미널 A에서 실행한다.

```sh
cd /Users/jaewan/Documents/Codex/2026-10-28/new-chat/bp-ass1/backend-express
npm start
```

다른 터미널 B에서 최신 문구·코드를 빌드한다. preview가 켜져 있다면 build 후 브라우저를 새로고침하고, 꺼져 있다면 preview도 실행한다.

```sh
cd /Users/jaewan/Documents/Codex/2026-10-28/new-chat/bp-ass1/frontend-react
npm run build
npm run preview
```

4173을 이미 사용 중이라는 오류는 기존 preview와 중복 실행했을 때도 발생한다. 기존 것을 종료하고 실행하거나 이미 켜진 것을 사용한다. 브라우저 주소는 http://127.0.0.1:4173, 백엔드는 http://127.0.0.1:8000이다. 실제 .env는 이미 준비했으며 기존 파일을 덮어쓰지 않는다. 새 clone에서만 npm ci·npm run setup이 필요하다.

## 3 제공 final 직접 실행

기본 TTL 90초의 백엔드가 켜진 상태에서 별도 터미널로 실행한다.

```sh
cd /Users/jaewan/Documents/Codex/2026-10-28/new-chat/bp-ass1
python3 tools/check_api.py --mode final
```

실제 PASS·FAIL·종료 상태를 기록한다. 실행 명령과 마지막 요약이 보이게 stage9-final.png를 촬영한다. 실패하면 오류를 전달하고 그대로 FAIL로 기록한다. AI가 수행한 npm test 결과로 대체하지 않는다.

## 4 제공 만료 검사 직접 실행

먼저 백엔드를 실행한 터미널에서 Ctrl+C로 종료한다. 자동 서버 재시작은 하지 않으며 사용자가 실제로 종료·재실행한다.

```sh
cd /Users/jaewan/Documents/Codex/2026-10-28/new-chat/bp-ass1/backend-express
TOKEN_TTL=3 npm start
```

다른 터미널의 프로젝트 루트에서 실행한다.

```sh
cd /Users/jaewan/Documents/Codex/2026-10-28/new-chat/bp-ass1
python3 tools/check_api.py --mode final --expiry
```

실제 결과를 stage9-expiry.png로 촬영하고 TTL=3임을 기록한다. 검사 후 짧은 TTL 서버를 Ctrl+C로 종료하고 npm start로 기본 TTL 90초에 복귀한다. 제공 도구는 임시 글을 만들며 실패 시 남은 시험 글이 있을 수 있다.

## 5 T01~T17 수동 확인

프로젝트 `docs/manual-scenarios.md`는 제공 시나리오 원본을 그대로 복사한 문서다. 아래 표는 진행 순서와 기대 결과를 요약한다. 원본의 세부 요청·실패 후 재조회도 함께 수행한다. Alice·Bob 공통 비밀번호는 Classroom!2026이다.

| ID | 직접 수행할 조건 | 기대 HTTP/code·화면 |
|---|---|---|
| T01 | 비로그인 목록·존재하는 상세 | 각각 200, 공개 조회 |
| T02 | Alice 정상 로그인 | 200, 토큰·공개 사용자, Alice 표시 |
| T03 | 틀린 비밀번호·없는 이메일 각각 로그인 | 401 INVALID_CREDENTIALS, 토큰 없음 |
| T04 | 토큰 없이 /me·등록 | 각각 401 TOKEN_REQUIRED |
| T05 | Alice 등록·/me | 201+Location·authorId=1, /me 200 Alice |
| T06 | Alice 본인 수정·삭제 | 200·204 빈 본문, 실제 DB 반영 |
| T07 | Bob 정상 토큰으로 Alice 글 직접 PUT | 403 FORBIDDEN, 재조회 원문 유지 |
| T08 | Bob 정상 토큰으로 Alice 글 직접 DELETE | 403 FORBIDDEN, 재조회 글 유지 |
| T09 | 토큰 서명 첫 문자 변조 후 /me·POST·PUT·DELETE | 각각 401 INVALID_TOKEN, 데이터 불변 |
| T10 | 짧은 TTL로 새 발급 후 실제 만료, /me·POST·PUT·DELETE | 각각 401 TOKEN_EXPIRED, 화면 요청에서 로그인 해제·재로그인 안내 |
| T11 | 로그인→로그아웃→/me | 토큰 생략·401 TOKEN_REQUIRED |
| T12 | Bob 등록에 authorId:1·userId:1 각각 추가 | 400 BAD_INPUT, 글 미생성 |
| T13 | 본인 토큰으로 빈 제목·공백 본문·길이 초과 각각 요청 | 400 BAD_INPUT, DB 불변 |
| T14 | 없는 양의 정수 ID 조회·정상 토큰 수정·삭제, 잘못된 ID 조회 | 404 NOT_FOUND / 400 BAD_INPUT |
| T15 | 글 생성 후 백엔드 실제 종료·재시작 | 글·작성자·내용 유지 |
| T16 | 로그인 후 페이지 새로고침 | 글 유지·메모리 로그인 해제 |
| T17 | 무토큰 수정·삭제, Bob 본인 등록·수정·삭제 | 무토큰 401, Bob 본인 201·200·204 |

추가 우선순위도 확인한다. 정상 ID·JSON에서 무토큰 없는 글 수정은 401, 정상 토큰이면 404. Bob이 Alice 글에 공백 입력을 보내면 403, Alice가 자기 글에 보내면 400이다.

폼에서 차단한 공백은 실제 HTTP400 검사가 아니다. 숨겨진 버튼만으로 서버403을 확인한 것도 아니다. 직접 API 요청은 개발자 도구나 API 클라이언트로 수행하며, 4173에서는 Vite 소스 모듈 import가 되지 않으므로 앞선 5173용 Console import 안내를 그대로 사용하지 않는다. API 클라이언트에서는 실제 로그인 응답의 토큰을 임시 Bearer 값으로 사용하되 토큰이 보이는 화면을 제출하지 않는다. 어려운 직접 요청 항목은 해당 ID를 알려주면 사용자가 실행할 절차를 추가로 안내한다.

T15는 로그인 만료와 별개로 실제 서버를 종료해야 한다. 동일 DB의 다른 서버를 동시에 켜지 않는다. T16에서는 로그인 해제가 정상이다. 인증·만료 토큰을 직접 다루는 요청의 응답은 API 클라이언트에서 확인하더라도, React 화면의 오류 안내·로그인 해제를 사용자가 별도로 확인했는지 구분한다.

## 6 기록·캡처와 보고서 연결

확인한 즉시 Network에서 해당 요청을 선택해 Method·실제 Status·Response code·필요 헤더를 기록한다. 201은 Location, 204는 빈 본문, 보호 API401은 WWW-Authenticate: Bearer를 확인한다. 실패한 변경은 공개 재조회로 데이터가 바뀌지 않았는지 확인한다. 여러 요청을 포함하는 T09·T10·T12 등은 행을 나누어 모두 기록한다.

캡처는 `docs/evidence/T07-put-forbidden.png`처럼 ID·조건을 붙인다. 토큰·키를 가리고, 오류 뒤 재조회·화면 상태도 필요한 만큼 별도 촬영한다. 제공 final은 stage9-final.png, 만료 final은 stage9-expiry.png처럼 별도 보관한다.

보고서 연결은 02 로컬 실행, 04 T01~T17·HTTP·증거, 05 AI와 본인 수행 구분이다. 사용자 결과표는 별도 user-test-results.md를 사용한다. PASS는 직접 관찰한 경우에만 적고, 미확인·미실행·FAIL을 구분한다. 지금까지 채팅의 수행 방법 질문은 실제 테스트 성공 보고나 캡처 수령으로 처리하지 않았다.
