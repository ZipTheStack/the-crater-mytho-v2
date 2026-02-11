# Crater Mythos V2 - Rebuild Log

## Overview

Complete rebuild of Crater Mythos book reading platform from scratch with:
- Clean 12-table schema (vs 21 messy migrations in v1)
- MFA completely removed (user complaints)
- 34 unused UI components deleted
- All constraints, indexes, and enums built correctly from start

---

## Session 1: 2026-02-09 (Initial Rebuild)

### Completed Phases

**Phase 1: Preparation**
- Analyzed v1 codebase to identify what to keep/remove
- Documented schema changes needed
- Identified 8 essential edge functions to keep

**Phase 2: Create New Project**
- Created `/Users/cognivicer/Projects/crater-mythos-v2`
- Initialized with Vite + React + TypeScript
- Configured Tailwind CSS v3

**Phase 3: Copy Source Code**
- Copied 90+ source files
- Preserved component structure
- Kept all hooks, contexts, pages

**Phase 4: Clean Code (Remove MFA)**
- Removed all MFA components and logic
- Simplified auth flow to email/password only
- Removed MFA-related database triggers

**Phase 5: Create Database Schema**
- Created single clean migration with 12 tables
- Added all foreign keys and RLS policies
- Created storage buckets for covers and audio

**Phase 6: Copy Edge Functions**
- Copied 8 essential edge functions:
  - create-checkout-session
  - create-portal-session
  - handle-subscription-update
  - stripe-webhook
  - get-audio-url
  - parse-manuscript
  - send-inquiry-email
  - verify-purchase

**Phase 7: Configure Environment**
- Set up `.env.local` with Supabase keys
- Configured `supabase/config.toml`
- Verified local development setup

---

## Session 2: 2026-02-10 (Schema Hardening)

### Problem Identified
Supabase linter showing 15 performance recommendations - missing indexes on FK columns, text fields that should be enums.

### Solution: Merge Into Single Clean Migration
Instead of creating patch migrations (the old problem), we:

1. **Added ENUM types** (defined before tables)
   ```sql
   CREATE TYPE audio_type AS ENUM ('audiobook', 'soundtrack');
   CREATE TYPE referral_status AS ENUM ('pending', 'credited', 'expired');
   CREATE TYPE inquiry_status AS ENUM ('unread', 'read', 'replied', 'resolved');
   ```

2. **Added CHECK constraints inline**
   - `price_cents >= 0` on all price columns
   - `progress_percent BETWEEN 0 AND 100`
   - `chapter_order > 0`
   - `end_position > start_position` for highlights

3. **Added missing FK indexes**
   ```sql
   CREATE INDEX idx_book_audio_book_id ON book_audio(book_id);
   CREATE INDEX idx_reading_progress_chapter_id ON reading_progress(chapter_id);
   CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
   -- etc.
   ```

4. **Regenerated TypeScript types**
   ```bash
   npx supabase gen types typescript --local 2>/dev/null > src/integrations/supabase/types.ts
   ```

5. **Updated frontend code** to use proper enum types

### Result
- ONE migration file with everything correct
- Zero linter warnings for missing indexes
- Database rejects invalid data at insert time
- TypeScript types match database exactly

---

## Current State

| Item | Status |
|------|--------|
| Migration files | 1 (clean) |
| Tables | 12 |
| Edge functions | 8 |
| Build | Passing |
| TypeScript errors | 0 |
| MFA | Removed |

### Files Structure
```
crater-mythos-v2/
├── src/                     # React frontend
├── supabase/
│   ├── config.toml
│   ├── functions/           # 8 edge functions
│   └── migrations/
│       └── 20260209205223_initial_schema.sql  # ONE CLEAN FILE
├── rebuild-docs/
│   └── REBUILD_LOG.md       # This file
└── Prompt_Handoff.md        # AI agent instructions
```

---

## Next Steps (Phase 8+)

1. **Local Testing**
   - [ ] Register new user
   - [ ] Grant admin role
   - [ ] Test auth flows
   - [ ] Create test book with chapters
   - [ ] Test reader functionality

2. **Production Deployment**
   - [ ] Create Supabase cloud project
   - [ ] Run migration on production
   - [ ] Deploy edge functions
   - [ ] Configure Cloudflare Pages
   - [ ] Set up Stripe webhooks
   - [ ] DNS configuration

---

## Lessons Learned

1. **Never patch migrations** - modify the original and reset
2. **Use ENUMs** for status fields to prevent typos
3. **Add CHECK constraints** inline with column definitions
4. **Add indexes immediately** after CREATE TABLE
5. **Regenerate types** after any schema change
6. **Document everything** for future AI agents

---

*Log maintained by Claude Opus 4.5*
