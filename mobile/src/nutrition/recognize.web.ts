import { DISH_CANDIDATES, type DishGuess } from "@/src/nutrition/recognize-labels";

export type { DishGuess };

const MODEL = "Xenova/clip-vit-base-patch32";

type Classifier = (image: string, labels: string[], options?: { hypothesis_template?: string }) => Promise<{ label: string; score: number }[]>;

let loading: Promise<Classifier> | null = null;

async function classifier() {
  if (!loading) {
    const loadFromCdn = new Function("url", "return import(url)") as (url: string) => Promise<{ pipeline: typeof import("@huggingface/transformers").pipeline; env: { allowLocalModels: boolean; useBrowserCache: boolean } }>;
    loading = loadFromCdn("https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1").then(async ({ pipeline, env }) => {
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      return pipeline("zero-shot-image-classification", MODEL, { dtype: "q8" }) as Promise<Classifier>;
    }).catch((error) => {
      loading = null;
      throw error;
    });
  }
  return loading;
}

function focusOnDish(uri: string) {
  return new Promise<string>((resolve) => {
    const image = new Image();
    image.onload = () => {
      const side = Math.min(image.width, image.height) * 0.62;
      const canvas = document.createElement("canvas");
      canvas.width = 224;
      canvas.height = 224;
      canvas.getContext("2d")?.drawImage(
        image,
        (image.width - side) / 2,
        (image.height - side) / 2,
        side,
        side,
        0,
        0,
        224,
        224,
      );
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    image.onerror = () => resolve(uri);
    image.src = uri;
  });
}

export async function recognizeDish(uri: string): Promise<DishGuess[]> {
  const run = await classifier();
  const focused = await focusOnDish(uri);
  const labels = DISH_CANDIDATES.map(([label]) => label);
  const ranked = await run(focused, labels, { hypothesis_template: "a photo of {}" });
  const byLabel = new Map(DISH_CANDIDATES);
  const guesses: DishGuess[] = [];
  for (const item of ranked) {
    const query = byLabel.get(item.label) || item.label;
    if (guesses.some((guess) => guess.query === query)) continue;
    guesses.push({ label: item.label, query, score: item.score });
    if (guesses.length === 3) break;
  }
  return guesses;
}
