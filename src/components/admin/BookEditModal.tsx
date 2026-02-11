import { useState, useRef, useEffect } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Upload, Play, Pause, Star, GripVertical, Trash2, Music, FileText, Eye, EyeOff } from 'lucide-react';

interface Book {
  id: string;
  title: string;
  author: string;
  description: string | null;
  cover_url: string | null;
  price_cents: number;
  preview_chapters: number;
  is_published: boolean;
}

type AudioType = 'audiobook' | 'soundtrack';

interface AudioTrack {
  id: string;
  book_id: string;
  type: AudioType;
  title: string;
  file_url: string;
  duration_seconds: number | null;
  sort_order: number;
  is_enabled: boolean;
  price_cents: number;
}

interface Chapter {
  id: string;
  book_id: string;
  title: string;
  chapter_order: number;
  content: string | null;
  word_count: number | null;
  is_preview: boolean;
}

interface BookEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book?: Book | null;
}

export function BookEditModal({ open, onOpenChange, book }: BookEditModalProps) {
  const isEditing = !!book;
  const [loading, setLoading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [audioUploading, setAudioUploading] = useState(false);
  const [manuscriptUploading, setManuscriptUploading] = useState(false);
  const [parsingManuscript, setParsingManuscript] = useState(false);
  const [uploadedManuscriptPath, setUploadedManuscriptPath] = useState<string | null>(null);
  const [title, setTitle] = useState(book?.title || '');
  const [author, setAuthor] = useState(book?.author || '');
  const [description, setDescription] = useState(book?.description || '');
  const [coverUrl, setCoverUrl] = useState(book?.cover_url || '');
  const [priceCents, setPriceCents] = useState(book?.price_cents?.toString() || '0');
  const [previewChapters, setPreviewChapters] = useState(book?.preview_chapters?.toString() || '3');
  const [isPublished, setIsPublished] = useState(book?.is_published || false);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const manuscriptInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch audio tracks for this book
  const { data: audioTracks, refetch: refetchAudio } = useQuery({
    queryKey: ['book-audio', book?.id],
    queryFn: async () => {
      if (!book?.id) return [];
      const { data, error } = await supabase
        .from('book_audio')
        .select('*')
        .eq('book_id', book.id)
        .order('type')
        .order('sort_order');
      if (error) throw error;
      return data as AudioTrack[];
    },
    enabled: !!book?.id,
  });

  // Fetch chapters for this book
  const { data: chapters, refetch: refetchChapters } = useQuery({
    queryKey: ['book-chapters-admin', book?.id],
    queryFn: async () => {
      if (!book?.id) return [];
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('book_id', book.id)
        .order('chapter_order');
      if (error) throw error;
      return data as Chapter[];
    },
    enabled: !!book?.id,
  });

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCoverUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('book-covers')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('book-covers')
        .getPublicUrl(filePath);

      setCoverUrl(data.publicUrl);
      toast({ title: 'Cover uploaded successfully' });
    } catch (error: any) {
      toast({ title: 'Failed to upload cover', description: error.message, variant: 'destructive' });
    } finally {
      setCoverUploading(false);
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'audiobook' | 'soundtrack') => {
    const file = e.target.files?.[0];
    if (!file || !book?.id) return;

    setAudioUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}/${book.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('book-audio')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('book-audio')
        .getPublicUrl(fileName);

      // Create audio record
      const { error: insertError } = await supabase
        .from('book_audio')
        .insert({
          book_id: book.id,
          type,
          title: file.name.replace(/\.[^/.]+$/, ''),
          file_url: urlData.publicUrl,
          sort_order: (audioTracks?.filter(t => t.type === type).length || 0),
          is_enabled: true,
        });

      if (insertError) throw insertError;

      toast({ title: `${type === 'audiobook' ? 'Audiobook' : 'Soundtrack'} uploaded successfully` });
      refetchAudio();
    } catch (error: any) {
      toast({ title: 'Failed to upload audio', description: error.message, variant: 'destructive' });
    } finally {
      setAudioUploading(false);
      if (audioInputRef.current) audioInputRef.current.value = '';
    }
  };

  const handleToggleTrack = async (trackId: string, enabled: boolean) => {
    const { error } = await supabase
      .from('book_audio')
      .update({ is_enabled: enabled })
      .eq('id', trackId);

    if (error) {
      toast({ title: 'Failed to update track', variant: 'destructive' });
    } else {
      refetchAudio();
    }
  };

  // Default tracks are determined by sort_order (first track is default)
  const handleSetDefault = async (trackId: string, type: AudioType) => {
    // Move this track to sort_order 0, shift others
    const tracksOfType = audioTracks?.filter(t => t.type === type) || [];
    const targetTrack = tracksOfType.find(t => t.id === trackId);
    if (!targetTrack) return;

    // Set this track to sort_order 0
    const { error } = await supabase
      .from('book_audio')
      .update({ sort_order: 0 })
      .eq('id', trackId);

    if (error) {
      toast({ title: 'Failed to set default', variant: 'destructive' });
    } else {
      // Shift other tracks
      for (let i = 0; i < tracksOfType.length; i++) {
        if (tracksOfType[i].id !== trackId) {
          await supabase
            .from('book_audio')
            .update({ sort_order: i + 1 })
            .eq('id', tracksOfType[i].id);
        }
      }
      refetchAudio();
    }
  };

  const handleDeleteTrack = async (trackId: string) => {
    const { error } = await supabase
      .from('book_audio')
      .delete()
      .eq('id', trackId);

    if (error) {
      toast({ title: 'Failed to delete track', variant: 'destructive' });
    } else {
      toast({ title: 'Track deleted' });
      refetchAudio();
    }
  };

  const handlePreviewAudio = (url: string) => {
    if (previewAudioUrl === url) {
      audioRef.current?.pause();
      setPreviewAudioUrl(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
      }
      setPreviewAudioUrl(url);
    }
  };

  // Robust filename sanitization for Supabase storage keys
  const sanitizeFileName = (name: string): string => {
    const ext = (name.split('.').pop() || '').toLowerCase();
    const baseName = name.replace(/\.[^/.]+$/, '');
    
    // Normalize unicode and strip smart quotes, ellipsis, and other special chars
    const sanitized = baseName
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[""''`´]/g, '') // Remove all quote variants
      .replace(/[…]/g, '.') // Replace ellipsis with dot
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace anything else with underscore
      .replace(/_+/g, '_') // Collapse multiple underscores
      .replace(/^[._]+|[._]+$/g, '') // Trim leading/trailing dots or underscores
      .toLowerCase()
      .substring(0, 50);
    
    return sanitized ? `${sanitized}.${ext}` : `file_${Date.now()}.${ext}`;
  };

  // Manuscript handlers
  const handleManuscriptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !book?.id) return;

    setManuscriptUploading(true);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const sanitizedName = sanitizeFileName(file.name);
      const fileName = `${book.id}/${Date.now()}-${sanitizedName}`;

      const { error: uploadError } = await supabase.storage
        .from('book-manuscripts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      setUploadedManuscriptPath(fileName);
      toast({ title: 'Manuscript uploaded', description: 'Ready to parse into chapters' });
    } catch (error: any) {
      toast({ title: 'Failed to upload manuscript', description: error.message, variant: 'destructive' });
    } finally {
      setManuscriptUploading(false);
      if (manuscriptInputRef.current) manuscriptInputRef.current.value = '';
    }
  };

  const handleParseManuscript = async (mode: 'add' | 'replace') => {
    if (!uploadedManuscriptPath || !book?.id) return;

    setParsingManuscript(true);
    try {
      // Get current session token explicitly
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      
      if (!accessToken) {
        throw new Error('Not authenticated. Please log out and log back in.');
      }

      const { data, error } = await supabase.functions.invoke('parse-manuscript', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: {
          bookId: book.id,
          filePath: uploadedManuscriptPath,
          mode,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to parse manuscript');
      }

      const result = data as any;
      
      if (result.error) {
        throw new Error(result.error);
      }

      toast({ 
        title: 'Manuscript parsed successfully', 
        description: `${result.chaptersCreated} chapters created` 
      });
      setUploadedManuscriptPath(null);
      refetchChapters();
      queryClient.invalidateQueries({ queryKey: ['admin-books'] });
    } catch (error: any) {
      toast({ title: 'Failed to parse manuscript', description: error.message, variant: 'destructive' });
    } finally {
      setParsingManuscript(false);
    }
  };

  const handleToggleChapterPreview = async (chapterId: string, isPreview: boolean) => {
    const { error } = await supabase
      .from('chapters')
      .update({ is_preview: isPreview })
      .eq('id', chapterId);

    if (error) {
      toast({ title: 'Failed to update chapter', variant: 'destructive' });
    } else {
      refetchChapters();
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    const { error } = await supabase
      .from('chapters')
      .delete()
      .eq('id', chapterId);

    if (error) {
      toast({ title: 'Failed to delete chapter', variant: 'destructive' });
    } else {
      toast({ title: 'Chapter deleted' });
      refetchChapters();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) {
      toast({ title: 'Title and author are required', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const bookData = {
        title: title.trim(),
        author: author.trim(),
        description: description.trim() || null,
        cover_url: coverUrl || null,
        price_cents: parseInt(priceCents) || 0,
        preview_chapters: parseInt(previewChapters) || 3,
        is_published: isPublished,
        updated_at: new Date().toISOString(),
      };

      if (isEditing && book) {
        const { error } = await supabase
          .from('books')
          .update(bookData)
          .eq('id', book.id);
        if (error) throw error;
        toast({ title: 'Book updated successfully' });
      } else {
        const { error } = await supabase
          .from('books')
          .insert(bookData);
        if (error) throw error;
        toast({ title: 'Book created successfully' });
      }

      queryClient.invalidateQueries({ queryKey: ['admin-books'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Failed to save book', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Reset form when modal opens with different book
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setTitle(book?.title || '');
      setAuthor(book?.author || '');
      setDescription(book?.description || '');
      setCoverUrl(book?.cover_url || '');
      setPriceCents(book?.price_cents?.toString() || '0');
      setPreviewChapters(book?.preview_chapters?.toString() || '3');
      setIsPublished(book?.is_published || false);
      setUploadedManuscriptPath(null);
    }
    onOpenChange(open);
  };

  // Sync form state when book prop changes
  useEffect(() => {
    if (book) {
      setTitle(book.title || '');
      setAuthor(book.author || '');
      setDescription(book.description || '');
      setCoverUrl(book.cover_url || '');
      setPriceCents(book.price_cents?.toString() || '0');
      setPreviewChapters(book.preview_chapters?.toString() || '3');
      setIsPublished(book.is_published || false);
    }
  }, [book]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const safeAudioTracks = Array.isArray(audioTracks) ? audioTracks : [];
  const soundtracks = safeAudioTracks.filter(t => t.type === 'soundtrack');
  const audiobooks = safeAudioTracks.filter(t => t.type === 'audiobook');
  const safeChapters = Array.isArray(chapters) ? chapters : [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">
            {isEditing ? 'Edit Book' : 'Add New Book'}
          </DialogTitle>
        </DialogHeader>

        <audio ref={audioRef} onEnded={() => setPreviewAudioUrl(null)} />

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="audio">Audio</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter book title"
                  required
                />
              </div>

              <div>
                <Label htmlFor="author">Author *</Label>
                <Input
                  id="author"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Enter author name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter book description"
                  rows={3}
                />
              </div>

              <div>
                <Label>Cover Image</Label>
                <div className="flex items-center gap-4 mt-2">
                  {coverUrl && (
                    <img
                      src={coverUrl}
                      alt="Cover preview"
                      className="w-16 h-20 object-cover rounded border"
                    />
                  )}
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCoverUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={coverUploading}
                  >
                    {coverUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Upload Cover
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priceCents">Price (cents)</Label>
                  <Input
                    id="priceCents"
                    type="number"
                    value={priceCents}
                    onChange={(e) => setPriceCents(e.target.value)}
                    placeholder="999"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    ${(parseInt(priceCents) / 100).toFixed(2)}
                  </p>
                </div>
                <div>
                  <Label htmlFor="previewChapters">Preview Chapters</Label>
                  <Input
                    id="previewChapters"
                    type="number"
                    min="0"
                    value={previewChapters}
                    onChange={(e) => setPreviewChapters(e.target.value)}
                    placeholder="3"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="published">Published</Label>
                  <p className="text-sm text-muted-foreground">Make this book visible to readers</p>
                </div>
                <Switch
                  id="published"
                  checked={isPublished}
                  onCheckedChange={setIsPublished}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {isEditing ? 'Save Changes' : 'Create Book'}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="content">
            <div className="space-y-6">
              {!isEditing ? (
                <div className="p-8 text-center bg-muted/30 rounded-lg">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h4 className="font-serif mb-2">Content Management</h4>
                  <p className="text-sm text-muted-foreground">
                    Create the book first, then return here to upload and parse your manuscript.
                  </p>
                </div>
              ) : (
                <>
                  {/* Manuscript Upload */}
                  <div className="p-4 border rounded-lg bg-muted/20">
                    <h4 className="font-serif text-lg mb-3">Upload Manuscript</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Upload a TXT, MD, or DOCX file. The system will parse it into chapters automatically.
                    </p>
                    
                    <input
                      ref={manuscriptInputRef}
                      type="file"
                      accept=".txt,.md,.docx,.epub"
                      onChange={handleManuscriptUpload}
                      className="hidden"
                    />
                    
                    <div className="flex flex-wrap gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => manuscriptInputRef.current?.click()}
                        disabled={manuscriptUploading || parsingManuscript}
                      >
                        {manuscriptUploading ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Upload className="w-4 h-4 mr-2" />
                        )}
                        Select File
                      </Button>
                      
                      {uploadedManuscriptPath && (
                        <>
                          <Button
                            type="button"
                            onClick={() => handleParseManuscript('add')}
                            disabled={parsingManuscript}
                          >
                            {parsingManuscript ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <FileText className="w-4 h-4 mr-2" />
                            )}
                            Add Chapters
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={() => handleParseManuscript('replace')}
                            disabled={parsingManuscript}
                          >
                            {parsingManuscript ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <FileText className="w-4 h-4 mr-2" />
                            )}
                            Replace All
                          </Button>
                        </>
                      )}
                    </div>
                    
                    {uploadedManuscriptPath && (
                      <p className="text-sm text-primary mt-2">
                        ✓ File ready: {uploadedManuscriptPath.split('/').pop()}
                      </p>
                    )}
                  </div>

                  {/* Existing Chapters */}
                  <div>
                  <h4 className="font-serif text-lg mb-3">
                      Chapters ({safeChapters.length})
                    </h4>
                    
                    {safeChapters.length > 0 ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {safeChapters.map((chapter) => (
                          <div
                            key={chapter.id}
                            className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                          >
                            <span className="text-sm font-medium w-8">
                              {chapter.chapter_order}
                            </span>
                            <span className="flex-1 text-sm truncate">
                              {chapter.title}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {chapter.word_count?.toLocaleString() || 0} words
                            </span>
                            <button
                              onClick={() => handleToggleChapterPreview(chapter.id, !chapter.is_preview)}
                              className={`p-1 rounded transition-colors ${
                                chapter.is_preview 
                                  ? 'text-primary' 
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                              title={chapter.is_preview ? 'Preview enabled (free)' : 'Click to enable preview'}
                            >
                              {chapter.is_preview ? (
                                <Eye className="w-4 h-4" />
                              ) : (
                                <EyeOff className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteChapter(chapter.id)}
                              className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                              title="Delete chapter"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8 bg-muted/50 rounded">
                        No chapters yet. Upload a manuscript above to get started.
                      </p>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Tip: Chapters marked with the eye icon are free previews. The parser looks for "Chapter X" patterns or markdown headers to split content.
                  </p>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="audio">
            <div className="space-y-6">
              {!isEditing ? (
                <div className="p-8 text-center bg-muted/30 rounded-lg">
                  <Music className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h4 className="font-serif mb-2">Audio Management</h4>
                  <p className="text-sm text-muted-foreground">
                    Create the book first, then return here to upload audiobook and soundtrack files.
                  </p>
                </div>
              ) : (
                <>
                  {/* Audiobook section */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-serif text-lg">Audiobook</h4>
                      <input
                        ref={audioInputRef}
                        type="file"
                        accept=".mp3,.m4a,.wav,.ogg"
                        onChange={(e) => handleAudioUpload(e, 'audiobook')}
                        className="hidden"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => audioInputRef.current?.click()}
                        disabled={audioUploading}
                      >
                        {audioUploading ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Upload className="w-4 h-4 mr-2" />
                        )}
                        Upload Audiobook
                      </Button>
                    </div>
                    {audiobooks.length > 0 ? (
                      <div className="space-y-2">
                        {audiobooks.map((track) => (
                          <AudioTrackRow
                            key={track.id}
                            track={track}
                            isPlaying={previewAudioUrl === track.file_url}
                            onPreview={() => handlePreviewAudio(track.file_url)}
                            onToggle={(enabled) => handleToggleTrack(track.id, enabled)}
                            onSetDefault={() => handleSetDefault(track.id, 'audiobook')}
                            onDelete={() => handleDeleteTrack(track.id)}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4 bg-muted/50 rounded">
                        No audiobook uploaded yet
                      </p>
                    )}
                  </div>

                  {/* Soundtrack section */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-serif text-lg">Soundtrack Tracks</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = '.mp3,.m4a,.wav,.ogg';
                          input.onchange = (e) => {
                            const target = e.target as HTMLInputElement;
                            if (target.files?.[0]) {
                              const fakeEvent = { target: { files: target.files } } as React.ChangeEvent<HTMLInputElement>;
                              handleAudioUpload(fakeEvent, 'soundtrack');
                            }
                          };
                          input.click();
                        }}
                        disabled={audioUploading}
                      >
                        {audioUploading ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Upload className="w-4 h-4 mr-2" />
                        )}
                        Add Track
                      </Button>
                    </div>
                    {soundtracks.length > 0 ? (
                      <div className="space-y-2">
                        {soundtracks.map((track) => (
                          <AudioTrackRow
                            key={track.id}
                            track={track}
                            isPlaying={previewAudioUrl === track.file_url}
                            onPreview={() => handlePreviewAudio(track.file_url)}
                            onToggle={(enabled) => handleToggleTrack(track.id, enabled)}
                            onSetDefault={() => handleSetDefault(track.id, 'soundtrack')}
                            onDelete={() => handleDeleteTrack(track.id)}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4 bg-muted/50 rounded">
                        No soundtrack tracks uploaded yet
                      </p>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Tip: Upload audio files (MP3, M4A, WAV, OGG). Soundtrack tracks will play during reading. The audiobook is the narrated version.
                  </p>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function AudioTrackRow({
  track,
  isPlaying,
  onPreview,
  onToggle,
  onSetDefault,
  onDelete,
}: {
  track: AudioTrack;
  isPlaying: boolean;
  onPreview: () => void;
  onToggle: (enabled: boolean) => void;
  onSetDefault: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
      <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
      
      <button
        onClick={onPreview}
        className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
        aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4" />
        )}
      </button>

      <span className="flex-1 text-sm truncate">{track.title}</span>

      <button
        onClick={onSetDefault}
        className={`p-1 rounded transition-colors ${
          track.sort_order === 0 ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
        }`}
        aria-label={track.sort_order === 0 ? 'Default track' : 'Set as default'}
        title={track.sort_order === 0 ? 'Default track' : 'Set as default'}
      >
        <Star className="w-4 h-4" fill={track.sort_order === 0 ? 'currentColor' : 'none'} />
      </button>

      <Switch
        checked={track.is_enabled}
        onCheckedChange={onToggle}
        aria-label={track.is_enabled ? 'Disable track' : 'Enable track'}
      />

      <button
        onClick={onDelete}
        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
        aria-label="Delete track"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
