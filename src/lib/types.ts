export type Citation = { label: string; url?: string };

export type ScoreItem = { parameter: string; score: number; comment: string };

export type Pushback = {
  quote: string;
  issue: string;
  correction: string;
  severity: "minor" | "major";
};

export type Review = {
  overall: number;
  verdict: string;
  scores: ScoreItem[];
  pushback: Pushback[];
  strengths: string[];
  gaps: string[];
  questions: string[];
  tags: string[];
};

export type Note = {
  id: string;
  entry_date: string;
  title: string;
  raw_understanding: string;
  final_note: string | null;
  citations: Citation[];
  review: Review | null;
  tags: string[];
  overall_score: number | null;
  created_at: string;
  updated_at: string;
};

export type NoteSummary = Pick<
  Note,
  "id" | "entry_date" | "title" | "tags" | "overall_score" | "created_at"
> & { excerpt: string };

export type NoteInput = {
  id?: string;
  entry_date: string;
  title: string;
  raw_understanding: string;
  final_note: string | null;
  citations: Citation[];
  review: Review | null;
};

export type AskSource = {
  n: number;
  noteId: string;
  title: string;
  entryDate: string;
  snippet: string;
};

export type ChatTurn = { role: "user" | "assistant"; content: string };
