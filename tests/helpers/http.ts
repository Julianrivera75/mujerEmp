export function request(
  path: string,
  init: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
) {
  const { method = 'GET', body, headers = {} } = init;
  return new Request(`http://localhost${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export async function read(res: Response) {
  const text = await res.text();
  try {
    return { status: res.status, body: JSON.parse(text) as Record<string, any>, raw: text };
  } catch {
    return { status: res.status, body: {} as Record<string, any>, raw: text };
  }
}
