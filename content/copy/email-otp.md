# OTP sign-in email

Owner: behavioral-product-specialist. Used by the Supabase Auth email template.
The code placeholder is literally `{{ .Token }}`. The email contains no links.

## English

**Subject:** Your DISCIPLINE sign-in code

**Body:**

```
Your sign-in code is:

{{ .Token }}

Enter it in DISCIPLINE to sign in. The code expires in 10 minutes.

If you didn't request this, you can ignore this email.

— DISCIPLINE
```

## Danish (da)

**Subject:** Din kode til at logge ind på DISCIPLINE

**Body:**

```
Din kode til at logge ind er:

{{ .Token }}

Skriv den i DISCIPLINE for at logge ind. Koden udløber om 10 minutter.

Hvis du ikke har bedt om den, kan du se bort fra denne e-mail.

— DISCIPLINE
```
