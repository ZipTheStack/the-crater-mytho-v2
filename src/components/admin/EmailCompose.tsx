import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useSendEmail, type EmailAccount, type EmailMessage } from '@/hooks/useEmailData';
import { Send, Loader2, X, Plus } from 'lucide-react';

interface EmailComposeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: EmailAccount | null;
  replyTo?: EmailMessage | null;
  forwardMessage?: EmailMessage | null;
}

export function EmailCompose({ 
  open, 
  onOpenChange, 
  account, 
  replyTo,
  forwardMessage 
}: EmailComposeProps) {
  const { toast } = useToast();
  const sendMutation = useSendEmail();

  const [to, setTo] = useState<string[]>(['']);
  const [cc, setCc] = useState<string[]>([]);
  const [bcc, setBcc] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);

  // Reset form when opening or when replyTo/forwardMessage changes
  useEffect(() => {
    if (open) {
      if (replyTo) {
        setTo([replyTo.from_address]);
        setSubject(`Re: ${replyTo.subject || ''}`);
        setBody(`\n\n--- Original Message ---\nFrom: ${replyTo.from_name || replyTo.from_address}\nDate: ${new Date(replyTo.received_at).toLocaleString()}\n\n${replyTo.body_text || ''}`);
      } else if (forwardMessage) {
        setTo(['']);
        setSubject(`Fwd: ${forwardMessage.subject || ''}`);
        setBody(`\n\n--- Forwarded Message ---\nFrom: ${forwardMessage.from_name || forwardMessage.from_address}\nDate: ${new Date(forwardMessage.received_at).toLocaleString()}\n\n${forwardMessage.body_text || ''}`);
      } else {
        setTo(['']);
        setCc([]);
        setBcc([]);
        setSubject('');
        setBody('');
        setShowCc(false);
        setShowBcc(false);
      }
    }
  }, [open, replyTo, forwardMessage]);

  const handleAddRecipient = (type: 'to' | 'cc' | 'bcc') => {
    if (type === 'to') setTo([...to, '']);
    else if (type === 'cc') setCc([...cc, '']);
    else setBcc([...bcc, '']);
  };

  const handleRemoveRecipient = (type: 'to' | 'cc' | 'bcc', index: number) => {
    if (type === 'to' && to.length > 1) setTo(to.filter((_, i) => i !== index));
    else if (type === 'cc') setCc(cc.filter((_, i) => i !== index));
    else setBcc(bcc.filter((_, i) => i !== index));
  };

  const handleRecipientChange = (type: 'to' | 'cc' | 'bcc', index: number, value: string) => {
    if (type === 'to') {
      const newTo = [...to];
      newTo[index] = value;
      setTo(newTo);
    } else if (type === 'cc') {
      const newCc = [...cc];
      newCc[index] = value;
      setCc(newCc);
    } else {
      const newBcc = [...bcc];
      newBcc[index] = value;
      setBcc(newBcc);
    }
  };

  const handleSend = async () => {
    if (!account) {
      toast({ title: 'No email account connected', variant: 'destructive' });
      return;
    }

    const validTo = to.filter(email => email.trim());
    if (validTo.length === 0) {
      toast({ title: 'Please add at least one recipient', variant: 'destructive' });
      return;
    }

    try {
      await sendMutation.mutateAsync({
        account_id: account.id,
        to: validTo,
        cc: cc.filter(email => email.trim()),
        bcc: bcc.filter(email => email.trim()),
        subject,
        body_text: body,
        body_html: `<pre style="font-family: sans-serif; white-space: pre-wrap;">${body}</pre>`,
        reply_to_message_id: replyTo?.message_id,
      });

      toast({ title: 'Email sent successfully!' });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Failed to send email', description: error.message, variant: 'destructive' });
    }
  };

  const renderRecipientField = (
    type: 'to' | 'cc' | 'bcc',
    recipients: string[],
    label: string
  ) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <button
          type="button"
          onClick={() => handleAddRecipient(type)}
          className="text-xs text-primary hover:underline"
        >
          Add another
        </button>
      </div>
      {recipients.map((email, index) => (
        <div key={index} className="flex gap-2">
          <Input
            type="email"
            value={email}
            onChange={(e) => handleRecipientChange(type, index, e.target.value)}
            placeholder="email@example.com"
          />
          {(type !== 'to' || recipients.length > 1) && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveRecipient(type, index)}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {replyTo ? 'Reply' : forwardMessage ? 'Forward' : 'New Email'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* From (read-only) */}
          {account && (
            <div className="space-y-2">
              <Label>From</Label>
              <Input
                value={account.display_name ? `${account.display_name} <${account.email_address}>` : account.email_address}
                disabled
                className="bg-muted"
              />
            </div>
          )}

          {/* To */}
          {renderRecipientField('to', to, 'To')}

          {/* CC/BCC toggles */}
          <div className="flex gap-4">
            {!showCc && (
              <button
                type="button"
                onClick={() => {
                  setShowCc(true);
                  if (cc.length === 0) setCc(['']);
                }}
                className="text-sm text-primary hover:underline"
              >
                Add CC
              </button>
            )}
            {!showBcc && (
              <button
                type="button"
                onClick={() => {
                  setShowBcc(true);
                  if (bcc.length === 0) setBcc(['']);
                }}
                className="text-sm text-primary hover:underline"
              >
                Add BCC
              </button>
            )}
          </div>

          {/* CC */}
          {showCc && renderRecipientField('cc', cc, 'CC')}

          {/* BCC */}
          {showBcc && renderRecipientField('bcc', bcc, 'BCC')}

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
              rows={12}
              className="resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={sendMutation.isPending}
            >
              {sendMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
