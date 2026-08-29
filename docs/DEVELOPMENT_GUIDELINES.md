# Private Family Archive — 개발 지침서 v3

> 로그인 + TOTP 2단계 인증(AAL2)을 통과한 사람만 볼 수 있는, 미색(크림) 톤
> 리퀴드 글래스 액자로 사진·영상을 전시하는 개인/가족 프라이빗 아카이브.

이 문서는 이 저장소의 **사양(spec)의 기준**입니다. 코드가 이 문서와 어긋나면
문서를 먼저 갱신하고 그다음 코드를 맞춥니다. 구현은 아래 Phase 순서를 따르며,
각 Phase 종료 시 실행 가능한 상태로 커밋합니다.

---

## A. 에이전트/개발자의 역할

보안이 중요한 개인·가족 전용 미디어 아카이브를 구축하는 시니어 풀스택 개발자이자
UX 엔지니어로서, 단순 데모가 아니라 **실제 배포 가능한 서비스**를 구현한다.

- 초대받은 사용자만 접근 · 이메일/비밀번호 로그인 · TOTP MFA 필수
- 개인·가족 사진·영상 보관, 사진 효과 실시간 미리보기, 비파괴 편집
- 관리자 전용 콘텐츠 관리, 미색 기반 감성 디자인, 리퀴드 글래스 액자
- 모바일 우선 반응형, Vercel 배포, Supabase(DB/Auth/Storage), 가비아 도메인
- 최하단 저작권 표시

구현 전 전체 계획과 위험 요소를 제시하고, 승인되지 않은 요구사항을 임의로
확대하지 않는다.

---

## 1. 프로젝트 정의

개인과 가족의 사진·영상을 안전하게 보관·감상하는 **비공개 디지털 앨범**.
공개 포트폴리오가 아니라 로그인과 MFA를 완료한 승인 사용자만 접근한다.

### 역할(Role)

| 역할 | 권한 |
| --- | --- |
| **Owner** | 최고 관리자. 사용자 초대·비활성화, 카테고리·게시물·디자인·문구 관리, 원본 다운로드 권한 관리, 감사 로그 확인, 핵심 보안 설정 |
| **Admin** | 콘텐츠·카테고리·사용자 관리. 핵심 보안 설정은 불가(Owner 전용) |
| **Family** | 허용된 가족 콘텐츠 열람, 권한 시 업로드 가능, 관리자 기능 불가 |
| **Viewer** | 허용된 콘텐츠 열람. 다운로드·업로드는 별도 권한 |

---

## 2. 고정 기술 방향

- **App**: Next.js App Router + React + TypeScript(strict). 안정 버전만 사용
  (RC/beta/canary 금지). 패키지 매니저 하나만, lockfile 커밋 필수.
- **UI**: Tailwind(또는 동등 utility CSS) + CSS Custom Properties 토큰. 애니메이션은
  필요한 곳에만 제한적으로. 아이콘은 한 가지 시스템으로 일관되게. Pretendard 폰트.
- **Backend**: Supabase Auth / Postgres / Storage / RLS / MFA(TOTP). 서버 전용
  작업은 Route Handler 또는 Server Action.
- **배포**: Vercel + 가비아 도메인. 환경변수는 Vercel에서 관리. `.env*`·비밀키
  커밋 금지. Supabase `service_role`은 클라이언트 접근 금지.
- **미디어 처리 원칙**: Vercel 서버리스 함수에서 대용량 FFmpeg 변환을 실행하지 않는다.
  고급 영상 변환이 필요하면 Mux / Cloudflare Stream / 별도 FFmpeg 워커 등 비동기
  변환 서버를 별도 단계로 제안하고, 비용·개인정보 영향을 먼저 설명한다.

> 사용자가 말한 "효과에 사용하는 java"는 Java가 아닌 **JavaScript/TypeScript +
> WebGL**로 해석한다.

---

## 3. 정보 구조 및 라우팅

```
/                         홈
/login                    로그인
/auth/callback            인증 콜백
/mfa/setup                최초 TOTP 등록
/mfa/verify               TOTP 확인
/recovery                 계정 복구 안내
/[ownerSlug]              개인 카테고리
/[ownerSlug]/[category]   개인 하위 카테고리
/family                   가족 카테고리
/family/[category]        가족 하위 카테고리
/post/[postId]            게시물 상세
/settings                 본인 계정·보안 설정
/admin                    관리자 루트
/admin/posts              게시물 관리
/admin/categories         카테고리 관리
/admin/media              미디어 관리
/admin/texts              문구 관리
/admin/users              사용자·권한 관리
/admin/settings           사이트 설정
/admin/security           보안 설정
/admin/audit              감사 로그
```

**규칙**

- `/admin` 링크는 공개 내비게이션에 표시하지 않는다. **그러나 경로 비노출을
  보안 수단으로 간주하지 않는다.** 매 요청마다 서버에서 AAL2와 역할을 재검사하고,
  실패 시 404로 처리하되 로그에는 거부 사유를 남긴다.
- `ownerSlug`·category slug는 DB에서 관리하고 하드코딩하지 않는다. slug 변경 시
  기존 URL 보존을 위해 redirect 테이블을 고려한다.
- 예약 경로(`admin`, `login`, `family`, `post`, `settings`, `api`, `mfa`, `auth`,
  `recovery`)는 사용자 slug로 사용할 수 없다.
- **모든 일반 페이지 최하단에 저작권 푸터를 필수 표시**한다.

---

## 4. 내비게이션

- **데스크톱**: 상단 고정 글래스 바 — 로고/사이트명 · 홈 · {사용자 이름}(하위메뉴
  드롭다운) · 가족(하위메뉴 드롭다운). 드롭다운은 hover + 키보드 focus 모두 지원.
- **모바일**: 상단엔 사이트명·메뉴 버튼만. 메뉴는 bottom sheet/full-screen sheet,
  하위메뉴는 accordion, 터치 영역 44×44px 이상, 닫은 후 트리거로 포커스 복귀.
- **편의 기능**(로드맵): 최근 업로드, 즐겨찾기, 연도별 보기, 검색, 미디어 필터,
  정렬(최신/오래된/촬영일), 선택한 보기 방식 기억, 항상 "홈으로" 경로 제공.

---

## 5. 디자인 방향

**콘셉트**: Warm Private Archive · Soft Editorial · Cream Neutral · Liquid Glass
Frame · Quiet Motion · Photo-first. 미색과 글래스는 사진을 보조하며 사진보다
강하면 안 된다.

**원칙**

1. 사진이 가장 높은 시각적 우선순위.
2. 장식은 탐색을 방해하지 않는다.
3. 모바일에서 한 손으로 주요 기능 수행 가능.
4. 글래스 효과는 내비게이션·액자·모달 등 제한된 영역에만.
5. 본문·긴 텍스트에는 가독성 높은 불투명 배경.
6. 애니메이션 기본 범위 150–350ms.
7. 화면 전환 애니메이션은 방향·구조를 전달할 때만.
8. 사용자가 모션·투명도·장식을 줄일 수 있어야 한다.

> 20대 여성 선호를 성별 고정관념으로 확정하지 않는다. "따뜻함, 사적인 앨범 감성,
> 사진 우선, 높은 가독성, 과하지 않은 움직임, 편안한 터치 영역, 사용자가 강도를
> 조절할 수 있는 시각효과"로 정의한다.

---

## 6. 컬러 시스템

토큰은 `src/app/globals.css`의 CSS 변수를 **단일 출처**로 삼는다. 컴포넌트에
임의 hex를 넣지 않는다.

- Base(크림): `--canvas #fcfaf5` · `--surface-1 #f8f3ea` · `--surface-2 #f2eadf`
  · `--surface-solid #fffdf9`
- Ink: `--ink-primary #2f2a26` · `--ink-secondary #665e57` · `--ink-muted #8b8178`
  · `--ink-disabled #aaa198`
- Accent(저채도): `--accent-primary #9c6f5c` (+hover `#865d4d`) · rose `#d7b1a5`
  · sage `#aab6a2` · butter `#eedfae`
- Status: success `#55735b` · warning `#9a6b32` · danger `#a14f4f` · focus `#7657b2`
- Glass/Radius/Shadow는 globals.css 참조.

**규칙**: 본문은 ink-primary/secondary. 미색 배경 위 흰색 텍스트 금지. 색상만으로
상태 구분 금지(아이콘·텍스트 병기). 본문 대비 WCAG AA 이상.

---

## 7. 타이포그래피

- **Pretendard Variable**. 프로덕션은 `/public/fonts/PretendardVariable.woff2`
  self-host + `next/font/local` 권장. (현재 구현은 빌드가 바이너리에 의존하지 않도록
  CDN + 시스템 폴백을 사용 — README 참조.)
- 스케일(데스크톱/모바일): Display 48/58·36/44 · H1 38/48·30/39 · H2 30/39·25/34
  · H3 23/32·21/29 · Body 16/27·16/26 · Small 14/21 · Caption 13/19.
- 본문 최소 16px, 한글 자간 과도하게 좁히지 않기, 캡션 한 줄 45–75자, 액자 위
  텍스트는 scrim 없이 직접 올리지 않기.

---

## 8. 핵심 액자 컴포넌트(`MediaFrame`)

- 구조: 외부 글래스 프레임 → 미색 매트 → 미디어 → 캡션/촬영일 → (선택)즐겨찾기·
  관리자 메뉴.
- hover 가능한 장치에서만 1.01–1.02 scale, 강한 3D 기울임 금지, 터치 장치는 hover
  제거, 굴절은 테두리 장식에만, 미디어 픽셀 왜곡 금지, 카드 간 충분한 간격.
- 로딩: aspect ratio 예약(CLS 방지), dominant color/저해상도 placeholder, 실패 시
  재시도 + 형식 안내, 영상은 포스터 먼저, 자동재생 금지.

---

## 9. 갤러리 UX

- 접근성을 위해 **CSS columns Masonry를 기본으로 쓰지 않는다.** 정렬된 CSS Grid /
  행 단위 justified / 시간순 목록 중 하나. DOM 순서 = 날짜 순서.
- 반응형 열: 375px 1 · 600px+ 2 · 900px+ 3 · 1280px+ 3–4.
- 스크롤 위치 복원, 무한 스크롤만 쓰지 말고 접근 가능한 "더 보기" 폴백, 친절한 빈
  상태, 날짜·카테고리·종류 필터 + 초기화, 필터 상태를 URL query에 반영, 검색 debounce.

---

## 10. 라이트박스(로드맵)

ESC 닫기 · 좌우 키/스와이프 이동 · 포커스 트랩 · 닫은 후 원래 카드로 복귀 · 배경
스크롤 잠금 · 확대/축소(제스처 충돌 방지) · 캡션 토글 · 다음 미디어 prefetch · 영상
전환 시 이전 영상 즉시 pause · **Signed URL 만료 시 자동 갱신 후 재시도** · 다운로드
버튼은 권한 있을 때만 렌더링.

---

## 11. 텍스트 편집

- 편집 대상: 사이트명, 홈 소개, 카테고리 제목/설명, 게시물 제목/캡션, **푸터 저작권**.
- 짧은 제목은 인라인, 긴 설명은 side panel/modal. **plain text 저장(HTML 저장 금지)**,
  붙여넣기 시 서식 제거, 저장/취소 제공, 자동 저장 시 5초+ Undo 토스트, 글자 수 제한
  표시, 저장 실패 시 입력 유지, 서버 권한 재확인, `updated_at`/version으로 충돌 감지.
- 일반 사용자에겐 편집 버튼·속성·관리자용 데이터가 **DOM에 렌더링되지 않아야** 한다.

---

## 12. 미디어 업로드 정책

### 12.1 형식 분류(구현: `src/lib/media.ts`)

- **웹 표시 보장**: `jpg jpeg png webp avif gif`, `mp4(H.264/AAC) webm`
- **변환 후 표시**: `heic heif bmp tif tiff`, `mov m4v`
- **원본 보관 중심**: `dng cr2 cr3 nef arw raf orf rw2`, `mkv avi wmv flv mts m2ts 3gp hevc`

> 허용 목록의 원본은 보관하지만, 브라우저가 직접 지원하지 않는 형식은 미리보기·
> 재생을 보장하지 않는다. 표시용 파생본이 생성된 파일만 갤러리에 게시된다. UI에서
> 이 점을 명확히 안내한다.

### 12.2 SVG

기본 차단. 업로드된 SVG를 직접 렌더링하지 않는다(XSS·외부 리소스 위험).

### 12.3 검증(모든 단계 수행)

확장자 → 크기 → 서버/신뢰 계층 MIME → 매직바이트 → 확장자·MIME 불일치 차단 →
디코딩 가능 여부 → 파일명을 저장 경로로 직접 쓰지 않음 → 파일명은 메타데이터로만
보관하고 출력 시 escape → 비정상 해상도·압축 폭탄 방어 → 필요 시 악성코드 검사.

### 12.4 업로드 경로

```
private-media/{siteId}/{ownerId}/{postId}/{mediaId}/original.{ext}
private-media/{siteId}/{ownerId}/{postId}/{mediaId}/preview.webp
private-media/{siteId}/{ownerId}/{postId}/{mediaId}/thumb.webp
private-media/{siteId}/{ownerId}/{postId}/{mediaId}/poster.webp
```

`mediaId`를 반드시 포함해 파일 충돌 방지.

### 12.5 상태 머신

`draft → uploading → uploaded → validating → processing → ready → failed →
quarantined → deleted`. `ready`만 일반 갤러리에 표시.

### 12.6 업로드 UX

드래그 앤 드롭 · 모바일 보관함/카메라 · 다중 선택 · 파일별·전체 진행률 · 일시정지/
재시도 · 실패 파일만 재업로드 · 중복 감지 · 이탈 경고 · 네트워크 중단 복구 · 완료 후
바로 게시하지 않고 검토 화면 제공.

### 12.7 파일 크기

플랜 확인 후 확정. 기본 제안: 이미지 50MB, 영상 MVP 500MB(이후 resumable + 플랜
검증 후 확장), 동시 업로드 2–3개. **근거 없이 2GB를 보장하지 않는다.**

---

## 13. 개인정보와 EXIF

촬영일·방향·카메라 정보는 선택적 추출, **GPS 기본 비공개**, 표시용 파생본에서 GPS
제거, 게시 전 위치정보 포함 여부 안내, 원본 다운로드 권한자는 EXIF 포함 원본을 받을
수 있음을 고지. 얼굴 인식 기본 미구현(추가 시 명시적 동의 필요).

---

## 14. 특수효과 편집기(비파괴)

- 파라미터: 노출·대비·채도·색온도·틴트·하이라이트·그림자·비네팅·그레인·블러·선명도·
  (선택)bloom. (구현: `src/lib/effects.ts`, 서버에서 범위 재검증.)
- 프리셋: Original·Cream·Airy·Soft Film·Pastel·Golden·Mono.
- **원본 덮어쓰기 금지.** 효과는 `posts.effects` JSONB로 저장. 갤러리에는 정적 효과
  썸네일, WebGL은 편집기·상세 미리보기에서만. 편집용 프록시는 장변 최대 ~2048px.
  rAF로 렌더 스로틀, 저사양 자동 조절, context loss 복구, 미지원 시 CSS/Canvas 폴백,
  초기화·전후 비교·split view·Undo/Redo, 저장 안 하고 이탈 시 확인.

---

## 15. 데이터 모델

구현: `supabase/migrations/0001_init.sql`. 최소 엔터티: `profiles`, `site_settings`,
`categories`(+redirects 로드맵), `posts`, `media`, `text_blocks`, `audit_logs`
(+ `sites`/`site_members`/`post_visibility`/`upload_sessions`/`recovery_codes`는
멀티사이트·세분 공개·재개 업로드·백업 코드 확장 시).

**규칙**: 전역 프로필과 사이트별 권한 분리, 역할은 사용자가 직접 수정 불가, 같은
부모 아래 slug unique, 카테고리 순환 참조 방지, 기본 soft delete(물리 삭제는 유예
후), media storage path unique, effects에 schema version, 원본 파일명 별도 컬럼,
**Signed URL을 DB에 저장 금지**, created/updated by 기록, 감사 로그는 일반 사용자가
수정·삭제 불가.

---

## 16. 인증 및 계정 정책

- 공개 회원가입 비활성화(관리자 초대), 이메일 인증 필수, 비밀번호 로그인 후
  **TOTP MFA 필수**. MFA 미완료 시 미디어·게시물 조회 불가. 최초 로그인은 MFA 등록
  화면으로 유도(등록 전 제한된 bootstrap만). 세션 만료 시 작업 보존 후 재로그인.
- 비밀번호: 최소 12자 권장, 유출 비밀번호 차단(가능 시), 표시/숨김·Caps Lock 안내,
  비밀번호 관리자 붙여넣기 허용, 불필요한 복잡성 강요 금지.
- TOTP UX: QR + 수동 secret, 코드 검증, 기기 이름, 시간 오차 안내, (지원 시)복구 코드
  최초 1회 표시·다운로드/복사 확인, MFA 해제/재등록 시 최근 인증 재확인.
- 복구 코드 직접 구현 시: 충분한 엔트로피, 원문 1회만 표시, DB엔 강한 해시만, 1회
  사용 후 폐기, 재발급 시 전량 폐기, 관리자도 원문 열람 불가, 사용 시 감사 로그.

---

## 17. 권한 및 RLS

모든 민감 테이블에 RLS 활성화. 접근 판정에 최소: `auth.uid()` 존재 · 계정 활성 ·
현재 site 멤버 · 기능에 맞는 role/permission · 필요 시 AAL2 · 게시물 visibility 일치 ·
삭제되지 않은 레코드.

**금지**: 클라이언트가 보낸 role 신뢰 · 수정 가능한 profile 컬럼만으로 admin 판정 ·
service role 키 브라우저 사용 · RLS 없이 API 코드만으로 권한 통제 · 관리자 UI 숨김
으로 권한 처리 대체. Supabase Storage `storage.objects`에도 동일한 정책을 작성한다.

(구현: 헬퍼 `has_aal2()`, `is_active_member()`, `is_admin()`, `can_read()`,
`can_write()` + 테이블·스토리지 정책 — `0001_init.sql` 참조.)

---

## 18. `/admin` 관리자 기능

- **대시보드**: 게시물·이미지·영상 수, 스토리지 사용량, 처리 실패, 최근 업로드/관리자
  작업, 비정상 로그인·권한 거부 요약.
- **게시물**: 초안·다중 미디어·대표 이미지·제목/캡션·카테고리·촬영일·공개 대상·
  미리보기·게시/보관/삭제·삭제 취소.
- **카테고리**: scope 선택·하위메뉴·드래그 정렬·이름/slug 수정·slug redirect·빈
  카테고리 삭제·게시물 이동.
- **사용자**: 초대·역할 변경·업로드/다운로드 권한·비활성화·모든 세션 종료·MFA 재설정·
  마지막 로그인. 민감 작업은 확인 대화상자 + 감사 로그.
- **사이트 설정**: 사이트명·owner 표시 이름/slug·홈 문구·테마 강도·**푸터 저작권**·
  기본 정렬·다운로드 정책·워터마크·업로드 제한.

---

## 19. 푸터와 저작권

모든 일반 페이지 최하단 필수: `© {현재 연도} {사이트명}. All rights reserved.`
(또는 관리자 설정 문구). 연도는 런타임 자동 계산, 문구는 관리자 편집 가능, 로그인·
MFA·`/admin`에도 일관 표시. **업로드 사진의 권리를 사이트가 자동 취득한다는 식의
문구 금지.**

---

## 20. 보안 헤더 및 웹 보안

CSP(nonce/hash) · `frame-ancestors 'none'` · `object-src 'none'` · `base-uri 'self'`
· `form-action 'self'` · HSTS(HTTPS 확인 후) · Referrer/Permissions Policy · MIME
sniffing 방지 · CSRF · Origin 검증 · Server Action/Route Handler 입력 검증(Zod 등) ·
rate limiting · 로그인 오류에 계정 존재 노출 금지 · 민감정보·Signed URL 로그 금지.
CSP 완화 목적의 무제한 `unsafe-inline`/`unsafe-eval` 금지.

(현재 구현: `next.config.mjs`의 보안 헤더 + `middleware.ts` 게이팅. CSP nonce는
Phase 8에서 강화.)

---

## 21. 프라이버시

모든 페이지 `noindex, nofollow`(robots.txt만 신뢰하지 말고 인증으로 보호), OG 이미지에
개인 사진 자동 포함 금지, 오류 추적 도구에 사진 URL·이메일·파일명 전송 금지, 외부
분석 기본 비활성(도입 시 검토), 원본 버킷 private·공개 URL 금지, 백업·삭제 정책 문서화.

---

## 22. 접근성

키보드만으로 핵심 기능 · 명확한 focus-visible · modal focus trap · 스크린리더 label ·
이미지 alt(장식은 빈 alt) · 동영상 자막 필드 고려 · 대비 WCAG AA · 200% 확대 유지 ·
터치 44×44px · `prefers-reduced-motion`/`prefers-reduced-transparency` · 자동재생 금지
· 깜빡임 제한 · 업로드 진행률 시각+텍스트 동시 제공.

---

## 23. 오류 및 빈 상태 UX

게시물 없음 · 검색 결과 없음 · 업로드 실패 · 처리 중 · 미지원 미리보기 · 연결 끊김 ·
세션 만료 · MFA 코드 오류 · 권한 없음 · Signed URL 만료 · 삭제된 게시물 · 서버 장애.
오류 문구는 stack trace가 아니라 **다음 행동**을 알려준다.

> 예) 이 영상은 원본 보관은 완료되었지만 현재 브라우저에서 재생할 수 없습니다.
> MP4 변환본을 생성하거나 원본을 내려받아 주세요.

---

## 24. 성능 기준

홈 초기 로드에 원본 미디어 미사용 · 썸네일 크기를 표시 크기에 맞춤 · 목록 영상
preload `none`/`metadata` · 화면 밖 영상 일시정지 · WebGL/무거운 편집기 lazy/dynamic
import · CLS < 0.1 · LCP < 2.5s · 갤러리 스크롤 60fps · 저사양 실기기 테스트. Lighthouse
점수만 목표로 삼지 말고 실제 모바일 사용성 우선.

---

## 25. 테스트 요구사항

- **단위**: 권한 판정, 파일 형식 분류, MIME 불일치, 효과 파라미터 validation, slug
  정규화, 저작권 연도, URL 만료·갱신.
- **통합**: 로그인→MFA→홈, AAL1 미디어 차단, Viewer의 관리자 API 차단, Admin 콘텐츠
  수정, Storage RLS, 업로드 실패 후 재시도, slug 변경 redirect, 비활성화 후 세션 차단.
- **E2E**: 모바일 로그인, TOTP 등록, 사진/영상 업로드, 게시물 생성, 효과 저장,
  라이트박스 탐색, 텍스트 수정·취소, 관리자 권한 거부, 로그아웃.
- **접근성**: axe, 키보드 탐색, 스크린리더 수동, reduced motion, 200% 확대.

---

## 26. 구현 단계(Phase)

| Phase | 내용 |
| --- | --- |
| 0 설계 확인 | 요구사항 분석, 지원 형식 표, 플랜 제한 확인, ERD, 권한 매트릭스, 와이어프레임, 위험 보고 |
| 1 디자인 기반 | Pretendard, 토큰, Button/Input/Dialog/Sheet/Toast, Glass, MediaFrame, Skeleton, Empty/Error, 샘플 페이지 |
| 2 인증 | 초대 로그인, MFA 등록/확인, 계정 설정, middleware, 서버 권한 검사, 로그인 rate limit |
| 3 데이터·RLS | migration, seed, RLS, Storage 정책, 권한 테스트, 관리자 역할 보호 |
| 4 페이지 | 홈, 개인/가족 카테고리, 게시물 상세, 동적 내비게이션, 푸터, 검색·필터 |
| 5 업로드 | 업로드 세션, signed/resumable, 검증, 상태 머신, 썸네일/포스터, 실패 처리, EXIF/GPS |
| 6 효과 편집기 | 프록시 로딩, WebGL 효과, 폴백, 프리셋, Undo/Redo, 효과 저장, 정적 파생본 |
| 7 관리자 | 게시물·카테고리·사용자·문구·사이트·보안 설정, 감사 로그 |
| 8 안정화 | E2E, RLS 테스트, 접근성, 성능, 모바일 실기기, 오류 모니터링, 백업·복원 |
| 9 배포 | Vercel production, 환경변수 검증, Supabase migration, 가비아 DNS, HTTPS, CSP, noindex, smoke test |

각 Phase 종료 시 보고: 구현 내용 · 변경 파일 · DB migration · 환경변수 · 테스트 결과 ·
알려진 제한 · 보안 고려사항 · 다음 단계.

---

## 27. 가비아 도메인 연결

Vercel 프로젝트에 도메인 추가 → Vercel이 요구하는 실제 A/CNAME 값 확인 → 가비아 DNS에
등록 → `www`/apex 중 canonical 결정, 나머지는 redirect → 인증서 발급 확인 → **DNS 값
추측 금지** → Supabase Auth Site URL/Redirect URL 갱신(로컬·Preview·Production 구분).

---

## 28. 환경변수 원칙

`.env.example`에 이름만 기록: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. 실제 값 기록 금지,
`service_role`은 서버 전용, `NEXT_PUBLIC_`은 공개 전제, 로그 출력 금지, Preview/
Production Supabase 분리 권장.

---

## 29. 절대 금지 사항

1. `service_role` 키 클라이언트 노출 · 2. RLS 비활성 운영 · 3. 공개 Storage 버킷 ·
4. Signed URL DB 영구 저장 · 5. 관리자 경로 비노출을 보안으로 간주 · 6. 원본 미디어
덮어쓰기 · 7. 확장자만 검사 · 8. 업로드 SVG 직접 렌더링 · 9. 모든 파일의 브라우저
표시 허위 보장 · 10. 대용량 FFmpeg를 Vercel 요청 내 동기 실행 · 11. role을 클라이언트
입력으로 변경 · 12. 사용자 입력 HTML 무검증 렌더링 · 13. 관리자 UI를 렌더 후 CSS로만
숨김 · 14. GPS 기본 공개 · 15. 모든 갤러리 카드에 WebGL context 생성 · 16. 저작권 푸터
누락 · 17. 접근성 없는 hover 전용 인터랙션 · 18. 자동재생 영상 소리 활성화 · 19. 삭제
즉시 원본 영구 제거 · 20. 최신화 명목의 무분별한 major upgrade.

---

## 30. 최종 완료 조건(DoD)

승인 사용자만 로그인 · 비밀번호+TOTP 완료 전 콘텐츠 비공개 · 권한 없는 사용자의
`/admin`·관리자 API 차단 · DB·Storage RLS 테스트 통과 · 개인·가족 동적 카테고리 동작 ·
지원 사진/영상 업로드 · 비지원 형식의 보관·미리보기 제한 정확 안내 · 진행률·실패·재시도 ·
효과 비파괴 저장 · 갤러리 정적 썸네일로 부드럽게 · 관리자 텍스트/카테고리/게시물 관리 ·
Pretendard 적용 · 미색·리퀴드 글래스 디자인 · 모바일/키보드/스크린리더 기본 테스트 ·
모든 일반 페이지 최하단 저작권 · Vercel 배포 + 가비아 HTTPS · README에 설치·배포·보안·
백업·알려진 제한 기록.

---

## 부록 — v2 대비 v3의 핵심 개정

1. 모든 확장자 재생을 약속하지 않고 **업로드·변환·보관을 구분**.
2. Vercel에서 **대용량 영상 변환을 실행하지 않도록** 제한.
3. **갤러리 전체 WebGL 제거**로 모바일 성능 개선.
4. AAL2뿐 아니라 **멤버십·역할·공개 범위**를 함께 검증.
5. DB뿐 아니라 **Supabase Storage에도 RLS** 적용.
6. **숨은 `/admin`과 실제 보안을 분리**(경로 비노출 ≠ 접근 제어).
7. **Signed URL 만료** 대응(끊김 방지).
8. 콘텐츠 편집에 **저장·취소·Undo·충돌 검사** 추가.
9. **Masonry 접근성 문제**를 줄이고 Grid 중심.
10. **GPS·EXIF·원본 다운로드** 개인정보 보호 강화.
11. **리퀴드 글래스 과사용 방지**로 가독성·사진 집중 개선.
12. **업로드 상태·실패·재시도·처리 중 UI** 구체화.
13. **우클릭 방지를 보안 기능에서 제외**.
14. **초대 기반 계정 + 관리자 권한 변경 감사 로그** 추가.
15. **테스트·인수 조건**으로 실제 완료 판단.
