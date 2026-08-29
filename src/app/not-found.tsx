import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-content flex-col items-center justify-center px-5 text-center">
      <p className="text-[13px] uppercase tracking-[0.18em] text-ink-muted">
        404
      </p>
      <h1 className="mt-2 text-3xl">페이지를 찾을 수 없어요</h1>
      <p className="mt-3 text-ink-secondary">
        주소가 바뀌었거나, 접근 권한이 없는 페이지일 수 있습니다.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-md bg-accent-primary px-5 py-2.5 text-surface-solid hover:bg-accent-primary-hover"
      >
        홈으로
      </Link>
    </main>
  );
}
