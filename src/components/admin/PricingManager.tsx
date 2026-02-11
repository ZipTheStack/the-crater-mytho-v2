import { useState } from 'react';
import {
  useAdminPricing,
  useCreatePrice,
  useUpdatePrice,
  useUpdatePriceAmount,
  useArchivePrice,
  useRestorePrice,
  formatPrice,
  StripePrice,
} from '@/hooks/usePricing';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Edit2, Archive, RotateCcw, DollarSign, AlertTriangle } from 'lucide-react';

export function PricingManager() {
  const [showArchived, setShowArchived] = useState(false);
  const [editingPrice, setEditingPrice] = useState<StripePrice | null>(null);
  const [editingAmount, setEditingAmount] = useState<StripePrice | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [archiveConfirm, setArchiveConfirm] = useState<StripePrice | null>(null);

  const { data: prices, isLoading, refetch } = useAdminPricing(showArchived);
  const createPrice = useCreatePrice();
  const updatePrice = useUpdatePrice();
  const updateAmount = useUpdatePriceAmount();
  const archivePrice = useArchivePrice();
  const restorePrice = useRestorePrice();

  // Group prices by type
  const subscriptionPrices = prices?.filter(p => p.price_type === 'subscription') || [];
  const oneTimePrices = prices?.filter(p => p.price_type === 'one_time') || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-serif">Pricing Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage subscription tiers and one-time purchase prices
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-archived"
              checked={showArchived}
              onCheckedChange={setShowArchived}
            />
            <Label htmlFor="show-archived" className="text-sm">Show archived</Label>
          </div>
          <Button onClick={() => setCreatingNew(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Price
          </Button>
        </div>
      </div>

      {/* Subscription Prices */}
      <div className="admin-card">
        <h4 className="font-serif mb-4">Subscription Tiers</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subscriptionPrices.map((price) => (
            <PriceCard
              key={price.id}
              price={price}
              onEdit={() => setEditingPrice(price)}
              onEditAmount={() => setEditingAmount(price)}
              onArchive={() => setArchiveConfirm(price)}
              onRestore={() => restorePrice.mutate(price.id)}
            />
          ))}
          {subscriptionPrices.length === 0 && (
            <p className="text-muted-foreground text-sm col-span-2 text-center py-4">
              No subscription prices found
            </p>
          )}
        </div>
      </div>

      {/* One-Time Prices */}
      <div className="admin-card">
        <h4 className="font-serif mb-4">One-Time Purchases</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {oneTimePrices.map((price) => (
            <PriceCard
              key={price.id}
              price={price}
              onEdit={() => setEditingPrice(price)}
              onEditAmount={() => setEditingAmount(price)}
              onArchive={() => setArchiveConfirm(price)}
              onRestore={() => restorePrice.mutate(price.id)}
            />
          ))}
          {oneTimePrices.length === 0 && (
            <p className="text-muted-foreground text-sm col-span-2 text-center py-4">
              No one-time prices found
            </p>
          )}
        </div>
      </div>

      {/* Edit Info Modal */}
      <EditPriceModal
        price={editingPrice}
        open={!!editingPrice}
        onOpenChange={(open) => !open && setEditingPrice(null)}
        onSave={async (data) => {
          await updatePrice.mutateAsync(data);
          setEditingPrice(null);
        }}
        isLoading={updatePrice.isPending}
      />

      {/* Edit Amount Modal */}
      <EditAmountModal
        price={editingAmount}
        open={!!editingAmount}
        onOpenChange={(open) => !open && setEditingAmount(null)}
        onSave={async (data) => {
          await updateAmount.mutateAsync(data);
          setEditingAmount(null);
        }}
        isLoading={updateAmount.isPending}
      />

      {/* Create New Modal */}
      <CreatePriceModal
        open={creatingNew}
        onOpenChange={setCreatingNew}
        onSave={async (data) => {
          await createPrice.mutateAsync(data);
          setCreatingNew(false);
        }}
        isLoading={createPrice.isPending}
      />

      {/* Archive Confirmation */}
      <AlertDialog open={!!archiveConfirm} onOpenChange={(open) => !open && setArchiveConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this price?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate "{archiveConfirm?.display_name}" ({formatPrice(archiveConfirm?.amount_cents || 0)}).
              Existing subscribers will keep their current pricing until renewal.
              You can restore this price later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (archiveConfirm) {
                  archivePrice.mutate(archiveConfirm.id);
                  setArchiveConfirm(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Price Card Component
function PriceCard({
  price,
  onEdit,
  onEditAmount,
  onArchive,
  onRestore,
}: {
  price: StripePrice;
  onEdit: () => void;
  onEditAmount: () => void;
  onArchive: () => void;
  onRestore: () => void;
}) {
  const isArchived = !price.is_active;

  return (
    <div className={`p-4 rounded-lg border ${isArchived ? 'bg-muted/50 opacity-60' : 'bg-card'}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h5 className="font-medium">{price.display_name}</h5>
          <p className="text-2xl font-serif text-primary">
            {formatPrice(price.amount_cents)}
            {price.billing_interval && (
              <span className="text-sm text-muted-foreground ml-1">
                /{price.billing_interval === 'month' ? 'mo' : 'yr'}
              </span>
            )}
          </p>
        </div>
        {isArchived && (
          <span className="text-xs bg-muted px-2 py-1 rounded">Archived</span>
        )}
      </div>

      {price.description && (
        <p className="text-sm text-muted-foreground mb-2">{price.description}</p>
      )}

      {price.features && price.features.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-1 mb-3">
          {price.features.slice(0, 3).map((feature, i) => (
            <li key={i}>• {feature}</li>
          ))}
          {price.features.length > 3 && (
            <li className="text-primary">+ {price.features.length - 3} more</li>
          )}
        </ul>
      )}

      <div className="flex items-center gap-2 pt-2 border-t">
        <code className="text-[10px] text-muted-foreground flex-1 truncate">
          {price.price_key}
        </code>
        {isArchived ? (
          <Button variant="outline" size="sm" onClick={onRestore}>
            <RotateCcw className="w-3 h-3 mr-1" />
            Restore
          </Button>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit2 className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onEditAmount}>
              <DollarSign className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onArchive} className="text-destructive">
              <Archive className="w-3 h-3" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// Edit Price Info Modal
function EditPriceModal({
  price,
  open,
  onOpenChange,
  onSave,
  isLoading,
}: {
  price: StripePrice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { id: string; display_name: string; description: string; features: string[] }) => Promise<void>;
  isLoading: boolean;
}) {
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [featuresText, setFeaturesText] = useState('');

  // Reset form when price changes
  useState(() => {
    if (price) {
      setDisplayName(price.display_name);
      setDescription(price.description || '');
      setFeaturesText(price.features?.join('\n') || '');
    }
  });

  // Also reset on open
  if (open && price && displayName !== price.display_name) {
    setDisplayName(price.display_name);
    setDescription(price.description || '');
    setFeaturesText(price.features?.join('\n') || '');
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!price) return;

    const features = featuresText.split('\n').filter(f => f.trim());
    await onSave({
      id: price.id,
      display_name: displayName,
      description,
      features,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Price Info</DialogTitle>
          <DialogDescription>
            Update display name, description, and features. This won't affect Stripe pricing.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="features">Features (one per line)</Label>
            <Textarea
              id="features"
              value={featuresText}
              onChange={(e) => setFeaturesText(e.target.value)}
              rows={5}
              placeholder="Access to all books&#10;Early access to new content&#10;Member-only updates"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Edit Amount Modal
function EditAmountModal({
  price,
  open,
  onOpenChange,
  onSave,
  isLoading,
}: {
  price: StripePrice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { id: string; amount_cents: number }) => Promise<void>;
  isLoading: boolean;
}) {
  const [amountDollars, setAmountDollars] = useState('');

  // Reset form when price changes
  if (open && price && !amountDollars) {
    setAmountDollars((price.amount_cents / 100).toFixed(2));
  }

  // Clear on close
  if (!open && amountDollars) {
    setAmountDollars('');
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!price) return;

    const amountCents = Math.round(parseFloat(amountDollars) * 100);
    await onSave({ id: price.id, amount_cents: amountCents });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Price Amount</DialogTitle>
          <DialogDescription>
            <span className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="w-4 h-4" />
              This will create a new Stripe price and archive the old one
            </span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Current Price</Label>
            <p className="text-lg font-serif">{formatPrice(price?.amount_cents || 0)}</p>
          </div>
          <div>
            <Label htmlFor="newAmount">New Price (USD)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="newAmount"
                type="number"
                step="0.01"
                min="0.50"
                value={amountDollars}
                onChange={(e) => setAmountDollars(e.target.value)}
                className="pl-7"
                required
              />
            </div>
          </div>
          <div className="bg-muted/50 p-3 rounded text-sm text-muted-foreground">
            <p><strong>Note:</strong> Existing subscribers will keep their current price until their subscription renews.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Update Price
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Create New Price Modal
function CreatePriceModal({
  open,
  onOpenChange,
  onSave,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    price_key: string;
    display_name: string;
    description?: string;
    amount_cents: number;
    price_type: 'subscription' | 'one_time';
    billing_interval?: 'month' | 'year';
    tier?: 'reader' | 'inner_circle' | 'book';
    features?: string[];
  }) => Promise<void>;
  isLoading: boolean;
}) {
  const [priceKey, setPriceKey] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [amountDollars, setAmountDollars] = useState('');
  const [priceType, setPriceType] = useState<'subscription' | 'one_time'>('subscription');
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const [tier, setTier] = useState<'reader' | 'inner_circle' | 'book' | ''>('');
  const [featuresText, setFeaturesText] = useState('');

  const resetForm = () => {
    setPriceKey('');
    setDisplayName('');
    setDescription('');
    setAmountDollars('');
    setPriceType('subscription');
    setBillingInterval('month');
    setTier('');
    setFeaturesText('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountCents = Math.round(parseFloat(amountDollars) * 100);
    const features = featuresText.split('\n').filter(f => f.trim());

    await onSave({
      price_key: priceKey,
      display_name: displayName,
      description: description || undefined,
      amount_cents: amountCents,
      price_type: priceType,
      billing_interval: priceType === 'subscription' ? billingInterval : undefined,
      tier: tier || undefined,
      features: features.length > 0 ? features : undefined,
    });

    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Price</DialogTitle>
          <DialogDescription>
            This will create a new product and price in Stripe
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priceKey">Price Key *</Label>
              <Input
                id="priceKey"
                value={priceKey}
                onChange={(e) => setPriceKey(e.target.value.toLowerCase().replace(/\s/g, '_'))}
                placeholder="new_tier_monthly"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">Unique identifier (no spaces)</p>
            </div>
            <div>
              <Label htmlFor="displayName">Display Name *</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="New Tier"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priceType">Price Type *</Label>
              <Select value={priceType} onValueChange={(v: 'subscription' | 'one_time') => setPriceType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subscription">Subscription</SelectItem>
                  <SelectItem value="one_time">One-Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {priceType === 'subscription' && (
              <div>
                <Label htmlFor="billingInterval">Billing Interval</Label>
                <Select value={billingInterval} onValueChange={(v: 'month' | 'year') => setBillingInterval(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Monthly</SelectItem>
                    <SelectItem value="year">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Price (USD) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.50"
                  value={amountDollars}
                  onChange={(e) => setAmountDollars(e.target.value)}
                  className="pl-7"
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="tier">Tier Category</Label>
              <Select value={tier} onValueChange={(v) => setTier(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tier..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reader">Reader</SelectItem>
                  <SelectItem value="inner_circle">Inner Circle</SelectItem>
                  <SelectItem value="book">Book</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="features">Features (one per line)</Label>
            <Textarea
              id="features"
              value={featuresText}
              onChange={(e) => setFeaturesText(e.target.value)}
              rows={4}
              placeholder="Feature one&#10;Feature two&#10;Feature three"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Price
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
