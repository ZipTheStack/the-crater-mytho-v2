import { useState, useEffect } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface Chapter {
  id: string;
  book_id: string;
  title: string;
  content: string | null;
  chapter_order: number;
  is_preview: boolean;
}

interface ChapterEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapter?: Chapter | null;
  defaultBookId?: string;
}

export function ChapterEditorModal({ open, onOpenChange, chapter, defaultBookId }: ChapterEditorModalProps) {
  const isEditing = !!chapter;
  const [loading, setLoading] = useState(false);
  const [bookId, setBookId] = useState(chapter?.book_id || defaultBookId || '');
  const [title, setTitle] = useState(chapter?.title || '');
  const [content, setContent] = useState(chapter?.content || '');
  const [chapterOrder, setChapterOrder] = useState(chapter?.chapter_order?.toString() || '1');
  const [isPreview, setIsPreview] = useState(chapter?.is_preview || false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch books for dropdown
  const { data: books } = useQuery({
    queryKey: ['admin-books-dropdown'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select('id, title')
        .order('title');
      if (error) throw error;
      return data;
    },
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setBookId(chapter?.book_id || defaultBookId || '');
      setTitle(chapter?.title || '');
      setContent(chapter?.content || '');
      setChapterOrder(chapter?.chapter_order?.toString() || '1');
      setIsPreview(chapter?.is_preview || false);
    }
  }, [open, chapter, defaultBookId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !bookId) {
      toast({ title: 'Title and book are required', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const wordCount = content.split(/\s+/).filter(Boolean).length;
      const chapterData = {
        book_id: bookId,
        title: title.trim(),
        content: content || null,
        chapter_order: parseInt(chapterOrder) || 1,
        is_preview: isPreview,
        word_count: wordCount,
        updated_at: new Date().toISOString(),
      };

      if (isEditing && chapter) {
        const { error } = await supabase
          .from('chapters')
          .update(chapterData)
          .eq('id', chapter.id);
        if (error) throw error;
        toast({ title: 'Chapter updated successfully' });
      } else {
        const { error } = await supabase
          .from('chapters')
          .insert(chapterData);
        if (error) throw error;
        toast({ title: 'Chapter created successfully' });
      }

      // Update book's updated_at
      await supabase
        .from('books')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', bookId);

      queryClient.invalidateQueries({ queryKey: ['admin-books'] });
      queryClient.invalidateQueries({ queryKey: ['chapters'] });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Failed to save chapter', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">
            {isEditing ? 'Edit Chapter' : 'Add New Chapter'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="book">Book *</Label>
            <Select value={bookId} onValueChange={setBookId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a book" />
              </SelectTrigger>
              <SelectContent>
                {books?.map((book) => (
                  <SelectItem key={book.id} value={book.id}>
                    {book.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Chapter Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter chapter title"
                required
              />
            </div>
            <div>
              <Label htmlFor="chapterOrder">Chapter Order</Label>
              <Input
                id="chapterOrder"
                type="number"
                min="1"
                value={chapterOrder}
                onChange={(e) => setChapterOrder(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter chapter content (supports basic HTML)"
              rows={15}
              className="font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Word count: {content.split(/\s+/).filter(Boolean).length}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="preview">Preview Chapter</Label>
              <p className="text-sm text-muted-foreground">Allow non-subscribers to read this chapter</p>
            </div>
            <Switch
              id="preview"
              checked={isPreview}
              onCheckedChange={setIsPreview}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {isEditing ? 'Save Changes' : 'Create Chapter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
