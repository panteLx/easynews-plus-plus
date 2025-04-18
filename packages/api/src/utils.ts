/**
 * Creates a Basic Authentication header value
 */
export function createBasic(username: string, password: string) {
  return `Basic ${btoa(`${username}:${password}`)}`;
}
