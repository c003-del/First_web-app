"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { saveTextBlock } from "./actions";

interface Block {
  key: string;
  label: string;
  placeholder: string;
  multiline?: boolean;
  max?: number;
}

const BLOCKS: Block[] = [
  {
    key: "home.hero.headline",
    label: "홈 히어로 문구",
    placeholder: "예: 우리 가족만의 조용한 아카이브",
    max: 120,
  },
  {
    key: "home.hero.description",
    label: "홈 히어로 설명",
    placeholder: "예: 초대받은 가족만 함께 보는 사진과 영상.",
    multiline: true,
    max: 400,
  },
];

export function TextBlocksForm({ initial }: { initial: Map<string, string> }) {
  return (
    <div className="max-w-2xl space-y-6">
      {BLOCKS.map((b) => (
        <TextBlockRow key={b.key} spec={b} initial={initial.get(b.key) ?? ""} />
      ))}
    </div>
  );
}

function TextBlockRow({ spec, initial }: { spec: Block; initial: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [baseline, setBaseline] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const dirty = value !== baseline;

  function save() {
    setMessage(null);
    start(async () => {
      const res = await saveTextBlock(spec.key, value);
      if (res.ok) {
        setBaseline(value);
        setMessage("저장되었습니다.");
        router.refresh();
      } else {
        setMessage(res.error ?? "저장 실패");
      }
    });
  }

  function reset() {
    setValue(baseline);
    setMessage(null);
  }

  const inputProps = {
    value,
    onChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => setValue(e.target.value),
    maxLength: spec.max,
    className:
      "mt-1 w-full rounded-md border border-strong bg-surface-solid px-3 py-2.5 text-[15px]",
    placeholder: spec.placeholder,
  };

  return (
    <div className="rounded-lg border border-soft bg-surface-1 p-4">
      <label className="block">
        <span className="flex items-baseline justify-between text-[13px] text-ink-secondary">
          <span>{spec.label}</span>
          <span className="text-ink-muted">{spec.key}</span>
        </span>
        {spec.multiline ? (
          <textarea {...inputProps} rows={3} />
        ) : (
          <input type="text" {...inputProps} />
        )}
        {spec.max ? (
          <span className="mt-1 block text-right text-[11px] text-ink-muted">
            {value.length} / {spec.max}
          </span>
        ) : null}
      </label>
      {message ? (
        <p className="mt-1 text-[13px] text-ink-secondary" role="status">
          {message}
        </p>
      ) : null}
      <div className="mt-3 flex gap-2">
        <Button onClick={save} disabled={!dirty || pending}>
          {pending ? "저장 중…" : "저장"}
        </Button>
        <Button variant="ghost" onClick={reset} disabled={!dirty || pending}>
          되돌리기
        </Button>
      </div>
    </div>
  );
}
