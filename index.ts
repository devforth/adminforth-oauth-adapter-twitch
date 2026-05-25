import type { OAuth2Adapter } from "adminforth";

type OAuth2UserInfoLocal = {
  email: string;
  provider?: string;
  subject?: string;
  phone?: string;
  meta?: Record<string, any>;
  fullName?: string;
  profilePictureUrl?: string | null;
  externalUserId?: string | number | null;
};
export default class AdminForthAdapterTwitchOauth2 implements OAuth2Adapter {
  private clientID: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor(options: {
    clientID: string;
    clientSecret: string;
    redirectUri: string;
  }) {
    this.clientID = options.clientID;
    this.clientSecret = options.clientSecret;
    this.redirectUri = options.redirectUri;
  }

  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientID,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'user:read:email',
      force_verify: 'true'
    });
    return `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
  }

  async getTokenFromCode(code: string, redirect_uri: string): Promise<OAuth2UserInfoLocal> {
    const tokenRes = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: this.clientID,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error('Token error:', tokenData);
      throw new Error(tokenData.error_description || tokenData.error);
    }

    const accessToken = tokenData.access_token;

    const userRes = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-Id': this.clientID
      }
    });

    const userData = await userRes.json();
    const user = userData.data?.[0];

    if (!user || !user.email) {
      throw new Error("Failed to get user email from Twitch");
    }

    return {
      provider: this.constructor.name,
      subject: user.id,
      email: user.email,
      profilePictureUrl: user.profile_image_url,
      fullName: user.display_name
    };
  }

  getName(): string {
    return 'Twitch';
  }

  getIcon(): string {
    return `<?xml version="1.0" encoding="utf-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    <path fill="#9146FF" d="M80 0L32 96v352h128v64h64l64-64h96l128-128V0H80zm368 288l-64 64H272l-64 64v-64H96V32h352v256z"/>
    <path fill="#9146FF" d="M320 128v96h32v-96h-32zm-80 0v96h32v-96h-32z"/>
  </svg>`;
  }

}
