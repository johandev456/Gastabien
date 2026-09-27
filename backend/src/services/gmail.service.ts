import { google } from 'googleapis';
import { CONFIG } from '../config';
import { RawEmailData } from '../types';
import { dbOps } from '../database/db';

export class GmailService {
  private getOAuthClient() {
    return new google.auth.OAuth2(
      CONFIG.GOOGLE.CLIENT_ID,
      CONFIG.GOOGLE.CLIENT_SECRET,
      CONFIG.GOOGLE.REDIRECT_URI
    );
  }

  public getAuthUrl(userId: string): string {
    const oauth2Client = this.getOAuthClient();
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      state: userId
    });
  }

  public async handleAuthCallback(code: string, userId: string) {
    const oauth2Client = this.getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    const email = userInfo.data.email || 'user@gmail.com';
    const name = userInfo.data.name || 'Usuario Gmail';

    const savedId = dbOps.upsertUser({
      id: userId,
      email,
      name,
      refresh_token: tokens.refresh_token || undefined,
      access_token: tokens.access_token || undefined,
      token_expiry: tokens.expiry_date || undefined
    });

    return { userId: savedId, email, name };
  }

  public async fetchBankEmails(userId: string, maxResults: number = 30): Promise<RawEmailData[]> {
    const user = dbOps.getUser(userId);
    if (!user || (!user.google_refresh_token && !user.google_access_token)) {
      throw new Error('Usuario no ha conectado su cuenta de Gmail.');
    }

    const oauth2Client = this.getOAuthClient();
    oauth2Client.setCredentials({
      refresh_token: user.google_refresh_token,
      access_token: user.google_access_token,
      expiry_date: user.token_expiry
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Query specifically for all supported Dominican Banks
    const query = 'from:(bpd.com.do OR popularenlinea.com OR bhd.com.do OR bhdleon.com.do OR promerica.com.do OR qik.com.do)';

    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults
    });

    const messages = listRes.data.messages || [];
    const results: RawEmailData[] = [];

    for (const msg of messages) {
      if (!msg.id) continue;
      try {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full'
        });

        const headers = detail.data.payload?.headers || [];
        const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '';
        const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value || '';
        const dateHeader = headers.find(h => h.name?.toLowerCase() === 'date')?.value || '';
        const snippet = detail.data.snippet || '';

        // Extract body html / text
        let bodyHtml = '';
        let bodyText = '';

        const parseParts = (parts: any[]) => {
          for (const part of parts) {
            if (part.mimeType === 'text/html' && part.body?.data) {
              bodyHtml += Buffer.from(part.body.data, 'base64').toString('utf-8');
            } else if (part.mimeType === 'text/plain' && part.body?.data) {
              bodyText += Buffer.from(part.body.data, 'base64').toString('utf-8');
            }
            if (part.parts) {
              parseParts(part.parts);
            }
          }
        };

        if (detail.data.payload?.parts) {
          parseParts(detail.data.payload.parts);
        } else if (detail.data.payload?.body?.data) {
          const bodyData = Buffer.from(detail.data.payload.body.data, 'base64').toString('utf-8');
          if (detail.data.payload.mimeType === 'text/html') {
            bodyHtml = bodyData;
          } else {
            bodyText = bodyData;
          }
        }

        results.push({
          id: msg.id,
          threadId: msg.threadId || undefined,
          from,
          subject,
          date: dateHeader ? new Date(dateHeader) : new Date(),
          bodySnippet: snippet,
          bodyHtml,
          bodyText
        });
      } catch (err) {
        console.error(`Error fetching message details for ${msg.id}:`, err);
      }
    }

    return results;
  }
}

export const gmailService = new GmailService();
