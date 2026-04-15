export type WtrTag = {
  id: number;
  title: string;
  slug: string;
  category_id: number;
  category_name: string;
};

export type WtrSerieDataData = {
  title: string;
  author?: string | null;
  description?: string | null;
  image?: string | null;
  raw?: string | null;
  chapter_count?: number | null;
};

export type WtrSerieData = {
  id: number;
  raw_id?: number | null;
  slug: string;
  status: number;
  author?: string | null;
  rating: number | null;
  total_rate: number | null;
  chapter_count: number;
  raw_status: number;
  updated_at: string;
  created_at: string;
  in_library?: number;
  view?: number;
  char_count?: number;
  tags: number[];
  data: WtrSerieDataData;
};

export type WtrChapterSummary = {
  id: number;
  order: number;
  title: string;
  updated_at: string;
  name?: string;
};

export type WtrSeriePageProps = {
  serie: {
    serie_data: WtrSerieData;
    last_chapters: WtrChapterSummary[];
  };
  tags: WtrTag[];
};

export type WtrNextData = {
  props?: {
    pageProps?: unknown;
  };
};
