import type { Category, Post } from "@/lib/types";
import { SITE_DEFAULTS } from "@/lib/config";

/**
 * Demo content used only when Supabase is not configured, so the design and
 * navigation are explorable without a database. Real data replaces this via
 * the queries in `src/lib/data.ts` once connected.
 *
 * Images use picsum.photos (deterministic seeds) purely as placeholders.
 */

export const DEMO_CATEGORIES: Category[] = [
  // Owner scope (the user's own name category)
  {
    id: "c-own-daily",
    parentId: null,
    scope: "owner",
    name: "일상",
    slug: "daily",
    sort: 0,
    description: "소소한 하루하루의 기록",
  },
  {
    id: "c-own-travel",
    parentId: null,
    scope: "owner",
    name: "여행",
    slug: "travel",
    sort: 1,
    description: "함께 걸었던 길들",
  },
  {
    id: "c-own-work",
    parentId: null,
    scope: "owner",
    name: "작업",
    slug: "work",
    sort: 2,
    description: "만들고 기록한 것들",
  },
  // Family scope
  {
    id: "c-fam-gatherings",
    parentId: null,
    scope: "family",
    name: "모임",
    slug: "gatherings",
    sort: 0,
    description: "다 같이 모인 날",
  },
  {
    id: "c-fam-kids",
    parentId: null,
    scope: "family",
    name: "아이들",
    slug: "kids",
    sort: 1,
    description: "자라는 순간들",
  },
];

function img(seed: string, w: number, h: number) {
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

function demoPost(
  id: string,
  categoryId: string,
  title: string,
  seed: string,
  ratio: [number, number],
): Post {
  const [w, h] = ratio;
  return {
    id,
    categoryId,
    title,
    caption: "따뜻했던 순간.",
    takenAt: "2026-05-14",
    createdAt: "2026-05-14T09:00:00Z",
    media: [
      {
        id: `${id}-m1`,
        postId: id,
        kind: "image",
        support: "web-native",
        status: "ready",
        ext: "jpg",
        mime: "image/jpeg",
        width: w,
        height: h,
        storagePath: img(seed, w, h),
        thumbPath: img(seed, Math.round(w / 2), Math.round(h / 2)),
        placeholder: "# efe7d9".replace(" ", ""),
        alt: title,
        sort: 0,
      },
    ],
  };
}

export const DEMO_POSTS: Post[] = [
  demoPost("p1", "c-own-daily", "아침 커피", "archive-a", [1200, 1500]),
  demoPost("p2", "c-own-daily", "창가의 오후", "archive-b", [1600, 1067]),
  demoPost("p3", "c-own-travel", "바다로", "archive-c", [1600, 1067]),
  demoPost("p4", "c-own-travel", "골목길", "archive-d", [1200, 1500]),
  demoPost("p5", "c-own-work", "작업실", "archive-e", [1400, 1400]),
  demoPost("p6", "c-fam-gatherings", "생일 저녁", "archive-f", [1600, 1067]),
  demoPost("p7", "c-fam-gatherings", "다 같이", "archive-g", [1200, 1500]),
  demoPost("p8", "c-fam-kids", "첫 걸음", "archive-h", [1400, 1400]),
];

export const DEMO_SITE = {
  ...SITE_DEFAULTS,
};
