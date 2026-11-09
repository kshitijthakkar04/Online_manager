import "server-only";
import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL, requireEnv } from "./env";
import type { AskSource, ChatTurn, Citation, Review } from "./types";

let ai: GoogleGenAI | null = null;

function client() {
  ai ??= new GoogleGenAI({ apiKey: requireEnv("GEMINI_API_KEY").GEMINI_API_KEY });
  return ai;
}

// ---------- Search planning (keyword search stands in for embeddings) ----------

export type SearchPlan = { keywords: string[]; dateFrom: string | null; dateTo: string | null };

const planSchema = {
  type: "object",
  properties: {
    keywords: {
      type: "array",
      items: { type: "string" },
      description: "6-15 single words or short terms: the topic words, plus synonyms, abbreviations and closely related terms the notes might use instead.",
    },
    date_from: { type: "string", description: "YYYY-MM-DD if the question is about a time period, else empty string." },
    date_to: { type: "string", description: "YYYY-MM-DD if the question is about a time period, else empty string." },
  },
  required: ["keywords", "date_from", "date_to"],
};

/** Turns a natural-language question into search keywords and an optional date range. */
export async function planSearch(question: string, history: ChatTurn[], today: string): Promise<SearchPlan> {
  const recent = history.slice(-4).map((t) => `${t.role === "user" ? "Me" : "You"}: ${t.content.slice(0, 400)}`).join("\n");
  const res = await client().models.generateContent({
    model: GEMINI_MODEL,
    contents: `${recent ? `Conversation so far:\n${recent}\n\n` : ""}Today is ${today}.\nQuestion: ${question}`,
    config: {
      systemInstruction: `You turn a question about the user's personal learning diary into a keyword search.
- Resolve follow-ups ("why?", "tell me more") using the conversation so the keywords name the actual topic.
- Leave out filler words like "learn", "notes", "what", "know", "explain".
- Only set dates when the question is explicitly about time ("this week", "in March", "yesterday").`,
      responseMimeType: "application/json",
      responseJsonSchema: planSchema,
      temperature: 0,
    },
  });
  const raw = JSON.parse(res.text ?? "{}") as { keywords?: string[]; date_from?: string; date_to?: string };
  const isDate = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null);
  return {
    keywords: (raw.keywords ?? []).map((k) => k.trim()).filter(Boolean).slice(0, 15),
    dateFrom: isDate(raw.date_from),
    dateTo: isDate(raw.date_to),
  };
}

const formatCitations = (citations: Citation[]) =>
  citations.length
    ? citations.map((c, i) => `[${i + 1}] ${c.label}${c.url ? ` — ${c.url}` : ""}`).join("\n")
    : "(none provided)";

// ---------- Review ----------

const REVIEW_PARAMETERS = [
  "Understanding",
  "Accuracy",
  "Framing & Clarity",
  "Depth",
  "Examples & Application",
  "Use of Sources",
];

const reviewSchema = {
  type: "object",
  properties: {
    overall: { type: "number", description: "Overall score 0-10, one decimal." },
    verdict: { type: "string", description: "One honest sentence summarising where the learner stands." },
    scores: {
      type: "array",
      items: {
        type: "object",
        properties: {
          parameter: { type: "string", enum: REVIEW_PARAMETERS },
          score: { type: "number", description: "0-10" },
          comment: { type: "string", description: "1-2 sentences, specific to their text." },
        },
        required: ["parameter", "score", "comment"],
      },
    },
    pushback: {
      type: "array",
      description: "Every claim that is wrong, misleading, or oversimplified to the point of being wrong.",
      items: {
        type: "object",
        properties: {
          quote: { type: "string", description: "The learner's exact words being challenged." },
          issue: { type: "string", description: "What is wrong and why." },
          correction: { type: "string", description: "The correct statement, in plain language." },
          severity: { type: "string", enum: ["minor", "major"] },
        },
        required: ["quote", "issue", "correction", "severity"],
      },
    },
    strengths: { type: "array", items: { type: "string" } },
    gaps: { type: "array", items: { type: "string" }, description: "Important ideas missing from their understanding." },
    questions: { type: "array", items: { type: "string" }, description: "3 questions to test themselves with." },
    tags: { type: "array", items: { type: "string" }, description: "2-5 short lowercase topic tags." },
  },
  required: ["overall", "verdict", "scores", "pushback", "strengths", "gaps", "questions", "tags"],
};

const REVIEW_SYSTEM = `You are a rigorous but warm tutor reviewing a learner's daily diary entry.
The learner did NOT copy from sources — they wrote what they understood in their own words. Your job:
- Score each parameter (${REVIEW_PARAMETERS.join(", ")}) from 0 to 10. Be calibrated: 9-10 is expert-level, 5 is "gets the gist with real errors".
- If no sources are provided, score "Use of Sources" on whether claims would need sourcing, and say so.
- Push back on anything incorrect. Quote their exact words, explain the problem, and give the correct version. Do not invent errors to seem thorough; if it is right, say so in strengths.
- Do not rewrite their entry. Do not be sycophantic.`;

export async function reviewEntry(input: {
  title: string;
  understanding: string;
  citations: Citation[];
}): Promise<Review> {
  const res = await client().models.generateContent({
    model: GEMINI_MODEL,
    contents: `Topic: ${input.title}\n\nWhat I understood:\n"""\n${input.understanding}\n"""\n\nMy sources:\n${formatCitations(input.citations)}`,
    config: {
      systemInstruction: REVIEW_SYSTEM,
      responseMimeType: "application/json",
      responseJsonSchema: reviewSchema,
      temperature: 0.3,
    },
  });
  const review = JSON.parse(res.text ?? "{}") as Review;
  const clamp = (n: number) => Math.max(0, Math.min(10, Math.round(n * 10) / 10));
  review.overall = clamp(review.overall);
  review.scores = review.scores.map((s) => ({ ...s, score: clamp(s.score) }));
  review.tags = review.tags.map((t) => t.toLowerCase().trim()).filter(Boolean).slice(0, 5);
  return review;
}

// ---------- Write it in my voice ----------

export function composeStream(input: {
  title: string;
  understanding: string;
  citations: Citation[];
  review: Review | null;
  styleSamples: string;
  styleProfile: string;
}) {
  const corrections = input.review?.pushback.length
    ? input.review.pushback.map((p) => `- I wrote: "${p.quote}" → Correct: ${p.correction}`).join("\n")
    : "(none)";
  const gaps = input.review?.gaps.length ? input.review.gaps.map((g) => `- ${g}`).join("\n") : "(none)";

  const system = `You are ghost-writing a personal knowledge note for the author, in THEIR voice.
Rules:
- Write as the author, first person where natural. Match their tone, sentence length, vocabulary, and quirks from the style profile and samples. Do not sound like an AI: no "delve", no "in conclusion", no filler.
- Keep their ideas, analogies and structure where they are correct. Fix every error listed in corrections, silently and naturally.
- Weave in the listed gaps only briefly, where they genuinely help understanding.
- Never add facts you are not confident about. If sources are given, cite them inline as [1], [2] matching their numbers.
- Output clean Markdown: a short hook line, then sections with ## headings only if the note is long enough to need them, then a final "**In one line:**" summary. No title heading — the title is shown separately.`;

  const prompt = `## Style profile
${input.styleProfile || "(not set — infer from samples, otherwise write plainly and conversationally)"}

## Writing samples by the author
${input.styleSamples ? `"""\n${input.styleSamples.slice(0, 12000)}\n"""` : "(none)"}

## Topic
${input.title}

## My understanding (raw)
"""
${input.understanding}
"""

## Corrections to apply
${corrections}

## Gaps worth covering
${gaps}

## Sources
${formatCitations(input.citations)}

Write the note now.`;

  return client().models.generateContentStream({
    model: GEMINI_MODEL,
    contents: prompt,
    config: { systemInstruction: system, temperature: 0.7 },
  });
}

// ---------- Style analysis ----------

export async function analyzeStyle(samples: string): Promise<string> {
  const res = await client().models.generateContent({
    model: GEMINI_MODEL,
    contents: `Here are writing samples from one person:\n"""\n${samples.slice(0, 20000)}\n"""`,
    config: {
      systemInstruction: `Describe this person's writing style as a compact style guide another writer could follow to imitate them.
Cover: tone, sentence length and rhythm, vocabulary level, use of analogies/examples, structure habits, punctuation/formatting quirks, how they open and close.
Output 8-12 terse bullet points in Markdown. Quote 2-3 characteristic phrases. No preamble.`,
      temperature: 0.4,
    },
  });
  return res.text?.trim() ?? "";
}

// ---------- Ask your knowledge ----------

export async function answerFromNotes(input: {
  question: string;
  history: ChatTurn[];
  sources: (AskSource & { text: string })[];
  /** false when no note matched and `sources` are just the most recent notes. */
  matched: boolean;
}): Promise<string> {
  const context = input.sources.length
    ? input.sources
        .map((s) => `[${s.n}] "${s.title}" (written ${s.entryDate})\n${s.text}`)
        .join("\n\n---\n\n")
    : "(no matching notes)";
  const history = input.history
    .slice(-6)
    .map((t) => `${t.role === "user" ? "Me" : "You"}: ${t.content}`)
    .join("\n");

  const res = await client().models.generateContent({
    model: GEMINI_MODEL,
    contents: `${history ? `Conversation so far:\n${history}\n\n` : ""}${
      input.matched ? "My notes that matched the search" : "No notes matched the search. My most recent notes, for reference"
    }:\n${context}\n\nQuestion: ${input.question}`,
    config: {
      systemInstruction: `You answer questions using ONLY the user's own diary notes provided as numbered sources.
- Cite every claim with the source number in square brackets, like [1] or [2][3]. Put citations right after the sentence they support.
- If the notes do not cover the question, say so plainly ("You haven't written about that yet") and, if helpful, mention which related notes exist. Do not fill gaps from general knowledge unless you clearly label it as "Outside your notes:".
- Address the user as "you" ("You noted that…"). Be concise; use Markdown lists when it helps.`,
      temperature: 0.3,
    },
  });
  return res.text?.trim() ?? "";
}
