import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminStats, useAdminBooks, useAdminReaders, useAdminReferrals, useAdminDropOffPoints } from '@/hooks/useAdminData';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BookEditModal } from '@/components/admin/BookEditModal';
import { DeleteBookDialog } from '@/components/admin/DeleteBookDialog';
import { ChapterEditorModal } from '@/components/admin/ChapterEditorModal';
import { CouponModal } from '@/components/admin/CouponModal';
import { ReaderDetailsModal } from '@/components/admin/ReaderDetailsModal';
import { EmailInbox } from '@/components/admin/EmailInbox';
import { PricingManager } from '@/components/admin/PricingManager';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  BookOpen, 
  Users, 
  DollarSign, 
  BarChart3, 
  Settings,
  Upload,
  Plus,
  Eye,
  Edit,
  Trash2,
  HelpCircle,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Smartphone,
  Monitor,
  Tablet,
  Tag,
  Loader2,
  Save,
  Headphones,
  Mail,
  Music,
  Menu,
  X
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type Tab = 'overview' | 'books' | 'audio' | 'pricing' | 'readers' | 'email' | 'analytics' | 'settings';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'books', label: 'Books', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'audio', label: 'Audio', icon: <Headphones className="w-5 h-5" /> },
    { id: 'pricing', label: 'Pricing', icon: <DollarSign className="w-5 h-5" /> },
    { id: 'readers', label: 'Readers', icon: <Users className="w-5 h-5" /> },
    { id: 'email', label: 'Email', icon: <Mail className="w-5 h-5" /> },
    { id: 'analytics', label: 'Analytics', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const sidebarContent = (
    <>
      <div className="p-6">
        <h1 className="display-text text-lg text-sidebar-primary mb-1">Author Portal</h1>
        <p className="text-sm text-sidebar-foreground">The Crater Mythos</p>
      </div>

      <nav className="px-3 flex-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors text-left ${
              activeTab === tab.id
                ? 'bg-sidebar-accent text-sidebar-primary'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
            }`}
          >
            {tab.icon}
            <span className="font-serif">{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-primary font-serif">
            {profile?.name?.charAt(0) || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-sidebar-foreground truncate">{profile?.name || 'Author'}</p>
            <p className="text-xs text-sidebar-foreground/50 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="text-sm text-sidebar-foreground hover:text-sidebar-primary transition-colors"
        >
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
          {sidebarContent}
        </aside>
      )}

      {/* Mobile Sidebar Sheet */}
      {isMobile && (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-64 p-0 bg-sidebar border-sidebar-border flex flex-col">
            {sidebarContent}
          </SheetContent>
        </Sheet>
      )}

      {/* Main content */}
      <main className={`min-h-screen ${isMobile ? '' : 'ml-64'}`}>
        {/* Header */}
        <header className="border-b border-border px-4 md:px-8 py-4 flex justify-between items-center bg-background/50 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-lg md:text-xl font-serif truncate">{tabs.find(t => t.id === activeTab)?.label}</h2>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <HelpButton />
            <button
              onClick={() => navigate('/dashboard')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Reader View</span>
            </button>
          </div>
        </header>

        <div className="p-4 md:p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && <OverviewTab key="overview" onTabChange={handleTabChange} />}
            {activeTab === 'books' && <BooksTab key="books" />}
            {activeTab === 'audio' && <AudioTab key="audio" />}
            {activeTab === 'pricing' && <PricingTab key="pricing" />}
            {activeTab === 'readers' && <ReadersTab key="readers" />}
            {activeTab === 'email' && <EmailTab key="email" />}
            {activeTab === 'analytics' && <AnalyticsTab key="analytics" />}
            {activeTab === 'settings' && <SettingsTab key="settings" />}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function HelpButton() {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowHelp(!showHelp)}
        className="p-2 hover:bg-muted rounded transition-colors"
        title="Need help?"
      >
        <HelpCircle className="w-5 h-5 text-muted-foreground" />
      </button>
      {showHelp && (
        <motion.div
          className="absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-lg shadow-xl p-4 z-50"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h4 className="font-serif mb-2">Need Help?</h4>
          <p className="text-sm text-muted-foreground mb-4">
            This is your author control center. Here you can manage your books, set prices, and track reader engagement.
          </p>
          <button className="text-sm text-primary hover:underline">View full guide →</button>
        </motion.div>
      )}
    </div>
  );
}

function Tooltip({ children, content }: { children: React.ReactNode; content: string }) {
  const [show, setShow] = useState(false);

  return (
    <span className="relative inline-flex items-center">
      {children}
      <button
        className="help-trigger ml-1"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        ?
      </button>
      {show && (
        <motion.span
          className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-popover border border-border rounded px-3 py-2 text-sm w-48 z-50"
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
        >
          {content}
        </motion.span>
      )}
    </span>
  );
}

function StatCard({ 
  title, 
  value, 
  trend, 
  tooltip 
}: { 
  title: string; 
  value: string; 
  trend?: number;
  tooltip: string;
}) {
  return (
    <div className="admin-card">
      <div className="flex items-start justify-between mb-2">
        <Tooltip content={tooltip}>
          <span className="text-sm text-muted-foreground">{title}</span>
        </Tooltip>
        {trend !== undefined && (
          <span className={`flex items-center text-sm ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {trend >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-serif">{value}</p>
    </div>
  );
}

function OverviewTab({ onTabChange }: { onTabChange: (tab: Tab) => void }) {
  const { data: stats, isLoading } = useAdminStats();
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const deviceIcons: Record<string, React.ComponentType<{ className?: string }>> = { Mobile: Smartphone, Tablet: Tablet, Desktop: Monitor };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        <StatCard title="Total Readers" value={(stats?.totalReaders ?? 0).toLocaleString()} tooltip="Total number of people reading your books" />
        <StatCard title="Total Books" value={(stats?.totalBooks ?? 0).toLocaleString()} tooltip="Number of books in your library" />
        <StatCard title="Completion Rate" value={`${stats?.completionRate ?? 0}%`} tooltip="Percentage of readers who finish reading your books" />
        <StatCard title="Active Devices" value={`${stats?.deviceStats?.length ?? 0} types`} tooltip="Device types used for reading" />
      </div>

      {/* Quick actions */}
      <div className="grid lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="admin-card">
          <h3 className="font-serif mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button 
              onClick={() => setShowChapterModal(true)}
              className="w-full flex items-center justify-between p-3 bg-muted rounded hover:bg-muted/80 transition-colors"
            >
              <span className="flex items-center gap-3">
                <Upload className="w-5 h-5 text-primary" />
                <span className="text-sm md:text-base">Upload new chapter</span>
              </span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
            <button 
              onClick={() => setShowCouponModal(true)}
              className="w-full flex items-center justify-between p-3 bg-muted rounded hover:bg-muted/80 transition-colors"
            >
              <span className="flex items-center gap-3">
                <Tag className="w-5 h-5 text-primary" />
                <span className="text-sm md:text-base">Create discount code</span>
              </span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
            <button 
              onClick={() => onTabChange('analytics')}
              className="w-full flex items-center justify-between p-3 bg-muted rounded hover:bg-muted/80 transition-colors"
            >
              <span className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-primary" />
                <span className="text-sm md:text-base">View detailed analytics</span>
              </span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Recent activity placeholder */}
        <div className="admin-card">
          <h3 className="font-serif mb-4">Recent Activity</h3>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Activity tracking coming soon...</p>
          </div>
        </div>
      </div>

      {/* Device usage */}
      <div className="admin-card">
        <div className="flex items-center justify-between mb-4">
          <Tooltip content="How readers access your books across different devices">
            <h3 className="font-serif">Reading Devices</h3>
          </Tooltip>
        </div>
        <div className="grid grid-cols-3 gap-4 md:gap-6">
          {(stats?.deviceStats || []).map((device) => {
            const IconComponent = deviceIcons[device.device] || Monitor;
            return (
              <div key={device.device} className="text-center">
                <IconComponent className="w-6 md:w-8 h-6 md:h-8 mx-auto mb-2 text-primary" />
                <p className="text-xl md:text-2xl font-serif mb-1">{device.percent}%</p>
                <p className="text-xs md:text-sm text-muted-foreground">{device.device}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      <ChapterEditorModal open={showChapterModal} onOpenChange={setShowChapterModal} />
      <CouponModal open={showCouponModal} onOpenChange={setShowCouponModal} />
    </motion.div>
  );
}

function BooksTab() {
  const { data: books, isLoading } = useAdminBooks();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Prevent browser default file-open behavior on drag/drop anywhere on page
  useEffect(() => {
    const preventDefault = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('dragover', preventDefault);
    window.addEventListener('drop', preventDefault);
    return () => {
      window.removeEventListener('dragover', preventDefault);
      window.removeEventListener('drop', preventDefault);
    };
  }, []);

  const handleView = (bookId: string) => {
    navigate(`/reader/${bookId}`);
  };

  const handleEdit = (book: any) => {
    setSelectedBook(book);
    setShowEditModal(true);
  };

  const handleDelete = (book: any) => {
    setSelectedBook(book);
    setShowDeleteDialog(true);
  };

  const handleAddBook = () => {
    setSelectedBook(null);
    setShowEditModal(true);
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

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const sanitizedName = sanitizeFileName(file.name);
      const fileName = `${Date.now()}-${sanitizedName}`;

      const { error: uploadError } = await supabase.storage
        .from('book-manuscripts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      toast({ 
        title: 'File uploaded successfully', 
        description: 'You can now create a book and add chapters from this manuscript.' 
      });
      
      // Open the add book modal
      setSelectedBook(null);
      setShowEditModal(true);
    } catch (error: any) {
      toast({ title: 'Failed to upload file', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we're leaving the drop zone (not entering a child)
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length === 0) return;
    
    const file = files[0];
    const validExtensions = ['.docx', '.txt', '.md'];
    const hasValidExt = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    
    if (!hasValidExt) {
      toast({ 
        title: 'Invalid file type', 
        description: 'Please upload a DOCX, TXT, or MD file.', 
        variant: 'destructive' 
      });
      return;
    }
    
    await uploadFile(file);
    e.dataTransfer.clearData();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <Tooltip content="Your published and draft books">
          <h3 className="font-serif text-lg">Your Books</h3>
        </Tooltip>
        <Button onClick={handleAddBook} className="w-full sm:w-auto">
          <Plus className="w-5 h-5 mr-2" /> Add Book
        </Button>
      </div>

      <div className="space-y-4">
        {(books || []).map((book) => (
          <div key={book.id} className="admin-card">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-12 h-16 bg-muted rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                  {book.cover_url ? (
                    <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                  ) : (
                    <BookOpen className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-serif truncate">{book.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {book.is_published ? `${book.readers.toLocaleString()} readers` : 'Draft'}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
                <span className={`px-3 py-1 rounded text-sm ${
                  book.is_published 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {book.is_published ? 'published' : 'draft'}
                </span>
                {/* Price display */}
                <span className="text-muted-foreground text-sm hidden sm:inline">${(book.price_cents / 100).toFixed(2)}</span>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => handleView(book.id)}
                    className="p-2 hover:bg-muted rounded transition-colors"
                    title="View book"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleEdit(book)}
                    className="p-2 hover:bg-muted rounded transition-colors"
                    title="Edit book"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(book)}
                    className="p-2 hover:bg-muted rounded transition-colors text-destructive"
                    title="Delete book"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Drag-and-drop upload section */}
      <div 
        className={`mt-8 p-6 md:p-8 border-2 border-dashed rounded-lg text-center transition-colors ${
          isDragging 
            ? 'border-primary bg-primary/10' 
            : 'border-border hover:border-primary/50 hover:bg-muted/30'
        }`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className={`w-10 md:w-12 h-10 md:h-12 mx-auto mb-4 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
        <h4 className="font-serif mb-2">Upload New Content</h4>
        <p className="text-sm text-muted-foreground mb-4">
          Drag and drop your DOCX, TXT, or MD file here
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx,.txt,.md"
          onChange={handleFileUpload}
          className="hidden"
        />
        <Button 
          variant="secondary" 
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Uploading...
            </>
          ) : (
            'Browse Files'
          )}
        </Button>
      </div>

      {/* Modals */}
      <BookEditModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        book={selectedBook}
      />
      <DeleteBookDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        bookId={selectedBook?.id}
        bookTitle={selectedBook?.title || ''}
      />
    </motion.div>
  );
}

function AudioTab() {
  const { data: books } = useAdminBooks();
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState<any>(null);

  const handleManageAudio = (book: any) => {
    setSelectedBook(book);
    setShowEditModal(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="mb-6">
        <Tooltip content="Upload and manage audiobooks and soundtracks for your books">
          <h3 className="font-serif text-lg mb-2">Audio Management</h3>
        </Tooltip>
        <p className="text-sm text-muted-foreground">
          Upload audiobook narrations and soundtrack music for immersive reading experiences.
        </p>
      </div>

      {/* Audio quick guide */}
      <div className="admin-card mb-6 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-4">
          <Headphones className="w-8 h-8 text-primary flex-shrink-0" />
          <div>
            <h4 className="font-serif mb-2">Getting Started with Audio</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>Audiobook:</strong> Upload your narrated MP3 files for listeners</li>
              <li>• <strong>Soundtrack:</strong> Add ambient music that plays while reading</li>
              <li>• Set a default track and enable/disable tracks anytime</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Books with audio management */}
      <div className="space-y-4">
        {(books || []).map((book) => (
          <div key={book.id} className="admin-card">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-12 h-16 bg-muted rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                  {book.cover_url ? (
                    <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                  ) : (
                    <BookOpen className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-serif truncate">{book.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    Click to manage audiobook and soundtrack
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Music className="w-4 h-4" />
                  <span className="hidden sm:inline">Soundtrack</span>
                  <Headphones className="w-4 h-4 ml-2" />
                  <span className="hidden sm:inline">Audiobook</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleManageAudio(book)}
                >
                  Manage
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {books?.length === 0 && (
        <div className="text-center py-12 admin-card">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Create a book first to add audio content</p>
        </div>
      )}

      {/* Reuse BookEditModal for audio management (opens to Audio tab) */}
      <BookEditModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        book={selectedBook}
      />
    </motion.div>
  );
}

function PricingTab() {
  const { data: referrals, isLoading } = useAdminReferrals();
  const [showCouponModal, setShowCouponModal] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      {/* Pricing Manager - Full CRUD for prices */}
      <PricingManager />

      {/* Coupons */}
      <div className="mt-8 mb-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
          <Tooltip content="Discount codes for promotions and affiliates">
            <h3 className="font-serif text-lg">Discount Codes</h3>
          </Tooltip>
          <Button onClick={() => setShowCouponModal(true)} className="w-full sm:w-auto">
            <Plus className="w-5 h-5 mr-2" /> New Code
          </Button>
        </div>
        <div className="admin-card">
          <p className="text-muted-foreground text-center py-4">
            Click "New Code" to create and manage discount codes via Stripe
          </p>
        </div>
      </div>

      {/* Referrals */}
      <div>
        <Tooltip content="Track reader referrals and their earnings">
          <h3 className="font-serif text-lg mb-4">Referral Tracking</h3>
        </Tooltip>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : referrals && referrals.length > 0 ? (
          <div className="admin-card overflow-x-auto">
            <table className="w-full min-w-[400px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm text-muted-foreground font-normal">Code</th>
                  <th className="text-left py-3 px-4 text-sm text-muted-foreground font-normal">User</th>
                  <th className="text-left py-3 px-4 text-sm text-muted-foreground font-normal">Signups</th>
                  <th className="text-left py-3 px-4 text-sm text-muted-foreground font-normal">Credits</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((ref) => (
                  <tr key={ref.code} className="border-b border-border last:border-0">
                    <td className="py-3 px-4 font-mono text-sm">{ref.code}</td>
                    <td className="py-3 px-4">{ref.userName}</td>
                    <td className="py-3 px-4">{ref.signups}</td>
                    <td className="py-3 px-4 text-primary">${(ref.credits / 100).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 bg-muted/50 rounded-lg text-center">
            <p className="text-muted-foreground">No referrals yet</p>
          </div>
        )}
      </div>

      {/* Coupon Modal */}
      <CouponModal open={showCouponModal} onOpenChange={setShowCouponModal} />
    </motion.div>
  );
}

function ReadersTab() {
  const { data: readers, isLoading } = useAdminReaders();
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedReader, setSelectedReader] = useState<any>(null);

  const filteredReaders = (readers || []).filter(reader =>
    reader.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (reader.name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleViewDetails = (reader: any) => {
    setSelectedReader(reader);
    setShowDetailsModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Tooltip content="Manage reader access and view their activity">
        <h3 className="font-serif text-lg mb-4">Reader Management</h3>
      </Tooltip>

      <div className="admin-card mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <input
            type="text"
            placeholder="Search by email or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-input border border-border rounded px-4 py-2"
          />
          <span className="text-sm text-muted-foreground text-center sm:text-left">
            {filteredReaders.length} reader{filteredReaders.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="admin-card overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-sm text-muted-foreground font-normal">Reader</th>
              <th className="text-left py-3 px-4 text-sm text-muted-foreground font-normal">Subscription</th>
              <th className="text-left py-3 px-4 text-sm text-muted-foreground font-normal">Progress</th>
              <th className="text-left py-3 px-4 text-sm text-muted-foreground font-normal">Last Active</th>
              <th className="text-left py-3 px-4 text-sm text-muted-foreground font-normal">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredReaders.map((reader) => (
              <tr key={reader.id} className="border-b border-border last:border-0">
                <td className="py-3 px-4">
                  <div>
                    <span className="block truncate max-w-[200px]">{reader.email}</span>
                    {reader.name && <span className="text-muted-foreground text-sm">({reader.name})</span>}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded text-sm ${reader.hasPurchases ? 'bg-green-500/20 text-green-400' : 'bg-muted'}`}>
                    {reader.hasPurchases ? 'Purchased' : 'Free'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${reader.progress}%` }} />
                    </div>
                    <span className="text-sm text-muted-foreground">{reader.progress}%</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-muted-foreground">
                  {reader.lastActive ? formatDistanceToNow(new Date(reader.lastActive), { addSuffix: true }) : 'Never'}
                </td>
                <td className="py-3 px-4">
                  <button 
                    onClick={() => handleViewDetails(reader)}
                    className="text-sm text-primary hover:underline"
                  >
                    View details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reader Details Modal */}
      <ReaderDetailsModal
        open={showDetailsModal}
        onOpenChange={setShowDetailsModal}
        readerId={selectedReader?.id}
        readerEmail={selectedReader?.email || ''}
      />
    </motion.div>
  );
}

function AnalyticsTab() {
  const { data: dropOffPoints, isLoading } = useAdminDropOffPoints();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="grid lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Drop-off points */}
        <div className="admin-card">
          <Tooltip content="Chapters where readers stop reading most often">
            <h3 className="font-serif mb-4">Common Drop-off Points</h3>
          </Tooltip>
          <div className="space-y-4">
            {(dropOffPoints || []).length > 0 ? (
              dropOffPoints.map((point) => (
                <div key={point.chapter} className="flex items-center justify-between gap-4">
                  <span className="text-sm truncate flex-1">{point.chapter}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-20 md:w-32 h-2 bg-muted rounded overflow-hidden">
                      <div className="h-full bg-destructive" style={{ width: `${Math.min(point.percent * 5, 100)}%` }} />
                    </div>
                    <span className="text-sm text-muted-foreground w-12 text-right">{point.percent}%</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">Not enough data yet</p>
            )}
          </div>
        </div>

        {/* Re-read hotspots placeholder */}
        <div className="admin-card">
          <Tooltip content="Chapters that readers return to most often">
            <h3 className="font-serif mb-4">Re-read Hotspots</h3>
          </Tooltip>
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">Re-read tracking coming soon</p>
          </div>
        </div>
      </div>

      {/* Revenue chart placeholder */}
      <div className="admin-card">
        <Tooltip content="Monthly revenue from all sources">
          <h3 className="font-serif mb-4">Revenue Over Time</h3>
        </Tooltip>
        <div className="h-48 md:h-64 flex items-center justify-center bg-muted/50 rounded">
          <p className="text-muted-foreground text-center px-4">Revenue chart - connect Stripe for data</p>
        </div>
      </div>
    </motion.div>
  );
}

function SettingsTab() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [bio, setBio] = useState('');

  // Reader experience settings (stored in localStorage for now)
  const [ambientAudio, setAmbientAudio] = useState(() => 
    localStorage.getItem('settings.ambientAudio') !== 'false'
  );
  const [pureMode, setPureMode] = useState(() => 
    localStorage.getItem('settings.pureMode') !== 'false'
  );

  const handleSaveProfile = async () => {
    if (!profile?.user_id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          name: displayName.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', profile.user_id);

      if (error) throw error;

      toast({ title: 'Profile saved successfully' });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch (error: any) {
      toast({ title: 'Failed to save profile', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAmbientAudio = () => {
    const newValue = !ambientAudio;
    setAmbientAudio(newValue);
    localStorage.setItem('settings.ambientAudio', String(newValue));
    toast({ title: `Ambient audio ${newValue ? 'enabled' : 'disabled'}` });
  };

  const handleTogglePureMode = () => {
    const newValue = !pureMode;
    setPureMode(newValue);
    localStorage.setItem('settings.pureMode', String(newValue));
    toast({ title: `Pure mode ${newValue ? 'enabled' : 'disabled'}` });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-2xl"
    >
      <div className="admin-card mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h3 className="font-serif">Author Profile</h3>
          <Button onClick={handleSaveProfile} disabled={saving} className="w-full sm:w-auto">
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-input border border-border rounded px-4 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Email</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full bg-input border border-border rounded px-4 py-2 opacity-50 cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Bio</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-input border border-border rounded px-4 py-2 resize-none"
              placeholder="Tell readers about yourself..."
            />
          </div>
        </div>
      </div>

      <div className="admin-card mb-6">
        <h3 className="font-serif mb-4">Reader Experience</h3>
        <div className="space-y-4">
          <label className="flex items-center justify-between cursor-pointer gap-4">
            <div className="flex-1">
              <span className="block">Enable ambient audio</span>
              <span className="text-sm text-muted-foreground">Let readers play background music</span>
            </div>
            <button
              onClick={handleToggleAmbientAudio}
              className={`w-12 h-6 rounded-full relative transition-colors flex-shrink-0 ${
                ambientAudio ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <div className={`w-5 h-5 bg-primary-foreground rounded-full absolute top-0.5 transition-all ${
                ambientAudio ? 'right-0.5' : 'left-0.5'
              }`} />
            </button>
          </label>
          <label className="flex items-center justify-between cursor-pointer gap-4">
            <div className="flex-1">
              <span className="block">Allow Pure Mode</span>
              <span className="text-sm text-muted-foreground">Distraction-free reading option</span>
            </div>
            <button
              onClick={handleTogglePureMode}
              className={`w-12 h-6 rounded-full relative transition-colors flex-shrink-0 ${
                pureMode ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <div className={`w-5 h-5 bg-primary-foreground rounded-full absolute top-0.5 transition-all ${
                pureMode ? 'right-0.5' : 'left-0.5'
              }`} />
            </button>
          </label>
        </div>
      </div>

      <div className="admin-card">
        <h3 className="font-serif mb-4">Danger Zone</h3>
        <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10 w-full sm:w-auto">
          Delete All Data
        </Button>
      </div>
    </motion.div>
  );
}

function EmailTab() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <EmailInbox />
    </motion.div>
  );
}
