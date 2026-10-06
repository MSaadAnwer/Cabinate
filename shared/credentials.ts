let readToken: () => Promise<string | undefined> = async () => undefined;
let rejectToken: (token?: string) => void = () => {};

export function configureCredentials(read: typeof readToken, reject: typeof rejectToken) {
  readToken = read;
  rejectToken = reject;
  return () => { readToken = async () => undefined; rejectToken = () => {}; };
}
export const accessToken = () => readToken();
export const credentialsRejected = (token?: string) => rejectToken(token);
