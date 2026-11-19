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

  /**
   * Fetches bank notification emails.
   * - Paginates through every page (no silent 40-message cap).
   * - `since` narrows the query with Gmail's `after:` operator (1 day overlap for safety).
   * - Persists refreshed OAuth tokens and flags the user when Google revokes access.
   */
  public async fetchBankEmails(userId: string, options: { maxResults?: number; since?: Date } = {}): Promise<{ emails: RawEmailData[]; failedCount: number }> {
    const maxResults = options.maxResults ?? 500;
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
    oauth2Client.on('tokens', tokens => {
      dbOps.updateUserTokens(userId, tokens);
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Query specifically for all supported Dominican Banks
    let query = 'from:(bpd.com.do OR popularenlinea.com OR bhd.com.do OR bhdleon.com.do OR promerica.com.do OR qik.com.do)';
    if (options.since && !isNaN(options.since.getTime())) {
      const afterSec = Math.floor(options.since.getTime() / 1000) - 24 * 3600;
      query += ` after:${afterSec}`;
    }

    const messages: { id?: string | null; threadId?: string | null }[] = [];
    let pageToken: string | undefined;
    try {
      do {
        const listRes = await gmail.users.messages.list({
          userId: 'me',
          q: query,
          maxResults: Math.min(100, maxResults - messages.length),
          pageToken
        });
        messages.push(...(listRes.data.messages || []));
        pageToken = listRes.data.nextPageToken || undefined;
      } while (pageToken && messages.length < maxResults);
    } catch (err: any) {
      if (this.isAuthRevoked(err)) {
        dbOps.setUserNeedsReconnect(userId, true);
        throw new Error('Google revocó el acceso a Gmail. Vuelve a conectar tu cuenta.');
      }
      throw err;
    }

    const results: RawEmailData[] = [];
    let failedCount = 0;
    const CONCURRENCY = 5;
    for (let i = 0; i < messages.length; i += CONCURRENCY) {
      const batch = messages.slice(i, i + CONCURRENCY).filter(msg => !!msg.id);
      const fetched = await Promise.all(batch.map(msg => this.fetchMessage(gmail, msg)));
      for (const email of fetched) {
        if (email) results.push(email);
        else failedCount++;
      }
    }

    // Callers must not advance the sync cursor when some messages could not be downloaded
    return { emails: results, failedCount };
  }

  private isAuthRevoked(err: any): boolean {
    const msg = `${err?.message || ''} ${err?.response?.data?.error || ''}`.toLowerCase();
    return msg.includes('invalid_grant') || err?.code === 401 || err?.response?.status === 401;
  }

  private decodeBody(data: string, headers: { name?: string | null; value?: string | null }[] | undefined): string {
    const buf = Buffer.from(data, 'base64');
    const contentType = headers?.find(h => h.name?.toLowerCase() === 'content-type')?.value || '';
    const charset = (/charset="?([^";\s]+)"?/i.exec(contentType)?.[1] || 'utf-8').toLowerCase();
    if (charset === 'iso-8859-1' || charset === 'latin1' || charset === 'windows-1252' || charset === 'us-ascii') {
      return buf.toString('latin1');
    }
    return buf.toString('utf-8');
  }

  private async fetchMessage(gmail: any, msg: { id?: string | null; threadId?: string | null }): Promise<RawEmailData | null> {
    if (!msg.id) return null;
    try {
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full'
      });

      const headers: { name?: string | null; value?: string | null }[] = detail.data.payload?.headers || [];
      const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '';
      const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value || '';
      const dateHeader = headers.find(h => h.name?.toLowerCase() === 'date')?.value || '';
      const snippet = detail.data.snippet || '';

      let bodyHtml = '';
      let bodyText = '';

      const parseParts = (parts: any[]) => {
        for (const part of parts) {
          if (part.mimeType === 'text/html' && part.body?.data) {
            bodyHtml += this.decodeBody(part.body.data, part.headers);
          } else if (part.mimeType === 'text/plain' && part.body?.data) {
            bodyText += this.decodeBody(part.body.data, part.headers);
          }
          if (part.parts) {
            parseParts(part.parts);
          }
        }
      };

      if (detail.data.payload?.parts) {
        parseParts(detail.data.payload.parts);
      } else if (detail.data.payload?.body?.data) {
        const bodyData = this.decodeBody(detail.data.payload.body.data, headers);
        if (detail.data.payload.mimeType === 'text/html') {
          bodyHtml = bodyData;
        } else {
          bodyText = bodyData;
        }
      }

      const parsedDate = dateHeader ? new Date(dateHeader) : new Date();
      return {
        id: msg.id,
        threadId: msg.threadId || undefined,
        from,
        subject,
        date: isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
        bodySnippet: snippet,
        bodyHtml,
        bodyText
      };
    } catch (err) {
      console.error(`Error fetching message details for ${msg.id}:`, err);
      return null;
    }
  }
}

export const gmailService = new GmailService();
