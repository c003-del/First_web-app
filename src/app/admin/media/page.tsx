import { getCategories } from "@/lib/data";
import { Uploader } from "./Uploader";

export const metadata = { title: "미디어 업로드" };

export default async function AdminMediaPage() {
  const [owner, family] = await Promise.all([
    getCategories("owner"),
    getCategories("family"),
  ]);

  const options = [
    ...owner.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      scopeLabel: "개인",
    })),
    ...family.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      scopeLabel: "가족",
    })),
  ];

  return (
    <div>
      <h1 className="text-2xl">미디어 업로드</h1>
      <p className="mt-2 text-[14px] leading-6 text-ink-secondary">
        확장자·크기·매직바이트 검증을 거쳐 원본을 비공개 버킷에 저장하고,
        브라우저에서 썸네일(이미지)·포스터(영상)를 생성합니다. 업로드가 끝나면
        선택한 카테고리에 게시물이 생성됩니다.
      </p>
      <div className="mt-6">
        <Uploader categories={options} />
      </div>
    </div>
  );
}
