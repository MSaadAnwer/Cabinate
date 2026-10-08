type Credentials = {
  read: () => Promise<string | undefined>;
  reject: (token?: string) => void;
};

const anonymous: Credentials = { read: async () => undefined, reject: () => {} };
let credentials = anonymous;

export function configureCredentials(read: Credentials["read"], reject: Credentials["reject"]) {
  const configured = { read, reject };
  credentials = configured;
  return () => {
    // An old provider's cleanup must not disconnect a newer account.
    if (credentials === configured) credentials = anonymous;
  };
}

export async function accessToken() {
  const configured = credentials;
  const token = await configured.read();
  if (credentials !== configured) throw new Error("Your session changed. Please sign in again.");
  return token;
}

export const credentialsRejected = (token?: string) => credentials.reject(token);
