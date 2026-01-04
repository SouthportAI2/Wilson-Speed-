
const Imap = require('imap');
const { simpleParser } = require('mailparser');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { yahooEmail, yahooAppPassword, n8nWebhookUrl } = req.body;

    if (!yahooEmail || !yahooAppPassword || !n8nWebhookUrl) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const imap = new Imap({
      user: yahooEmail,
      password: yahooAppPassword,
      host: 'imap.mail.yahoo.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    });

    const emails = [];
    
    await new Promise((resolve, reject) => {
      imap.once('ready', () => {
        imap.openBox('INBOX', false, (err, box) => {
          if (err) return reject(err);

          imap.search(['UNSEEN'], (err, results) => {
            if (err) return reject(err);
            if (!results || results.length === 0) {
              imap.end();
              return resolve();
            }

            const fetch = imap.fetch(results, { bodies: '' });

            fetch.on('message', (msg) => {
              msg.on('body', (stream) => {
                simpleParser(stream, async (err, parsed) => {
                  if (err) return;

                  const emailData = {
                    from: parsed.from?.text || 'Unknown',
                    subject: parsed.subject || 'No Subject',
                    text: parsed.text || parsed.html || '',
                    date: parsed.date || new Date().toISOString()
                  };

                  emails.push(emailData);

                  try {
                    await fetch(n8nWebhookUrl, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(emailData)
                    });
                  } catch (webhookError) {
                    console.error('Webhook error:', webhookError);
                  }
                });
              });
            });

            fetch.once('end', () => {
              imap.end();
              resolve();
            });

            fetch.once('error', reject);
          });
        });
      });

      imap.once('error', reject);
      imap.connect();
    });

    res.status(200).json({ 
      success: true, 
      processed: emails.length,
      message: `Processed ${emails.length} emails` 
    });

  } catch (error) {
    console.error('Email fetch error:', error);
    res.status(500).json({ error: error.message });
  }
}
