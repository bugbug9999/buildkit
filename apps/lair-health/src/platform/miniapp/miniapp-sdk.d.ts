declare module '@bug4city/miniapp-sdk' {
  export class LairMiniAppClient {
    ready(): Promise<void>;
    auth: {
      getInitData(): Record<string, unknown> | null;
      requestTokenRefresh(): Promise<Record<string, unknown>>;
    };
  }
}
