import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useCreateEmailAccount, useTestEmailAccount, type EmailAccountConfig } from '@/hooks/useEmailData';
import { Mail, Loader2, CheckCircle, AlertCircle, HelpCircle } from 'lucide-react';

interface EmailAccountSetupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const providerInfo = {
  resend: {
    name: 'Resend',
    description: 'Modern transactional email service (recommended for auth emails)',
    smtpHint: 'smtp.resend.com',
    imapHint: 'N/A (SMTP only)',
    smtpPort: 587,
    imapPort: 0,
    note: 'Resend is SMTP-only. Use for sending emails, not receiving.',
  },
  siteground: {
    name: 'Siteground / cPanel',
    description: 'Use your domain email hosted on Siteground or any cPanel hosting',
    smtpHint: 'Usually mail.yourdomain.com or gtxm####.siteground.biz',
    imapHint: 'Usually mail.yourdomain.com or gtxm####.siteground.biz',
    smtpPort: 465,
    imapPort: 993,
  },
  gmail: {
    name: 'Gmail',
    description: 'Connect your Gmail account using an App Password',
    smtpHint: 'smtp.gmail.com',
    imapHint: 'imap.gmail.com',
    smtpPort: 587,
    imapPort: 993,
  },
  outlook: {
    name: 'Outlook / Microsoft 365',
    description: 'Connect your Outlook or Microsoft 365 email',
    smtpHint: 'smtp-mail.outlook.com',
    imapHint: 'outlook.office365.com',
    smtpPort: 587,
    imapPort: 993,
  },
  custom: {
    name: 'Custom IMAP/SMTP',
    description: 'Configure custom email server settings',
    smtpHint: 'Enter your SMTP server',
    imapHint: 'Enter your IMAP server',
    smtpPort: 587,
    imapPort: 993,
  },
};

export function EmailAccountSetup({ open, onOpenChange }: EmailAccountSetupProps) {
  const { toast } = useToast();
  const createAccount = useCreateEmailAccount();
  const testAccount = useTestEmailAccount();

  const [provider, setProvider] = useState<'resend' | 'gmail' | 'outlook' | 'siteground' | 'custom'>('siteground');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(465);
  const [imapHost, setImapHost] = useState('');
  const [imapPort, setImapPort] = useState(993);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const info = providerInfo[provider];

  const handleProviderChange = (value: 'resend' | 'gmail' | 'outlook' | 'siteground' | 'custom') => {
    setProvider(value);
    const newInfo = providerInfo[value];
    setSmtpPort(newInfo.smtpPort);
    setImapPort(newInfo.imapPort);

    // Auto-fill known hosts
    if (value === 'resend') {
      setSmtpHost('smtp.resend.com');
      setImapHost(''); // Resend is SMTP-only
    } else if (value === 'gmail') {
      setSmtpHost('smtp.gmail.com');
      setImapHost('imap.gmail.com');
    } else if (value === 'outlook') {
      setSmtpHost('smtp-mail.outlook.com');
      setImapHost('outlook.office365.com');
    } else {
      setSmtpHost('');
      setImapHost('');
    }
  };

  const handleTest = async () => {
    if (!email || !password) {
      toast({ title: 'Please fill in email and password', variant: 'destructive' });
      return;
    }

    setTestResult(null);
    
    const config: EmailAccountConfig = {
      provider,
      email_address: email,
      display_name: displayName,
      smtp_host: smtpHost || `mail.${email.split('@')[1]}`,
      smtp_port: smtpPort,
      imap_host: imapHost || `mail.${email.split('@')[1]}`,
      imap_port: imapPort,
      password,
    };

    try {
      const result = await testAccount.mutateAsync(config);
      setTestResult(result);
    } catch (error: any) {
      setTestResult({ success: false, message: error.message });
    }
  };

  const handleSubmit = async () => {
    if (!email || !password) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    const config: EmailAccountConfig = {
      provider,
      email_address: email,
      display_name: displayName,
      smtp_host: smtpHost || `mail.${email.split('@')[1]}`,
      smtp_port: smtpPort,
      imap_host: imapHost || `mail.${email.split('@')[1]}`,
      imap_port: imapPort,
      password,
    };

    try {
      await createAccount.mutateAsync(config);
      toast({ title: 'Email account connected successfully!' });
      onOpenChange(false);
      // Reset form
      setEmail('');
      setPassword('');
      setDisplayName('');
      setTestResult(null);
    } catch (error: any) {
      toast({ title: 'Failed to connect account', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Connect Email Account
          </DialogTitle>
          <DialogDescription>
            Connect your email to read and send messages from the dashboard
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Provider Selection */}
          <div className="space-y-2">
            <Label>Email Provider</Label>
            <Select value={provider} onValueChange={handleProviderChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="resend">Resend (Recommended)</SelectItem>
                <SelectItem value="siteground">Siteground / cPanel</SelectItem>
                <SelectItem value="gmail">Gmail</SelectItem>
                <SelectItem value="outlook">Outlook / Microsoft 365</SelectItem>
                <SelectItem value="custom">Custom IMAP/SMTP</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">{info.description}</p>
          </div>

          {/* Gmail App Password Note */}
          {provider === 'gmail' && (
            <div className="p-3 bg-accent/50 border border-accent rounded-lg">
              <div className="flex gap-2">
                <HelpCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Gmail requires an App Password. Go to Google Account → Security → 2-Step Verification → App passwords to create one.
                </p>
              </div>
            </div>
          )}

          {/* Email Address */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="heather@thecratermythos.com"
            />
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Heather"
            />
            <p className="text-xs text-muted-foreground">How your name appears in sent emails</p>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your email password or app password"
            />
          </div>

          {/* Advanced Settings (for custom or siteground) */}
          {(provider === 'custom' || provider === 'siteground') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4 pt-4 border-t border-border"
            >
              <p className="text-sm font-medium">Server Settings</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">SMTP Host</Label>
                  <Input
                    id="smtpHost"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder={info.smtpHint}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">SMTP Port</Label>
                  <Input
                    id="smtpPort"
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="imapHost">IMAP Host</Label>
                  <Input
                    id="imapHost"
                    value={imapHost}
                    onChange={(e) => setImapHost(e.target.value)}
                    placeholder={info.imapHint}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imapPort">IMAP Port</Label>
                  <Input
                    id="imapPort"
                    type="number"
                    value={imapPort}
                    onChange={(e) => setImapPort(parseInt(e.target.value))}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {testResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`p-3 rounded-lg flex items-center gap-2 ${
                testResult.success 
                  ? 'bg-accent/50 border border-accent' 
                  : 'bg-destructive/10 border border-destructive/20'
              }`}
            >
              {testResult.success ? (
                <CheckCircle className="w-4 h-4 text-primary" />
              ) : (
                <AlertCircle className="w-4 h-4 text-destructive" />
              )}
              <span className={`text-sm ${testResult.success ? 'text-foreground' : 'text-destructive'}`}>
                {testResult.message}
              </span>
            </motion.div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={testAccount.isPending || !email || !password}
              className="flex-1"
            >
              {testAccount.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Test Connection
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createAccount.isPending || !email || !password}
              className="flex-1"
            >
              {createAccount.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Connect Account
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
