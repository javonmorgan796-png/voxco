// Stub for cloud-auth-js (not installed). Google OAuth requires installing @lovable.dev/cloud-auth-js.
export const lovable = {
  auth: {
    async signInWithOAuth(_provider: string, _opts?: { redirect_uri?: string; extraParams?: Record<string, string> }) {
      return { error: new Error("Social login not configured. Use email/password."), redirected: false };
    },
  },
};
