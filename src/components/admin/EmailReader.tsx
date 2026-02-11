import { format } from 'date-fns';
import { motion } from 'framer-motion';
import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { type EmailMessage } from '@/hooks/useEmailData';
import { 
  ArrowLeft, 
  Reply, 
  Forward, 
  Trash2, 
  Star, 
  Clock, 
  MoreHorizontal,
  Paperclip
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface EmailReaderProps {
  message: EmailMessage;
  onBack: () => void;
  onReply: () => void;
  onDelete: () => void;
  onToggleStar: () => void;
  onForward?: () => void;
  onSetFollowUp?: (date: Date | null) => void;
}

export function EmailReader({
  message,
  onBack,
  onReply,
  onDelete,
  onToggleStar,
  onForward,
  onSetFollowUp,
}: EmailReaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>

        <div className="flex-1" />

        <Button variant="ghost" size="icon" onClick={onToggleStar}>
          <Star
            className={`w-4 h-4 ${
              message.is_starred
                ? 'fill-amber-400 text-amber-400'
                : 'text-muted-foreground'
            }`}
          />
        </Button>

        <Button variant="outline" size="sm" onClick={onReply}>
          <Reply className="w-4 h-4 mr-2" />
          Reply
        </Button>

        {onForward && (
          <Button variant="outline" size="sm" onClick={onForward}>
            <Forward className="w-4 h-4 mr-2" />
            Forward
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onSetFollowUp?.(new Date(Date.now() + 86400000))}>
              <Clock className="w-4 h-4 mr-2" />
              Follow up tomorrow
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSetFollowUp?.(new Date(Date.now() + 604800000))}>
              <Clock className="w-4 h-4 mr-2" />
              Follow up next week
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSetFollowUp?.(null)}>
              <Clock className="w-4 h-4 mr-2" />
              Clear follow-up
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Email Content */}
      <div className="admin-card flex-1 flex flex-col overflow-hidden">
        {/* Subject */}
        <h2 className="text-xl font-serif mb-4">
          {message.subject || '(No subject)'}
        </h2>

        {/* Follow-up Badge */}
        {message.follow_up_at && (
          <div className="mb-4">
            <Badge variant="outline" className="bg-amber-500/10 text-amber-200 border-amber-500/20">
              <Clock className="w-3 h-3 mr-1" />
              Follow up: {format(new Date(message.follow_up_at), 'MMM d, yyyy')}
            </Badge>
          </div>
        )}

        {/* Sender Info */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg font-serif">
            {(message.from_name || message.from_address).charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {message.from_name || message.from_address}
              </span>
              {message.from_name && (
                <span className="text-sm text-muted-foreground">
                  &lt;{message.from_address}&gt;
                </span>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {format(new Date(message.received_at), 'MMMM d, yyyy \'at\' h:mm a')}
            </div>
          </div>
        </div>

        {/* Recipients */}
        <div className="text-sm text-muted-foreground mb-4 space-y-1">
          <div>
            <span className="font-medium">To:</span>{' '}
            {Array.isArray(message.to_addresses) 
              ? message.to_addresses.join(', ') 
              : message.to_addresses}
          </div>
          {message.cc_addresses && message.cc_addresses.length > 0 && (
            <div>
              <span className="font-medium">CC:</span>{' '}
              {Array.isArray(message.cc_addresses) 
                ? message.cc_addresses.join(', ') 
                : message.cc_addresses}
            </div>
          )}
        </div>

        {/* Attachments */}
        {message.has_attachments && (
          <div className="flex items-center gap-2 mb-4 p-2 bg-muted rounded">
            <Paperclip className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              This email has attachments (not yet supported)
            </span>
          </div>
        )}

        <Separator className="my-4" />

        {/* Body */}
        <ScrollArea className="flex-1">
          {message.body_html ? (
            <div 
              className="prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message.body_html) }}
            />
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-sm">
              {message.body_text || '(No content)'}
            </pre>
          )}
        </ScrollArea>
      </div>
    </motion.div>
  );
}
