const words: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  half: 0.5,
  quarter: 0.25,
};
const wordNumber = `(?:twenty|thirty|forty|fifty|sixty)(?:[ -](?:one|two|three|four|five|six|seven|eight|nine))?`;
const number = `(?:\\d+\\s+\\d+/\\d+|\\d+/\\d+|\\d+(?:\\.\\d+)?|${wordNumber}|${Object.keys(words).join("|")})`;
const amount = `(?:(?:a\\s+)?(?:half|quarter)(?:\\s+an?)?|${number}(?:\\s+and\\s+(?:a\\s+)?(?:half|quarter))?)`;
const units = "(?:hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s)";
const multiplier = (unit: string) =>
  /^h/.test(unit) ? 3600 : /^m/.test(unit) ? 60 : 1;

function numeric(raw: string): number {
  const value = raw.trim().replace(/\s+an?$/, "");
  if (value.includes(" and "))
    return value
      .split(" and ")
      .reduce((sum, part) => sum + numeric(part.replace(/^a /, "")), 0);
  if (/\d/.test(value)) {
    return value.split(/\s+/).reduce((total, part) => {
      const [numerator, denominator] = part.split("/").map(Number);
      return (
        total +
        (denominator === undefined ? numerator : numerator / denominator)
      );
    }, 0);
  }
  return value
    .split(/[ -]+/)
    .filter((word) => (word !== "and" && word !== "a") || value === "a")
    .reduce((total, word) => total + (words[word] || 0), 0);
}

export interface StepDuration {
  seconds: number;
  label: string;
}

/** One timer per duration; ranges use their lower bound and compound units add up. */
export function stepDurations(step: string): StepDuration[] {
  const text = step
    .toLowerCase()
    .replace(/[–—−]/g, "-")
    .replace(/(\d)½/g, "$1 1/2")
    .replace(/½/g, "1/2")
    .replace(/¼/g, "1/4")
    .replace(/¾/g, "3/4")
    .replace(
      new RegExp(`between (${amount})(\\s+${units})? and (${amount})`, "g"),
      "$1$2 to $3",
    );
  // The optional range accepts both "5-8 minutes" and "5 minutes to 8 minutes".
  const matcher = new RegExp(
    `\\b(${amount})(?:\\s*(${units})?\\s*(?:-|to|through)\\s*(${amount}))?\\s*-?\\s*(${units})\\b`,
    "g",
  );
  const chunks: {
    seconds: number;
    end: number;
    unit: number;
    range: boolean;
  }[] = [];
  for (const match of text.matchAll(matcher)) {
    const firstUnit = multiplier(match[2] || match[4]);
    const lastUnit = multiplier(match[4]);
    const first = numeric(match[1]) * firstUnit;
    const seconds = match[3]
      ? Math.min(first, numeric(match[3]) * lastUnit)
      : first;
    if (!Number.isFinite(seconds) || seconds <= 0) continue;
    const previous = chunks.at(-1);
    const connector = previous
      ? text.slice(previous.end, match.index).trim()
      : "";
    if (
      previous &&
      !previous.range &&
      !match[3] &&
      previous.unit > lastUnit &&
      /^(?:and)?$/.test(connector)
    ) {
      previous.seconds += seconds;
      previous.end = match.index + match[0].length;
      previous.unit = lastUnit;
    } else {
      chunks.push({
        seconds,
        end: match.index + match[0].length,
        unit: lastUnit,
        range: !!match[3],
      });
    }
  }
  return chunks.map(({ seconds }) => ({
    seconds: Math.max(1, Math.round(seconds)),
    label: durationLabel(Math.max(1, Math.round(seconds))),
  }));
}

export function durationLabel(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return [
    hours ? `${hours} hr` : "",
    minutes ? `${minutes} min` : "",
    remainder ? `${remainder} sec` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function remainingSeconds(endsAt: number, now = Date.now()): number {
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

export function countdown(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}`
    : `${minutes}:${rest}`;
}
