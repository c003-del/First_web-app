import { getSiteSettings } from "@/lib/data";
import { SettingsForm } from "./SettingsForm";

export const metadata = { title: "사이트 설정" };

export default async function AdminSettingsPage() {
  const settings = await getSiteSettings();
  return (
    <div>
      <h1 className="text-2xl">사이트 설정</h1>
      <p className="mt-2 text-[14px] leading-6 text-ink-secondary">
        사이트명, 소유자 표시 이름·slug, 푸터 저작권 문구를 편집합니다. 저장하면
        전 페이지에 즉시 반영됩니다.
      </p>
      <div className="mt-6">
        <SettingsForm initial={settings} />
      </div>
    </div>
  );
}
