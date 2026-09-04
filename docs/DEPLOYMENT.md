# 배포 · SSL · 도메인 가이드

Vercel + 가비아 도메인 기준. TLS 인증서는 **Vercel 또는 Cloudflare가 자동 발급**하며
(직접 파일을 업로드하지 않습니다), 앱은 코드 측에서 HTTPS·정식 호스트를 강제하고 HSTS·
`upgrade-insecure-requests`를 전송합니다. 아래 순서대로 진행하세요.

---

## 1. Supabase(프로덕션) 준비

1. 프로덕션 전용 Supabase 프로젝트를 만듭니다(프리뷰와 분리 권장).
2. `supabase/migrations/0001_init.sql`을 SQL 편집기에 붙여넣어 실행 — 스키마·RLS·
   Storage 정책·프로필 트리거가 한 번에 생성됩니다.
3. **Authentication → Providers**: 공개 가입 비활성화(초대 전용).
4. **Authentication → MFA**: TOTP 활성화.
5. 첫 사용자 가입 + MFA 등록 후 `owner`로 승격:
   ```sql
   update public.profiles set role = 'owner' where id = '<auth-user-uuid>';
   ```

자세한 내용은 [`../supabase/README.md`](../supabase/README.md).

---

## 2. Vercel 프로젝트 + 환경변수

### 2-0. 이 저장소의 실제 연결 정보

| 항목 | 값 |
| --- | --- |
| Vercel 팀 | `HPeng` (slug `hp-eng`, Hobby 플랜) |
| Vercel 프로젝트 | `first-web-app` |
| Git 저장소 | `c003-del/First_web-app` (Production Branch: `main`) |
| Supabase 프로젝트 ref | `sddkavaejlificbjmmql` (리전 `ap-northeast-2` / 서울) |
| Supabase Project URL | `https://sddkavaejlificbjmmql.supabase.co` |

> Supabase가 서울 리전이므로 Vercel **Settings → Functions → Region**도
> `Seoul (icn1)`으로 맞추면 DB 왕복 지연이 줄어듭니다.

1. Vercel에 이 저장소를 임포트합니다(프레임워크 자동 감지: Next.js).
2. **Settings → Environment Variables**에 등록(Production/Preview 구분):

   | 변수 | 값 |
   | --- | --- |
   | `NEXT_PUBLIC_SITE_URL` | `https://<정식도메인>` (배포 후 확정) |
   | `NEXT_PUBLIC_CANONICAL_HOST` | `<정식도메인>` (scheme 없이, 예: `archive.example.com`) |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role (서버 전용) |

   > `SUPABASE_SERVICE_ROLE_KEY`에는 `NEXT_PUBLIC_` 접두사를 절대 붙이지 마세요.

   값을 가져오는 위치:
   - `NEXT_PUBLIC_SUPABASE_URL` → 위 표의 Project URL 그대로.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Supabase **Project Settings → API Keys**의
     `anon` (또는 `publishable`) 키. 브라우저에 노출되는 공개 키입니다.
   - `SUPABASE_SERVICE_ROLE_KEY` → 같은 화면의 `service_role` 키. **서버 전용**이며
     저장소·문서·클라이언트 코드에 절대 넣지 않습니다. Vercel 환경변수에만 등록하세요.

   > 환경변수 없이도 빌드는 성공합니다(`src/lib/config.ts`의 데모 모드). 즉 위 3개를
   > 등록하기 전 배포는 로그인·미디어가 동작하지 않는 껍데기 상태이므로, 첫 배포 후
   > 반드시 환경변수를 등록하고 **재배포(Redeploy)** 해야 합니다.
3. 첫 배포를 실행합니다(임시 `*.vercel.app` 도메인으로 동작 확인).

---

## 3. 가비아 도메인 연결 + SSL (경로 A: Vercel 관리형 — 권장)

Vercel이 Let's Encrypt 인증서를 자동 발급·갱신합니다.

1. Vercel **Settings → Domains**에 정식 도메인(예: `archive.example.com` 또는 apex
   `example.com`)을 추가합니다.
2. Vercel이 **실제** DNS 레코드 값을 화면에 표시합니다. **값을 추측하지 말고 표시된
   그대로** 사용하세요. 일반적으로:
   - 서브도메인: `CNAME` → `cname.vercel-dns.com`
   - apex 도메인: `A` → Vercel이 안내하는 IP
3. 가비아 **My가비아 → DNS 관리**에서 위 레코드를 등록합니다.
4. DNS 전파 후 Vercel Domains에 **Valid Configuration** + 인증서 발급이 표시됩니다
   (수 분~수십 분).
5. apex와 `www` 중 **하나를 정식(canonical)** 으로 정하고, 나머지는 Vercel Domains에서
   canonical으로 redirect 설정합니다. 앱의 `NEXT_PUBLIC_CANONICAL_HOST`도 이 값과
   일치시키면 middleware가 잘못된 호스트/HTTP 요청을 308로 정식 HTTPS URL에 통일합니다.

---

## 3-A. 대안 경로 B: Cloudflare 프록시 SSL

가비아 네임서버를 Cloudflare로 위임해 Cloudflare를 통해 인증서를 받는 방법입니다.

1. Cloudflare에 도메인 추가 → 안내된 **네임서버 2개**를 가비아
   **네임서버 설정**에 등록(가비아 기본 NS를 Cloudflare NS로 교체).
2. Cloudflare **DNS**에서 정식 호스트를 Vercel로 연결(서브도메인 `CNAME` →
   `cname.vercel-dns.com`), 주황색 구름(프록시) ON.
3. Cloudflare **SSL/TLS → Overview**: 모드를 반드시 **Full (strict)** 로 설정
   (Flexible 금지 — 리다이렉트 루프·MITM 위험).
4. Vercel Domains에도 같은 도메인을 추가해 Vercel 인증서를 발급받아야 Full(strict)이
   양단에서 유효합니다.
5. Cloudflare **SSL/TLS → Edge Certificates**: Always Use HTTPS ON, HSTS 활성화
   (앱도 HSTS를 보냅니다).

> 앱의 HSTS(`max-age=63072000; includeSubDomains; preload`)는 HTTPS 확정 후에만
> 의미가 있습니다. 도메인/인증서가 안정화되기 전에는 preload 등록을 미루세요.

---

## 4. Supabase Auth Redirect URL 갱신

**Authentication → URL Configuration**에서:
- **Site URL**: `https://<정식도메인>`
- **Redirect URLs**: 로컬(`http://localhost:3000`), Vercel 프리뷰 도메인, 프로덕션
  도메인을 모두 추가.

---

## 5. 배포 후 스모크 테스트

- [ ] `http://<도메인>` → `https://<정식도메인>`로 308/301 리다이렉트
- [ ] `www` ↔ apex 중 비정식 호스트가 정식으로 리다이렉트
- [ ] 응답 헤더에 `content-security-policy`(nonce 포함), `strict-transport-security`,
      `x-frame-options: DENY`, `x-content-type-options: nosniff` 존재
- [ ] 브라우저 콘솔에 CSP 위반 오류 없음(스크립트 정상 로드)
- [ ] 미인증 접근 → `/login`, 비밀번호만(AAL1) → `/mfa/verify`
- [ ] 로그인 10회 실패 시 잠금 메시지
- [ ] `/admin`을 비관리자/비AAL2로 접근 시 404
- [ ] `/robots.txt`가 `Disallow: /`
- [ ] 페이지 소스가 `noindex, nofollow`

브라우저 없이 헤더만 빠르게 확인:

```bash
curl -sI https://<정식도메인>/login | grep -i "content-security-policy\|strict-transport\|x-frame"
```

---

## 6. 백업 · 복구

- **DB**: Supabase 자동 백업(플랜별 보존기간 확인). 정기적으로 `pg_dump` 스냅샷을
  별도 보관 권장.
- **Storage**: `private-media` 버킷은 Supabase에 저장됩니다. 원본 미디어는 삭제 시
  soft-delete가 기본이며, 물리 삭제 정책·오프사이트 백업 주기를 문서로 합의하세요.
- **비밀키 분실 대비**: `SUPABASE_SERVICE_ROLE_KEY`는 Vercel 환경변수에만 두고,
  로컬 `.env.local`은 커밋 금지(`.gitignore`에 포함).
