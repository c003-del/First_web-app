import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "감사 로그" };

interface AuditRow {
  // Postgres bigint arrives as a JS number when it fits, string otherwise.
  id: number | string;
  actor: string | null;
  action: string;
  target: string | null;
  at: string;
}

interface FetchResult {
  rows: AuditRow[];
  error: string | null;
}

async function fetchAuditRows(): Promise<FetchResult> {
  const supabase = await createClient();
  if (!supabase) return { rows: [], error: null };
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, actor, action, target, at")
    .order("at", { ascending: false })
    .limit(100);
  if (error) {
    // Surface the failure — a silent empty result would look identical to
    // "no records" and could hide a real incident or permission drift.
    return { rows: [], error: "감사 로그를 불러오지 못했습니다." };
  }
  return { rows: (data ?? []) as AuditRow[], error: null };
}

export default async function AdminAuditPage() {
  const { rows, error } = await fetchAuditRows();

  return (
    <div>
      <h1 className="text-2xl">감사 로그</h1>
      <p className="mt-2 text-[14px] leading-6 text-ink-secondary">
        관리자 행위와 보안 이벤트의 조회입니다. 로그는 일반 사용자가 수정·삭제할
        수 없습니다. (기록 삽입은 향후 사용자 관리 phase에서 추가됩니다.)
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-md bg-danger/10 px-3 py-2 text-[13px] text-danger"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-lg border border-soft">
        <table className="w-full min-w-[540px] text-left text-[13px]">
          <thead className="bg-surface-1 text-ink-secondary">
            <tr>
              <th className="px-3 py-2">시각</th>
              <th className="px-3 py-2">작업</th>
              <th className="px-3 py-2">대상</th>
              <th className="px-3 py-2">주체</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-soft">
            {rows.length === 0 ? (
              <tr>
                <td
                  className="px-3 py-6 text-center text-ink-muted"
                  colSpan={4}
                >
                  아직 기록이 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={String(r.id)}>
                  <td className="whitespace-nowrap px-3 py-2 text-ink-muted">
                    {new Date(r.at).toLocaleString("ko-KR")}
                  </td>
                  <td className="px-3 py-2">{r.action}</td>
                  <td className="px-3 py-2 text-ink-secondary">{r.target ?? ""}</td>
                  <td className="px-3 py-2 text-ink-muted">
                    {r.actor?.slice(0, 8) ?? "system"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
