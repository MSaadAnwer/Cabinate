/** Bounds an asynchronous provider call. Callers must ignore results from expired sessions. */
export async function withDeadline<T>(task: Promise<T>, milliseconds = 15000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([task, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Sign-in service took too long to respond.")), milliseconds);
    })]);
  } finally { clearTimeout(timer); }
}
