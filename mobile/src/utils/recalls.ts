// Name-based hints only; official notices must confirm affected brands and lots.
function words(value: string): string[] {
  return (value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().match(/[a-z0-9]+/g) || []).map((word) =>
    word.length > 3 && word.endsWith("ies") ? word.slice(0, -3) + "y"
      : word.length > 3 && word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : word,
  );
}

export function potentialPantryMatches<T extends { name: string; quantity: number }>(
  notice: { title: string; description: string }, pantry: T[],
): T[] {
  const noticeWords = new Set(words(`${notice.title} ${notice.description}`));
  return pantry.filter((item) => {
    const nameWords = words(item.name);
    return item.quantity > 0 && nameWords.length > 0 &&
      nameWords.every((word) => noticeWords.has(word));
  });
}
