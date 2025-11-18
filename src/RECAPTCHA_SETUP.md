# reCAPTCHA Setup Guide

BizDizy includes **optional** Google reCAPTCHA v2 protection for signup and contact forms to prevent spam and abuse.

**Note:** reCAPTCHA is completely optional. The app will work perfectly fine without it. If you don't configure reCAPTCHA, the signup and contact forms will simply work without the verification step.

## Setup Steps (Optional)

### 1. Get reCAPTCHA Keys

1. Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Click **"+"** to create a new site
3. Fill in the form:
   - **Label**: BizDizy
   - **reCAPTCHA type**: Select **reCAPTCHA v2** → **"I'm not a robot" Checkbox**
   - **Domains**: Add your domain (e.g., `yourdomain.com`) and `localhost` for development
4. Click **Submit**
5. You'll receive two keys:
   - **Site Key** (public key - used in frontend)
   - **Secret Key** (private key - used in backend)

### 2. Configure Frontend

1. Create a `.env` file in the root of your project (or add to existing)
2. Add your Site Key:
   ```
   VITE_RECAPTCHA_SITE_KEY=your_site_key_here
   ```

### 3. Configure Backend (Already Done)

The backend is already configured to verify reCAPTCHA tokens using the `RECAPTCHA_SECRET_KEY` environment variable that was previously set up in your Supabase Edge Function.

If you need to update it:
1. Go to your Supabase project dashboard
2. Navigate to Edge Functions → Secrets
3. Update the `RECAPTCHA_SECRET_KEY` with your Secret Key

### 4. Test

1. **Development**: The reCAPTCHA widget should appear on:
   - Signup page
   - Contact form

2. **Submit forms**: Complete the "I'm not a robot" checkbox before submitting

3. **Verification**: The backend will automatically verify the token before processing:
   - Signup requests
   - Contact form submissions

## How It Works

1. **User submits form** → reCAPTCHA widget validates they're human
2. **Frontend collects token** → Sends to backend with form data
3. **Backend verifies token** → Validates with Google's API
4. **Success** → Form is processed
5. **Failure** → User sees error message

## Features Protected

✅ **Signup Form** - Prevents automated bot signups
✅ **Contact Form** - Blocks spam contact submissions

## Troubleshooting

### reCAPTCHA widget not showing
- Check that `VITE_RECAPTCHA_SITE_KEY` is set in `.env`
- Verify the key is correct
- Clear browser cache and reload

### "reCAPTCHA verification failed" error
- Ensure `RECAPTCHA_SECRET_KEY` is set in Supabase Edge Function secrets
- Verify the secret key matches your site key
- Check that your domain is whitelisted in reCAPTCHA admin console

### Testing in localhost
- Make sure to add `localhost` to your reCAPTCHA domain whitelist
- Use the test keys provided by Google for development (optional)

## Security Notes

- ✅ **Site Key** is safe to expose in frontend code
- ❌ **Secret Key** should NEVER be exposed - only stored in backend environment variables
- The verification happens server-side for maximum security
- reCAPTCHA tokens are single-use and expire after a short time

## Need Help?

- [Google reCAPTCHA Documentation](https://developers.google.com/recaptcha)
- [reCAPTCHA FAQ](https://developers.google.com/recaptcha/docs/faq)