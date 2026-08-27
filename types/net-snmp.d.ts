declare module "net-snmp" {
  export const Version1: number;
  export const Version2c: number;
  export const Version3: number;
  export function createSession(
    target: string,
    community: string,
    options?: {
      port?: number;
      timeout?: number;
      retries?: number;
      version?: number;
    },
  ): {
    get: (
      oids: string[],
      callback: (error: Error | null, varbinds: Array<{ oid: string; type: number; value: unknown }>) => void,
    ) => void;
    close: () => void;
  };
  export function isVarbindError(varbind: unknown): boolean;
  export function varbindError(varbind: unknown): string;
}
