# Private Family Archive

초대받은 가족만 볼 수 있는 비공개 사진·영상 아카이브.
로그인 + TOTP 2단계 인증(AAL2)을 통과한 사람에게만 콘텐츠가 열립니다.
미색(크림) 톤 · 리퀴드 글래스 액자 · 모바일 우선.

> 원 저장소 메모: _HP엔지니어링 대표가 사준 연습용 도메인 ㅋ_

전체 사양은 **[`docs/DEVELOPMENT_GUIDELINES.md`](docs/DEVELOPMENT_GUIDELINES.md)** (v3)를 기준으로 합니다.

---

## 스택

| 영역 | 사용 |
| --- | --- |
| 프레임워크 | Next.js (App Router) + TypeScript (strict) |
| 스타일 | Tailwind CSS + CSS 변수 디자인 토큰 |
| 폰트 | Pretendard (self-host, `next/font/local`; 시스템 폴백) |
| 백엔드 | Supabase — Auth / Postgres / Storage / RLS / TOTP MFA |
| 배포 | Vercel + 가비아 도메인 |

---

## 빠른 시작

```bash
npm install
cp .env.example .env.local   # 값 입력 (아래 참조)
npm run dev                  # http://localhost:3000
```

### 데모 모드

`.env.local`에 Supabase 값을 넣지 않으면 **데모 모드**로 실행됩니다. 인증 없이
데모 데이터로 디자인·내비게이션·페이지 구조를 그대로 둘러볼 수 있고, 각 화면에
데모 모드 배너가 표시됩니다. Supabase를 연결하면 인증·MFA·RLS가 활성화됩니다.

### Supabase 연결

`supabase/README.md`의 단계를 따르세요 — 프로젝트 생성 → `migrations/0001_init.sql`
적용(스키마 + RLS + Storage 정책 + 프로필 자동 생성 트리거) → TOTP 활성화 →
첫 사용자를 `owner`로 승격 → Redirect URL 등록.

---

## 스크립트

```bash
npm run dev        # 개발 서버
npm run build      # 프로덕션 빌드 (타입 체크 포함)
npm run start      # 빌드 결과 실행
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

---

## 프로젝트 구조

```
src/
  app/
    (app)/            콘텐츠 영역 (데이터 기반 내비 + 푸터)
      page.tsx        홈
      [ownerSlug]/    개인 카테고리 + 하위
      family/         가족 카테고리 + 하위
      post/[postId]/  게시물 상세
    (auth)/           login · mfa/setup · mfa/verify · recovery
    admin/            관리자 (AAL2 + owner|admin 서버 강제)
    layout.tsx        루트 (폰트 · 메타 · 공통 푸터)
    globals.css       디자인 토큰 + 리퀴드 글래스 유틸
  components/         Glass · Button · MediaFrame · MediaGallery · SiteNav · ...
  lib/
    supabase/         client · server · middleware
    data.ts           Supabase(RLS) 또는 데모 데이터 조회
    media.ts          확장자 분류·검증 정책
    effects.ts        비파괴 효과 파라미터 + 범위 검증
middleware.ts         auth → /login, AAL1 → /mfa, /admin AAL2 게이팅
supabase/
  migrations/0001_init.sql   스키마 · RLS · Storage 정책
docs/DEVELOPMENT_GUIDELINES.md  사양 기준 (v3)
```

---

## 보안 개요

- **인증 게이팅**: 미인증 → `/login`, MFA 미완료(AAL1) → `/mfa/verify`
  (`src/middleware.ts` — `src/` 안에 위치해야 Next.js가 실제로 등록합니다).
- **RLS**: 모든 테이블에서 읽기는 활성 멤버 + AAL2, 쓰기는 admin + AAL2. 역할은
  `profiles.role`이 출처이며 사용자가 직접 바꿀 수 없습니다.
- **`/admin`**: 경로를 숨기는 것에 의존하지 않고, 레이아웃에서 AAL2 + 역할을 서버에서
  재검사하여 실패 시 404를 반환합니다.
- **Storage**: `private-media` 버킷은 private이며 조회는 짧은 Signed URL로만. Signed URL은
  DB에 저장하지 않습니다.
- **CSP**: 요청마다 nonce를 생성해 `script-src 'strict-dynamic'` + nonce로 스크립트를
  제한하고, `frame-ancestors 'none'`·`object-src 'none'`·`base-uri/form-action 'self'`·
  `upgrade-insecure-requests`를 적용합니다(`src/lib/security.ts`).
- **로그인 rate limit**: IP당 15분 내 실패 10회 초과 시 잠금(서버 액션에서 강제,
  `src/lib/rate-limit.ts`).
- **HTTPS/정식 호스트**: `NEXT_PUBLIC_CANONICAL_HOST` 설정 시 middleware가 HTTP·비정식
  호스트를 정식 HTTPS로 308 리다이렉트. HSTS는 `next.config.mjs`.
- **헤더**: `next.config.mjs`에서 X-Frame-Options·nosniff·Referrer/Permissions·HSTS 적용.
- **인덱싱**: 전 페이지 `noindex, nofollow` + `/robots.txt` `Disallow: /`.

---

## 배포 (Vercel + 가비아)

> 전체 절차 · SSL 발급(Vercel 자동 / Cloudflare) · 스모크 테스트는
> **[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)** 참조.

1. Vercel에 저장소 임포트, 환경변수(`.env.example` 참조) 설정.
2. Supabase production에 migration 적용, Auth Redirect URL에 프로덕션 도메인 추가.
3. Vercel에 가비아 도메인 추가 → Vercel이 안내하는 **실제** A/CNAME 값을 가비아 DNS에
   등록(값 추측 금지) → 인증서 발급 확인 → apex/www canonical 결정.

---

## 구현 상태

**구현 완료 (Phase 1–9의 코드 범위)**

- 디자인 토큰 · 리퀴드 글래스 · MediaFrame · 접근성 지향 Grid 갤러리 · 라이트박스
- 데이터 기반 내비게이션, 홈/개인/가족/카테고리/게시물 상세, 검색·필터, `/settings`,
  공통 저작권 푸터
- 로그인(서버 액션 + rate limit) · MFA 등록/확인 · 복구 안내
- auth/MFA/admin 게이팅 미들웨어 (**`src/middleware.ts`로 이동해 실제 등록되도록 수정**)
- nonce 기반 CSP · HTTPS/정식 호스트 강제 · robots · noindex
- 전체 DB 스키마 + RLS + Storage 정책 + 프로필 자동 생성 트리거
- 업로드 파이프라인(확장자 분류·검증 정책, 상태 머신, 썸네일 유틸)
- WebGL 비파괴 효과 편집기 + 프리셋
- 관리자 CRUD(게시물·카테고리·문구·설정·감사 로그) + 홈 히어로 인라인 텍스트 편집
- Pretendard self-host, 데모 모드
- 단위 테스트 60개 통과 (`npm run test`), 타입체크·프로덕션 빌드 통과

**남은 작업 — 배포 계정·수동 절차 필요 (코드로 완료 불가)**

- 실제 Vercel 배포 + 환경변수 등록 → [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
- Supabase 프로덕션 프로젝트 생성 + migration 적용 + TOTP 활성화 + owner 승격
- 가비아 도메인 연결 + SSL 인증서 발급(Vercel 자동 또는 Cloudflare Full strict)
- 사용자가 직접 진행 예정: 폰트 파일 교체, "부스팅 모드" 기능

## 알려진 제한 (Known limitations)

- **rate limit**은 서버리스 인스턴스별 in-memory라 수평 확장 시 best-effort입니다.
  Supabase Auth의 자체 rate limit이 함께 작동하며, 엄격한 전역 제한이 필요하면
  공유 스토어(Upstash/Postgres)로 백엔드를 교체하세요(`src/lib/rate-limit.ts`).
- **백업 코드**는 Supabase MFA 정책에 의존합니다. 직접 구현 시 원문 1회 표시·해시
  저장·재발급 시 폐기 원칙을 지키세요(가이드라인 §16).
- **대용량 영상 변환**은 Vercel 함수에서 동기 실행하지 않습니다. 필요 시 Mux/
  Cloudflare Stream/별도 워커를 도입하세요(가이드라인 §2.5).
- **E2E·axe 접근성·Lighthouse**는 브라우저 러너가 필요해 CI 파이프라인에서 별도
  구성하세요(가이드라인 §25). 현재는 단위 테스트로 순수 로직을 검증합니다.

## 백업 · 복구

Supabase DB 자동 백업 + 주기적 `pg_dump`, `private-media` 버킷 오프사이트 백업,
soft-delete 후 유예 기간 물리 삭제를 권장합니다. 상세는
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) §6.

각 항목은 `docs/DEVELOPMENT_GUIDELINES.md`의 해당 Phase를 따릅니다.
