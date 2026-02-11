# Inklare - Product Vision & Brand Guide

> **Inklare** (noun): An author's private digital sanctuary where their stories come to life.
> *From "Ink" (the author's craft) + "Lair" (a private domain)*

**Domain**: inklare.com (owned)

---

## Product Overview

Inklare is a white-label publishing platform that gives authors complete control over their books, readers, and revenue. Each author gets their own Inklare instance - a dedicated app where readers experience their work.

### The Core Promise

**"Your story. Your Inklare."**

- Own your audience (not Amazon's, not a publisher's)
- Keep ~97% of revenue (vs 30-70% platform cuts)
- Built-in viral marketing (referral system)
- Premium immersive reading experience
- Complete creative and business control

---

## Target Customer

**Primary**: Independent authors who want to:
- Escape Amazon/Kindle dependency
- Build direct reader relationships
- Maximize revenue from their work
- Create premium reading experiences
- Own their platform and data

**Secondary**:
- Small publishers with 1-5 authors
- Serialized fiction writers
- Audiobook creators
- Authors with existing audiences (email lists, social following)

---

## Current Features (V2)

### Reader Experience
- [ ] Immersive animated entry (customizable "front door")
- [ ] Chapter-by-chapter reading
- [ ] Progress tracking (%, time spent)
- [ ] Bookmarks with notes
- [ ] Text highlighting with colors
- [ ] Offline reading support
- [ ] Swipe navigation
- [ ] Reading settings customization

### Audio/Multimedia
- [ ] Audiobook tracks
- [ ] Soundtrack/ambient music
- [ ] Per-track pricing
- [ ] Audio player controls

### Monetization
- [ ] Stripe integration (~97% revenue kept)
- [ ] Individual book purchases
- [ ] Individual audio purchases
- [ ] Flexible pricing control
- [ ] Customer billing portal

### Author Tools (Admin)
- [ ] Book & chapter management
- [ ] Reader directory
- [ ] Purchase history
- [ ] Reading analytics
- [ ] Inquiry management

### Growth
- [ ] Referral system with unique codes
- [ ] Credit/reward tracking
- [ ] Viral sharing mechanics

### Security
- [ ] Email/password auth
- [ ] Row Level Security
- [ ] Content protection
- [ ] Session management

---

## Future Roadmap

### Phase 1: Analytics & Marketing
- Reading heatmaps
- Drop-off analysis
- Email campaigns
- Discount codes
- Launch tools

### Phase 2: Serial Publishing
- Scheduled chapter releases
- Drip content
- "Next chapter" notifications
- Pre-order system

### Phase 3: White-Label Customization
- Custom themes/colors
- Custom branding
- Custom domain support
- Custom email templates

### Phase 4: Community
- Reader reviews
- Chapter discussions
- Author Q&A
- Reading clubs

### Phase 5: Multi-Format
- EPUB export
- PDF generation
- Print-on-demand integration

### Phase 6: AI Features
- Chapter summaries
- Character glossary
- "Previously on..." recaps

---

## Competitive Positioning

| Feature | Amazon Kindle | Gumroad | Patreon | **Inklare** |
|---------|---------------|---------|---------|-------------|
| Revenue kept | 30-70% | 90% | 88-95% | **~97%** |
| Own your audience | No | Partial | Yes | **Yes** |
| Immersive experience | No | No | No | **Yes** |
| Built-in virality | No | No | No | **Yes** |
| Reading analytics | Limited | No | No | **Yes** |
| Audio support | Separate (Audible) | Files only | Files only | **Integrated** |
| One author focus | No (marketplace) | No (marketplace) | Yes | **Yes** |
| Custom branding | No | Limited | Limited | **Full** |

---

## Brand Guidelines

### Name
- **Full**: Inklare
- **Usage**: "Build your Inklare" / "Welcome to [Author]'s Inklare"
- **Never**: "Ink Lare" or "Ink-Lare" (always one word)

### Taglines
- "Your story. Your Inklare."
- "Where authors own their kingdom"
- "From your mind to your Inklare"
- "Build your Inklare"

### Voice & Tone
- **Empowering**: Authors are in control
- **Premium**: This is not cheap ebooks
- **Direct**: Cut the middleman
- **Creative**: Celebrate the craft of writing

### Visual Direction (TBD)
- Elegant, not cluttered
- Dark mode friendly (authors write at night)
- Ink/quill motifs subtle, not cliché
- Clean typography (reading-focused)

---

## Technical Architecture

### Current Stack
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (Auth, Database, Storage, Edge Functions)
- **Payments**: Stripe
- **Hosting**: Cloudflare Pages

### White-Label Strategy
1. Complete crater-mythos-v2 as reference implementation
2. Extract configurable elements (branding, assets, copy)
3. Create setup wizard for new instances
4. Document deployment process
5. Build admin panel for multi-instance management (optional SaaS model)

---

## Business Models (Future)

### Option A: One-Time License
- Author pays once for their Inklare instance
- They handle their own hosting
- We provide updates/support

### Option B: SaaS
- Monthly subscription
- We host and manage
- Tiered pricing by features/readers

### Option C: Revenue Share
- Free to start
- Small percentage of transactions
- Scales with author success

---

## Files & Resources

| Resource | Location |
|----------|----------|
| V2 Codebase | `/Users/cognivicer/Projects/crater-mythos-v2` |
| GitHub Repo | https://github.com/ZipTheStack/the-crater-mytho-v2 |
| Schema | `supabase/migrations/20260209205223_initial_schema.sql` |
| Types | `src/integrations/supabase/types.ts` |
| Dev Guide | `Prompt_Handoff.md` |
| Rebuild Log | `rebuild-docs/REBUILD_LOG.md` |

---

*Last updated: 2026-02-10*
*Document maintained for Inklare product development*
