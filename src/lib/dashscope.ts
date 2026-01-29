import { env } from "./env";

export type WordEntry = {
  word: string;
  meaning: string;
};

const callDashscope = async (payload: Record<string, unknown>) => {
  const response = await fetch(`${env.dashscopeBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.dashscopeApiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DashScope error: ${response.status} ${text}`);
  }

  return response.json() as Promise<{ choices: Array<{ message: { content: string } }> }>;
};

const extractJsonArray = (content: string) => {
  const start = content.indexOf("[");
  const end = content.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model output did not contain JSON array.");
  }
  const slice = content.slice(start, end + 1);
  return JSON.parse(slice) as WordEntry[];
};

const normalizeEntries = (entries: WordEntry[]) =>
  entries
    .map((entry) => ({
      word: entry.word?.trim() ?? "",
      meaning: entry.meaning?.trim() ?? "",
    }))
    .filter((entry) => entry.word.length > 0);

export const extractWordsFromImage = async (dataUrl: string) => {
  const visionPrompt =
    "Extract all English words or phrases from the image. If Chinese translations are visible, include them. Return ONLY a JSON array of objects with keys word and meaning.";

  const visionResult = await callDashscope({
    model: env.qwenVisionModel,
    temperature: 0.1,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: visionPrompt },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  });

  const rawVision = visionResult.choices[0]?.message?.content ?? "";
  const visionEntries = normalizeEntries(extractJsonArray(rawVision));

  return normalizeWithTurbo(visionEntries);
};

export const normalizeWithTurbo = async (entries: WordEntry[]) => {
  if (entries.length === 0) {
    return [] as WordEntry[];
  }

  const prompt =
    "You will receive a JSON array of items with keys word and meaning. Remove duplicates (case-insensitive), keep the original word casing, and fill in missing Chinese meanings with concise translations. Return ONLY the cleaned JSON array.";

  const turboResult = await callDashscope({
    model: env.qwenTextModel,
    temperature: 0.2,
    messages: [
      {
        role: "user",
        content: `${prompt}\n\n${JSON.stringify(entries)}`,
      },
    ],
  });

  const rawTurbo = turboResult.choices[0]?.message?.content ?? "";
  return normalizeEntries(extractJsonArray(rawTurbo));
};

export const normalizeFromText = async (input: string) => {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return [] as WordEntry[];
  }

  const entries = lines.map((word) => ({ word, meaning: "" }));
  return normalizeWithTurbo(entries);
};
