# Crater Mythos V2 - AI Agent Handoff Guide

> **Purpose**: Instructions for any AI agent to maintain this codebase cleanly without creating patches or technical debt.

---

## Project Overview

**Crater Mythos** is a book reading platform built with:
- **Frontend**: React + TypeScript + Vite + Tailwind CSS v3
- **Backend**: Supabase (Auth, Database, Storage, Edge Functions)
- **Payments**: Stripe
- **Hosting**: Cloudflare Pages (production)

---

## Critical Principles

### 1. NO PATCH MIGRATIONS
**NEVER create a second migration to fix the first one.**

```
BAD:
supabase/migrations/
  20260209_initial.sql       <- creates tables
  20260210_fix_indexes.sql   <- adds missing indexes (PATCH!)
  20260211_add_enums.sql     <- converts to enums (PATCH!)

GOOD:
supabase/migrations/
  20260209_initial_schema.sql  <- everything correct from the start
```

If you need to add constraints, indexes, or enums - **modify the original migration** and run `npx supabase db reset`.

### 2. Build Right From The Start

When creating database tables, ALWAYS include:

```sql
-- ENUMS first (before tables that use them)
CREATE TYPE audio_type AS ENUM ('audiobook', 'soundtrack');

-- Table with constraints inline
CREATE TABLE book_audio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type audio_type NOT NULL,                          -- Use enum, not text
  price_cents integer NOT NULL DEFAULT 0 CHECK (price_cents >= 0),  -- CHECK inline
  ...
);

-- Indexes immediately after table
CREATE INDEX idx_book_audio_book_id ON book_audio(book_id);
```

### 3. TypeScript Types Must Match Database

After any schema change:
```bash
npx supabase gen types typescript --local 2>/dev/null > src/integrations/supabase/types.ts
```

Never commit code where TypeScript types don't match the database schema.

---

## Local Development Setup

### Start Local Environment
```bash
cd /Users/cognivicer/Projects/crater-mythos-v2

# Start Supabase (database, auth, storage)
npx supabase start

# Start dev server
npm run dev
```

### Access Points
| Service | URL |
|---------|-----|
| App | http://localhost:8080 |
| Supabase Studio | http://localhost:54323 |
| Supabase API | http://localhost:54321 |
| Mailpit (email testing) | http://localhost:54324 |

### Reset Database (Clean Slate)
```bash
npx supabase db reset --no-seed
```

---

## Schema Structure

**12 Tables** with proper constraints:

| Table | Purpose | Key Constraints |
|-------|---------|-----------------|
| profiles | User profiles | referral_credits >= 0 |
| user_roles | Admin/user roles | ENUM: admin, user |
| books | Book catalog | price_cents >= 0, preview_chapters >= 0 |
| chapters | Book chapters | chapter_order > 0, word_count >= 0 |
| book_audio | Audio tracks | ENUM: audiobook/soundtrack, duration > 0 |
| purchases | Book purchases | amount_cents >= 0 |
| audio_purchases | Audio purchases | amount_cents >= 0 |
| reading_progress | Reading state | progress 0-100, time >= 0 |
| bookmarks | User bookmarks | position >= 0 |
| highlights | Text highlights | end > start |
| referrals | Referral tracking | ENUM: pending/credited/expired |
| inquiries | Contact form | ENUM: unread/read/replied/resolved |

### Enum Types
```typescript
type AudioType = 'audiobook' | 'soundtrack';
type ReferralStatus = 'pending' | 'credited' | 'expired';
type InquiryStatus = 'unread' | 'read' | 'replied' | 'resolved';
type AppRole = 'admin' | 'user';
```

---

## Making Changes

### Adding a New Feature

1. **Plan the schema changes** - what tables/columns needed?
2. **Modify the single migration file** - never create a new one for fixes
3. **Reset and test**: `npx supabase db reset --no-seed`
4. **Regenerate types**: `npx supabase gen types typescript --local 2>/dev/null > src/integrations/supabase/types.ts`
5. **Update frontend code** to use new types
6. **Build and verify**: `npm run build`

### Adding a Database Column

```sql
-- In the EXISTING migration file, add to the table definition:
ALTER TABLE books ADD COLUMN IF NOT EXISTS new_column text;

-- Or better - modify the CREATE TABLE statement directly
CREATE TABLE books (
  ...
  new_column text,  -- Add here
  ...
);
```

### Adding an Index

```sql
-- Add immediately after the table in the migration:
CREATE INDEX idx_tablename_column ON tablename(column);
```

### Adding a CHECK Constraint

```sql
-- Inline with column definition:
price_cents integer NOT NULL DEFAULT 0 CHECK (price_cents >= 0)

-- Or named constraint for complex checks:
CONSTRAINT chk_valid_range CHECK (start_position < end_position)
```

---

## Common Tasks

### Grant Admin Role
```sql
-- In Supabase Studio SQL Editor:
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'admin@example.com';
```

### Check Linter Issues
```bash
npx supabase inspect db index-stats --local
```

### Deploy Edge Functions (Production)
```bash
npx supabase functions deploy --project-ref <project-ref>
```

---

## File Structure

```
crater-mythos-v2/
├── src/
│   ├── components/      # React components
│   ├── contexts/        # Auth context
│   ├── hooks/           # Custom hooks (useBooks, useAuth, etc.)
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts    # Supabase client
│   │       └── types.ts     # Auto-generated types
│   ├── lib/             # Utilities (offlineStorage, etc.)
│   └── pages/           # Route pages
├── supabase/
│   ├── config.toml      # Local config
│   ├── functions/       # Edge functions (8 total)
│   └── migrations/      # ONE CLEAN MIGRATION
└── rebuild-docs/        # Documentation from rebuild
```

---

## Future Feature Development

### The Two-Phase Reality

| Phase | Can Modify Existing Migrations? | Strategy |
|-------|--------------------------------|----------|
| **Pre-Production** | YES | Edit the single migration, reset, test |
| **Post-Production** | NO | Create ONE complete migration per feature |

### Pre-Production Workflow (Current State)

While the app is NOT yet deployed to production:

```
1. Need to add a "comments" feature?
   → Edit 20260209205223_initial_schema.sql directly
   → Add the table, indexes, constraints, RLS all at once
   → Run: npx supabase db reset --no-seed
   → Regenerate types
   → Build and test

2. Realize you forgot an index?
   → Edit the SAME migration file
   → Reset again
   → Never create a second file
```

### Post-Production Workflow (After First Deploy)

Once the migration has been applied to production, you CANNOT modify it. Instead:

```
1. Need to add a "comments" feature?
   → Create ONE new migration: 20260315_add_comments.sql
   → Include EVERYTHING in that single file:
     - CREATE TYPE (if needed)
     - CREATE TABLE with all constraints inline
     - CREATE INDEX (all of them)
     - RLS policies
   → Test locally with reset
   → Deploy to production

2. NEVER do this:
   20260315_add_comments.sql      <- creates table
   20260316_fix_comments_index.sql <- PATCH! BAD!
```

### Adding a Feature Checklist

```markdown
## Before Writing Code

1. [ ] Define the data model completely
   - What tables/columns?
   - What are the relationships (FKs)?
   - What values are valid (CHECK constraints)?
   - What should be an ENUM vs text?
   - Which columns need indexes?

2. [ ] Write the COMPLETE migration
   - ENUMs first
   - Tables with inline constraints
   - Indexes immediately after
   - RLS policies at the end

3. [ ] Test locally
   - npx supabase db reset --no-seed
   - Insert test data manually
   - Verify constraints reject bad data
   - Verify queries use indexes

4. [ ] Update frontend
   - Regenerate types
   - Add/modify hooks
   - Add/modify components
   - Build and verify
```

### Removing a Feature

```sql
-- Create a single migration for removal
-- File: 20260401_remove_comments.sql

-- Drop in reverse order of dependencies
DROP POLICY IF EXISTS "Users can view comments" ON public.comments;
DROP INDEX IF EXISTS idx_comments_user_id;
DROP INDEX IF EXISTS idx_comments_chapter_id;
DROP TABLE IF EXISTS public.comments;
DROP TYPE IF EXISTS public.comment_status;
```

Then:
1. Remove frontend code that references the feature
2. Regenerate types
3. Build and verify no TypeScript errors

### Modifying Existing Tables (Post-Production)

```sql
-- File: 20260401_add_rating_to_books.sql

-- Add column with constraint
ALTER TABLE public.books
ADD COLUMN rating numeric CHECK (rating >= 0 AND rating <= 5);

-- Add index if queried frequently
CREATE INDEX idx_books_rating ON public.books(rating) WHERE rating IS NOT NULL;
```

**Key Rule**: Each migration should be COMPLETE and SELF-CONTAINED. No follow-up patches.

### The "Complete Migration" Template

```sql
-- ============================================
-- [FEATURE NAME] - [DATE]
-- Single complete migration
-- ============================================

-- 1. ENUMS (if needed)
CREATE TYPE public.feature_status AS ENUM ('active', 'inactive', 'pending');

-- 2. TABLES (with inline constraints)
CREATE TABLE public.feature_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status feature_status NOT NULL DEFAULT 'pending',
  value integer NOT NULL CHECK (value >= 0),
  created_at timestamptz DEFAULT now()
);

-- 3. INDEXES (immediately after table)
CREATE INDEX idx_feature_items_user_id ON public.feature_items(user_id);
CREATE INDEX idx_feature_items_status ON public.feature_items(status);

-- 4. RLS
ALTER TABLE public.feature_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own items" ON public.feature_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own items" ON public.feature_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

## What NOT To Do

### Schema Anti-Patterns
1. **Don't create patch migrations** - modify the original (pre-prod) or make complete migrations (post-prod)
2. **Don't use `text` for status fields** - use ENUMs to prevent typos
3. **Don't skip CHECK constraints** - add them inline with column definition
4. **Don't forget indexes on FK columns** - add immediately after CREATE TABLE
5. **Don't add columns without considering nullability** - use NOT NULL with defaults

### Code Anti-Patterns
6. **Don't commit without running build** - `npm run build` must pass
7. **Don't use `any` types** - use generated types from Supabase
8. **Don't add features without updating types** - regenerate after schema changes
9. **Don't hardcode enum values** - import from types.ts Constants

### Development Anti-Patterns
10. **Don't rush migrations to production** - test locally with db reset first
11. **Don't deploy incomplete features** - all tables, indexes, RLS in one migration
12. **Don't modify production migrations** - they're immutable once deployed
13. **Don't skip the checklist** - use the feature checklist above

---

## Production Deployment Checklist

1. [ ] All types regenerated and matching schema
2. [ ] Build passes with no TypeScript errors
3. [ ] Single clean migration file
4. [ ] Environment variables set in Cloudflare Pages
5. [ ] Edge functions deployed to Supabase
6. [ ] RLS policies verified
7. [ ] Stripe webhooks configured

---

## Questions?

Check these files for context:
- `rebuild-docs/REBUILD_LOG.md` - Full rebuild history
- `supabase/migrations/*.sql` - Database schema
- `src/integrations/supabase/types.ts` - TypeScript types

---

*Last updated: 2026-02-10 by Claude Opus 4.5*
