import { useState } from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  useEmailAccounts, 
  useEmailMessages, 
  useSyncEmails,
  useUpdateEmailMessage,
  useDeleteEmailMessage,
  type EmailMessage 
} from '@/hooks/useEmailData';
import { EmailAccountSetup } from './EmailAccountSetup';
import { EmailCompose } from './EmailCompose';
import { EmailReader } from './EmailReader';
import { 
  Mail, 
  Inbox, 
  Send, 
  FileEdit, 
  Trash2, 
  Star, 
  Clock, 
  RefreshCw, 
  Plus, 
  Search,
  Settings,
  Loader2,
  MailOpen,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

type Folder = 'inbox' | 'sent' | 'drafts' | 'trash';

export function EmailInbox() {
  const [showSetup, setShowSetup] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [activeFolder, setActiveFolder] = useState<Folder>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [replyTo, setReplyTo] = useState<EmailMessage | null>(null);

  const { data: accounts, isLoading: accountsLoading } = useEmailAccounts();
  const activeAccount = accounts?.[0]; // Use first account for now

  const { data: emailData, isLoading: messagesLoading, refetch } = useEmailMessages(
    activeAccount?.id || null,
    activeFolder,
    page,
    searchQuery || undefined
  );

  const syncMutation = useSyncEmails();
  const updateMutation = useUpdateEmailMessage();
  const deleteMutation = useDeleteEmailMessage();

  const folders: { id: Folder; label: string; icon: React.ReactNode }[] = [
    { id: 'inbox', label: 'Inbox', icon: <Inbox className="w-4 h-4" /> },
    { id: 'sent', label: 'Sent', icon: <Send className="w-4 h-4" /> },
    { id: 'drafts', label: 'Drafts', icon: <FileEdit className="w-4 h-4" /> },
    { id: 'trash', label: 'Trash', icon: <Trash2 className="w-4 h-4" /> },
  ];

  const handleSync = async () => {
    if (!activeAccount) return;
    await syncMutation.mutateAsync({ account_id: activeAccount.id, folder: activeFolder });
    refetch();
  };

  const handleMarkRead = async (message: EmailMessage) => {
    await updateMutation.mutateAsync({ id: message.id, updates: { is_read: true } });
  };

  const handleToggleStar = async (message: EmailMessage) => {
    await updateMutation.mutateAsync({ id: message.id, updates: { is_starred: !message.is_starred } });
  };

  const handleDelete = async (message: EmailMessage) => {
    await deleteMutation.mutateAsync({ id: message.id, permanent: activeFolder === 'trash' });
    setSelectedMessage(null);
  };

  const handleReply = (message: EmailMessage) => {
    setReplyTo(message);
    setShowCompose(true);
  };

  const handleMessageClick = async (message: EmailMessage) => {
    setSelectedMessage(message);
    if (!message.is_read) {
      await handleMarkRead(message);
    }
  };

  // No accounts connected
  if (!accountsLoading && (!accounts || accounts.length === 0)) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16"
      >
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
          <Mail className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-serif mb-2">Connect Your Email</h3>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          Connect your email account to read, reply, and manage emails directly from your dashboard.
          All outgoing emails will be sent from your domain.
        </p>
        <Button onClick={() => setShowSetup(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Connect Email Account
        </Button>
        <EmailAccountSetup open={showSetup} onOpenChange={setShowSetup} />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex h-[calc(100vh-200px)] min-h-[600px]"
    >
      {/* Sidebar */}
      <div className="w-56 border-r border-border pr-4 flex flex-col">
        <Button onClick={() => setShowCompose(true)} className="mb-4">
          <Plus className="w-4 h-4 mr-2" />
          Compose
        </Button>

        <nav className="space-y-1 flex-1">
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => {
                setActiveFolder(folder.id);
                setPage(1);
                setSelectedMessage(null);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                activeFolder === folder.id
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {folder.icon}
              <span className="text-sm">{folder.label}</span>
            </button>
          ))}
        </nav>

        <div className="pt-4 border-t border-border">
          <button
            onClick={() => setShowSetup(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors text-left"
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm">Account Settings</span>
          </button>
        </div>
      </div>

      {/* Message List or Reader */}
      <div className="flex-1 flex flex-col ml-4">
        {selectedMessage ? (
          <EmailReader
            message={selectedMessage}
            onBack={() => setSelectedMessage(null)}
            onReply={() => handleReply(selectedMessage)}
            onDelete={() => handleDelete(selectedMessage)}
            onToggleStar={() => handleToggleStar(selectedMessage)}
          />
        ) : (
          <>
            {/* Toolbar */}
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search emails..."
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleSync}
                disabled={syncMutation.isPending}
              >
                <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Account Info */}
            {activeAccount && (
              <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>{activeAccount.email_address}</span>
                <Badge variant="outline" className="text-xs">
                  {activeAccount.provider}
                </Badge>
              </div>
            )}

            {/* Message List */}
            <ScrollArea className="flex-1">
              {messagesLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : emailData?.messages?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <MailOpen className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery ? 'No emails match your search' : `No emails in ${activeFolder}`}
                  </p>
                  {activeFolder === 'inbox' && !searchQuery && (
                    <Button variant="outline" onClick={handleSync} className="mt-4">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync Emails
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  {emailData?.messages?.map((message) => (
                    <button
                      key={message.id}
                      onClick={() => handleMessageClick(message)}
                      className={`w-full text-left p-4 rounded-lg border transition-colors ${
                        !message.is_read
                          ? 'bg-accent/50 border-accent'
                          : 'bg-card border-border hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStar(message);
                          }}
                          className="mt-1"
                        >
                          <Star
                            className={`w-4 h-4 ${
                              message.is_starred
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-muted-foreground'
                            }`}
                          />
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm truncate ${!message.is_read ? 'font-semibold' : ''}`}>
                              {message.from_name || message.from_address}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(message.received_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className={`text-sm truncate ${!message.is_read ? 'font-medium' : 'text-muted-foreground'}`}>
                            {message.subject || '(No subject)'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {message.body_text?.slice(0, 100) || ''}
                          </p>
                        </div>

                        {message.follow_up_at && (
                          <Clock className="w-4 h-4 text-amber-500 mt-1" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Pagination */}
            {emailData && emailData.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
                <span className="text-sm text-muted-foreground">
                  Page {emailData.page} of {emailData.totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= emailData.totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <EmailAccountSetup open={showSetup} onOpenChange={setShowSetup} />
      <EmailCompose
        open={showCompose}
        onOpenChange={(open) => {
          setShowCompose(open);
          if (!open) setReplyTo(null);
        }}
        account={activeAccount || null}
        replyTo={replyTo}
      />
    </motion.div>
  );
}
