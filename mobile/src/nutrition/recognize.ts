import type { DishGuess } from "@/src/nutrition/recognize-labels";

export type { DishGuess };

export async function recognizeDish(_uri: string): Promise<DishGuess[]> {
  return [];
}
