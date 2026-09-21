export const getFunctions = () => ({});
export const httpsCallable = (_f: unknown, name: string) => (data?: unknown) => (window as unknown as { __sim: { server: { callable: (n: string) => (d?: unknown) => Promise<unknown> } } }).__sim.server.callable(name)(data);
