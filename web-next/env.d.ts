declare global {
  type KVNamespace = {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
    delete(key: string): Promise<void>;
  };

  interface CloudflareEnv {
    KV: KVNamespace;
  }
}

export {};
