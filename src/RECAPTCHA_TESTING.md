# reCAPTCHA Testing Guide

## ✅ Configuration Complete

Your reCAPTCHA site key has been configured:
```
Site Key: 6LcAvfsrAAAAALjc4K9rlpcw2SWV7q0w4UaYEBqF
```

## 🧪 How to Test

### 1. Start the Development Server
```bash
npm run dev
```

### 2. Test Signup Form
1. Navigate to the Signup page (click "Get Started" or "Sign Up")
2. You should see the reCAPTCHA checkbox appear at the bottom of the form
3. Fill out the form fields
4. Check the "I'm not a robot" box
5. Click "Create Account"
6. ✅ **Expected**: Signup should work after completing reCAPTCHA

### 3. Test Contact Form
1. Navigate to the Contact page (click "Contact" in footer or navbar)
2. You should see the reCAPTCHA checkbox appear at the bottom of the form
3. Fill out the contact form
4. Check the "I'm not a robot" box
5. Click "Send Message"
6. ✅ **Expected**: Message should be sent after completing reCAPTCHA

## 🔧 Troubleshooting

### reCAPTCHA widget not showing
**Problem**: The checkbox doesn't appear on the forms

**Solutions**:
1. **Hard refresh** the page (Ctrl+Shift+R or Cmd+Shift+R)
2. **Clear browser cache** and reload
3. **Restart the dev server**:
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```
4. **Check browser console** for any errors

### "Please complete the reCAPTCHA verification" error
**Problem**: Form submission fails even after checking the box

**Solutions**:
1. **Wait 2-3 seconds** after page load before submitting
2. **Ensure** you clicked the reCAPTCHA checkbox
3. **Try again** - sometimes the token expires
4. **Check** that the green checkmark appears in the reCAPTCHA box

### "reCAPTCHA verification failed" error
**Problem**: Backend rejects the token

**Solutions**:
1. **Verify Secret Key** is configured in Supabase:
   - Go to Supabase Dashboard
   - Navigate to Edge Functions → Secrets
   - Ensure `RECAPTCHA_SECRET_KEY` is set
   - It should match your reCAPTCHA secret key (the one you got with the site key)

2. **Check domain whitelist**:
   - Go to https://www.google.com/recaptcha/admin
   - Click on your site
   - Under "Domains", ensure `localhost` is listed for development

3. **Check the backend logs**:
   - Go to Supabase Dashboard → Edge Functions → Logs
   - Look for reCAPTCHA verification errors

### reCAPTCHA loads but shows "Invalid site key"
**Problem**: The site key is incorrect or doesn't match the domain

**Solutions**:
1. **Verify the site key** in `.env` matches your Google reCAPTCHA console
2. **Check domain settings** in reCAPTCHA console - make sure `localhost` is added
3. **Create a new reCAPTCHA v2 site** if needed (make sure to select "I'm not a robot" Checkbox)

## ✨ What Should Happen

### With reCAPTCHA Configured (Current Setup)
- ✅ reCAPTCHA checkbox appears on signup and contact forms
- ✅ Users must complete verification before submitting
- ✅ Backend validates the token
- ✅ Forms are protected from bots

### Without reCAPTCHA (If you remove the site key)
- ✅ No reCAPTCHA checkbox appears
- ✅ Forms work normally without verification
- ✅ No spam protection

## 🔑 Important Notes

1. **Secret Key Required**: You must also configure `RECAPTCHA_SECRET_KEY` in Supabase Edge Function secrets (you should have been prompted for this)

2. **Domain Whitelist**: For production, add your actual domain to the reCAPTCHA console

3. **Token Expiration**: reCAPTCHA tokens expire after ~2 minutes of inactivity

4. **Single-Use Tokens**: Each token can only be verified once

## 📝 Next Steps

1. ✅ **Test signup** with reCAPTCHA
2. ✅ **Test contact form** with reCAPTCHA
3. ✅ **Verify backend validation** is working
4. 🚀 **Deploy** - reCAPTCHA will work in production too!

## 🎉 You're All Set!

Your BizDizy app now has reCAPTCHA protection against spam and bots!
