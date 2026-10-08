// Distinguish React echoes of typing from intentional replacements. An older
// echo must never overwrite newer native text or move its selection.
export function createInputText(initial: string) {
  let text = initial;
  let prop = initial;
  let echoes: string[] = [];
  return {
    type(next: string) {
      text = next;
      echoes.push(next);
    },
    receive(next: string): string | undefined {
      const echo = echoes.lastIndexOf(next);
      if (echo !== -1) {
        echoes = echoes.slice(echo + 1);
        prop = next;
        return;
      }
      if (next === prop) return;
      prop = next;
      echoes = [];
      if (next === text) return;
      text = next;
      return next;
    },
  };
}
