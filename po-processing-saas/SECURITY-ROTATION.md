# Security: Key Rotation Required

All secrets listed below were previously exposed and MUST be rotated immediately.
After rotation, update your `.env.local` with the new values.

## Keys to Rotate

### 1. MISTRAL_API_KEY
- **Where to rotate**: https://console.mistral.ai/api-keys
- **Steps**: Create new API key, delete old one, update .env.local

### 2. SUPABASE_SERVICE_ROLE_KEY
- **Where to rotate**: Supabase Dashboard > Settings > API
- **Steps**: Generate new service role key, update .env.local
- **Note**: This key has full database access bypassing RLS. Treat with extreme care.

### 3. SUPABASE_ACCESS_TOKEN
- **Where to rotate**: Supabase Dashboard > Account > Access Tokens
- **Steps**: Revoke old token, create new personal access token, update .env.local

### 4. STRIPE_SECRET_KEY
- **Where to rotate**: https://dashboard.stripe.com/apikeys
- **Steps**: Roll the secret key (Stripe supports rolling without downtime), update .env.local
- **CRITICAL**: This is a LIVE key (sk_live_). Rotate with care to avoid billing disruption.

### 5. STRIPE_WEBHOOK_SECRET
- **Where to rotate**: Stripe Dashboard > Developers > Webhooks
- **Steps**: Create new webhook endpoint or reveal/rotate the signing secret, update .env.local

### 6. NEXT_PUBLIC_SUPABASE_ANON_KEY
- **Where to rotate**: Supabase Dashboard > Settings > API
- **Note**: This is a public key with RLS restrictions. Lower risk but should still be rotated since it was in the same exposed file.

## After Rotation Checklist

- [ ] All old keys revoked/deleted
- [ ] New keys tested locally (`npm run dev`)
- [ ] New keys deployed to production environment variables
- [ ] Verify production is working after deploy
- [ ] Check Stripe webhook delivery is succeeding
- [ ] Check Supabase connections are working
- [ ] Check Mistral API calls succeed
