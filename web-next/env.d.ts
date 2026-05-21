declare global {
  type KVNamespace = {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
    delete(key: string): Promise<void>;
    list?(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{ keys: Array<{ name: string }>; list_complete: boolean; cursor?: string }>;
  };

  interface CloudflareEnv {
    KV: KVNamespace;
  }
}

export {};
