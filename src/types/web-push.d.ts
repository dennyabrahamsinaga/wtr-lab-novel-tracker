declare module "web-push" {
  type PushSubscription = {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };

  type VapidDetails = {
    subject: string;
    publicKey: string;
    privateKey: string;
  };

  interface WebPushError extends Error {
    statusCode?: number;
    headers?: Record<string, string>;
    body?: string;
  }

  interface SendResult {
    statusCode: number;
    headers: Record<string, string>;
    body?: string;
  }

  const webpush: {
    setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
    sendNotification(subscription: PushSubscription, payload?: string): Promise<SendResult>;
    WebPushError: new (...args: unknown[]) => WebPushError;
    generateVAPIDKeys(): VapidDetails;
  };

  export default webpush;
}

