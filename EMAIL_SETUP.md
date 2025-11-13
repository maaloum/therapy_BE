# Email Configuration Guide

## Current Setup

By default, the application uses **Ethereal Email** (fake SMTP) in development mode. This means emails are NOT actually sent - they're just logged in the console with preview URLs.

## To Send Real Emails

You need to configure SMTP settings in your `.env` file.

### Gmail SMTP Configuration

1. **Enable 2-Step Verification** on your Gmail account
2. **Generate an App Password**:

   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Copy the 16-character password

3. **Add to your `backend/.env` file**:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
SMTP_FROM=your-email@gmail.com

# Make sure NODE_ENV is set (or remove SMTP_HOST check)
NODE_ENV=development
```

### Other Email Providers

#### Outlook/Hotmail

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
SMTP_FROM=your-email@outlook.com
```

#### SendGrid

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM=noreply@yourdomain.com
```

#### Mailgun

```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-mailgun-username
SMTP_PASS=your-mailgun-password
SMTP_FROM=noreply@yourdomain.com
```

## Testing

After configuring SMTP:

1. Restart your backend server
2. Register a new account with an email address
3. Check your email inbox (and spam folder)

## Development Mode (Ethereal)

If you want to test without configuring SMTP, the app will use Ethereal Email. Check your console logs for preview URLs like:

```
Preview URL: https://ethereal.email/message/...
```

You can click these URLs to view the email in a browser.

## Troubleshooting

### Gmail "Less secure app" error

- Make sure you're using an **App Password**, not your regular Gmail password
- Enable 2-Step Verification first

### Connection timeout

- Check your firewall settings
- Verify SMTP_PORT (587 for TLS, 465 for SSL)
- Try SMTP_SECURE=true with port 465

### Authentication failed

- Double-check SMTP_USER and SMTP_PASS
- For Gmail, ensure you're using an App Password, not your account password
