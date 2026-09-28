import { format } from 'date-fns';
import { logger } from './logger';

export interface RosterEmailParams {
  recipientEmail: string;
  recipientName: string;
  assignedRole: string;
  notes?: string;
  playlistTitle: string;
  serviceDate?: Date | string | null;
  playlistUrl: string;
  songs: { title: string; key?: string | null; leadSinger?: string | null }[];
}

export class EmailService {
  private static readonly API_URL = 'https://api.brevo.com/v3/smtp/email';
  
  private static get apiKey() {
    return process.env.BREVO_API_KEY;
  }
  
  private static get senderEmail() {
    return process.env.BREVO_SENDER_EMAIL || 'notifications@choirsync.app';
  }
  
  private static get senderName() {
    return process.env.BREVO_SENDER_NAME || 'ChoirSync';
  }

  static async sendRosterAssignmentEmail(params: RosterEmailParams): Promise<{ sent: boolean; reason?: string }> {
    if (!this.apiKey) {
      logger.warn('BREVO_API_KEY not set. Skipping email dispatch.');
      return { sent: false, reason: 'missing_api_key' };
    }

    const {
      recipientEmail,
      recipientName,
      assignedRole,
      notes,
      playlistTitle,
      serviceDate,
      playlistUrl,
      songs
    } = params;

    const dateStr = serviceDate ? format(new Date(serviceDate), 'MMMM d, yyyy') : 'Upcoming Service';
    const safeName = recipientName || recipientEmail.split('@')[0];

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 32px; border-radius: 8px; margin-top: 32px; margin-bottom: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 32px; }
          .header h1 { color: #4f46e5; margin: 0; font-size: 24px; }
          .title-block { border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 24px; }
          .title-block h2 { margin: 0 0 8px 0; font-size: 20px; }
          .title-block p { margin: 0; color: #6b7280; font-size: 14px; }
          .badge { display: inline-block; padding: 6px 12px; background-color: #e0e7ff; color: #4338ca; border-radius: 9999px; font-weight: 600; font-size: 14px; margin-bottom: 16px; }
          .notes { background-color: #fef3c7; color: #92400e; padding: 12px; border-left: 4px solid #f59e0b; border-radius: 4px; margin-bottom: 24px; font-size: 14px; }
          .songs { margin-bottom: 32px; }
          .song-item { padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
          .song-title { font-weight: 600; font-size: 16px; margin: 0 0 4px 0; }
          .song-meta { color: #6b7280; font-size: 13px; margin: 0; }
          .button-container { text-align: center; margin-top: 32px; }
          .button { display: inline-block; background-color: #4f46e5; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>ChoirSync</h1>
          </div>
          <p>Hi ${safeName},</p>
          <p>You have been scheduled for an upcoming service.</p>
          
          <div class="title-block">
            <h2>${playlistTitle}</h2>
            <p>${dateStr}</p>
          </div>
          
          <div class="badge">Assigned Part: ${assignedRole.toUpperCase()}</div>
          
          ${notes ? `<div class="notes"><strong>Director's Note:</strong> ${notes}</div>` : ''}
          
          <div class="songs">
            <h3>Setlist</h3>
            ${songs.length > 0 ? songs.map((song, i) => `
              <div class="song-item">
                <p class="song-title">${i + 1}. ${song.title}</p>
                <p class="song-meta">
                  ${song.key ? `Key: ${song.key}` : 'Key: TBD'} 
                  ${song.leadSinger ? `&nbsp;|&nbsp; Lead: ${song.leadSinger}` : ''}
                </p>
              </div>
            `).join('') : '<p style="color: #6b7280; font-style: italic;">No songs added yet.</p>'}
          </div>
          
          <div class="button-container">
            <a href="${playlistUrl}" class="button">Open Rehearsal Setlist</a>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': this.apiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: this.senderName, email: this.senderEmail },
          to: [{ email: recipientEmail, name: safeName }],
          subject: `🎵 Choir Roster: You're scheduled for ${playlistTitle}`,
          htmlContent
        })
      });

      if (!response.ok) {
        const err = await response.text();
        logger.error(`Brevo API error (${response.status}): ${err}`);
        return { sent: false, reason: 'api_error' };
      }

      return { sent: true };
    } catch (error: any) {
      logger.error('Failed to dispatch email via Brevo', error);
      return { sent: false, reason: 'network_error' };
    }
  }
}
