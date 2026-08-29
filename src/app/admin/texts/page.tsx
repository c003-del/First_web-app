import { getTextBlocks } from "@/lib/data";
import { TextBlocksForm } from "./TextBlocksForm";

export const metadata = { title: "문구 관리" };

export default async function AdminTextsPage() {
  const initial = await getTextBlocks();
  return (
    <div>
      <h1 className="text-2xl">문구 관리</h1>
      <p className="mt-2 text-[14px] leading-6 text-ink-secondary">
        홈 화면 등의 편집 가능한 문구를 관리합니다. 서식이 없는 일반 텍스트로
        저장되며, 화면에는 자동 이스케이프되어 렌더링됩니다.
      </p>
      <div className="mt-6">
        <TextBlocksForm initial={initial} />
      </div>
    </div>
  );
}
