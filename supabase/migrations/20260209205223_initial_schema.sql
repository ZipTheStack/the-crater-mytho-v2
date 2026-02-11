-- ============================================
-- CRATER MYTHOS V2 - COMPLETE SCHEMA
-- Single clean migration with all constraints
-- ============================================

-- ============================================
-- ENUM TYPES (defined first, used in tables)
-- ============================================

CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.audio_type AS ENUM ('audiobook', 'soundtrack');
CREATE TYPE public.referral_status AS ENUM ('pending', 'credited', 'expired');
CREATE TYPE public.inquiry_status AS ENUM ('unread', 'read', 'replied', 'resolved');

-- ============================================
-- 1. PROFILES
-- ============================================

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email text NOT NULL,
  name text,
  avatar_url text,
  bio text,
  stripe_customer_id text,
  referral_code text UNIQUE,
  referral_credits integer NOT NULL DEFAULT 0 CHECK (referral_credits >= 0),
  referred_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_referred_by ON public.profiles(referred_by) WHERE referred_by IS NOT NULL;

-- ============================================
-- 2. USER ROLES
-- ============================================

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- ============================================
-- 3. BOOKS
-- ============================================

CREATE TABLE public.books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  author text NOT NULL,
  description text,
  cover_url text,
  price_cents integer NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  preview_chapters integer NOT NULL DEFAULT 3 CHECK (preview_chapters >= 0),
  is_published boolean DEFAULT false,
  published_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_books_published ON public.books(is_published, published_at DESC);
CREATE INDEX idx_books_title ON public.books(title);

-- ============================================
-- 4. CHAPTERS
-- ============================================

CREATE TABLE public.chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text,
  chapter_order integer NOT NULL CHECK (chapter_order > 0),
  is_preview boolean DEFAULT false,
  word_count integer CHECK (word_count IS NULL OR word_count >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_chapters_book_order ON public.chapters(book_id, chapter_order);
CREATE INDEX idx_chapters_book_id ON public.chapters(book_id);

-- ============================================
-- 5. BOOK AUDIO
-- ============================================

CREATE TABLE public.book_audio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  type audio_type NOT NULL,
  file_url text NOT NULL,
  duration_seconds integer CHECK (duration_seconds IS NULL OR duration_seconds > 0),
  price_cents integer NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  is_enabled boolean DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_book_audio_book_id ON public.book_audio(book_id);

-- ============================================
-- 6. PURCHASES
-- ============================================

CREATE TABLE public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  book_id uuid REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  stripe_payment_id text,
  amount_cents integer CHECK (amount_cents IS NULL OR amount_cents >= 0),
  purchased_at timestamptz DEFAULT now(),
  UNIQUE (user_id, book_id)
);

CREATE INDEX idx_purchases_user_id ON public.purchases(user_id);
CREATE INDEX idx_purchases_book_id ON public.purchases(book_id);

-- ============================================
-- 7. AUDIO PURCHASES
-- ============================================

CREATE TABLE public.audio_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  audio_id uuid REFERENCES public.book_audio(id) ON DELETE CASCADE NOT NULL,
  stripe_payment_id text,
  amount_cents integer CHECK (amount_cents IS NULL OR amount_cents >= 0),
  purchased_at timestamptz DEFAULT now(),
  UNIQUE (user_id, audio_id)
);

CREATE INDEX idx_audio_purchases_user_id ON public.audio_purchases(user_id);
CREATE INDEX idx_audio_purchases_audio_id ON public.audio_purchases(audio_id);

-- ============================================
-- 8. READING PROGRESS
-- ============================================

CREATE TABLE public.reading_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  book_id uuid REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE SET NULL,
  progress_percent numeric NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  total_time_seconds integer NOT NULL DEFAULT 0 CHECK (total_time_seconds >= 0),
  last_read_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, book_id)
);

CREATE INDEX idx_reading_progress_chapter_id ON public.reading_progress(chapter_id);

-- ============================================
-- 9. BOOKMARKS
-- ============================================

CREATE TABLE public.bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE CASCADE NOT NULL,
  position integer NOT NULL CHECK (position >= 0),
  note text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_bookmarks_user_chapter ON public.bookmarks(user_id, chapter_id);

-- ============================================
-- 10. HIGHLIGHTS
-- ============================================

CREATE TABLE public.highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE CASCADE NOT NULL,
  start_position integer NOT NULL CHECK (start_position >= 0),
  end_position integer NOT NULL,
  text_content text,
  note text,
  color text DEFAULT 'yellow',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT chk_highlights_position_valid CHECK (end_position > start_position)
);

CREATE INDEX idx_highlights_user_chapter ON public.highlights(user_id, chapter_id);

-- ============================================
-- 11. REFERRALS
-- ============================================

CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  referred_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status referral_status NOT NULL DEFAULT 'pending',
  credited_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (referred_id)
);

CREATE INDEX idx_referrals_referrer_id ON public.referrals(referrer_id);

-- ============================================
-- 12. INQUIRIES
-- ============================================

CREATE TABLE public.inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status inquiry_status NOT NULL DEFAULT 'unread',
  replied_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_inquiries_status ON public.inquiries(status, created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_audio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view profiles by referral code" ON public.profiles
  FOR SELECT USING (referral_code IS NOT NULL);

-- User roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Books
CREATE POLICY "Anyone can view published books" ON public.books
  FOR SELECT USING (is_published = true);

-- Chapters
CREATE POLICY "Anyone can view chapters of published books" ON public.chapters
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.books WHERE id = book_id AND is_published = true)
  );

-- Book audio
CREATE POLICY "Anyone can view enabled audio" ON public.book_audio
  FOR SELECT USING (is_enabled = true);

-- Purchases
CREATE POLICY "Users can view own purchases" ON public.purchases
  FOR SELECT USING (auth.uid() = user_id);

-- Audio purchases
CREATE POLICY "Users can view own audio purchases" ON public.audio_purchases
  FOR SELECT USING (auth.uid() = user_id);

-- Reading progress
CREATE POLICY "Users can view own progress" ON public.reading_progress
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON public.reading_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.reading_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Bookmarks
CREATE POLICY "Users can manage own bookmarks" ON public.bookmarks
  FOR ALL USING (auth.uid() = user_id);

-- Highlights
CREATE POLICY "Users can manage own highlights" ON public.highlights
  FOR ALL USING (auth.uid() = user_id);

-- Referrals
CREATE POLICY "Users can view own referrals" ON public.referrals
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = referrer_id));

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

GRANT EXECUTE ON FUNCTION public.has_role TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_referral_code text;
BEGIN
  new_referral_code := upper(substring(md5(random()::text) from 1 for 8));
  INSERT INTO public.profiles (user_id, email, name, referral_code)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name', new_referral_code);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STORAGE BUCKETS
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('book-covers', 'book-covers', true),
  ('book-audio', 'book-audio', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view book covers" ON storage.objects
  FOR SELECT USING (bucket_id = 'book-covers');

CREATE POLICY "Admins can upload book covers" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'book-covers' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update book covers" ON storage.objects
  FOR UPDATE USING (bucket_id = 'book-covers' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete book covers" ON storage.objects
  FOR DELETE USING (bucket_id = 'book-covers' AND public.has_role(auth.uid(), 'admin'));
