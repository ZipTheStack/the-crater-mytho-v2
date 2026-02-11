import { useState, useEffect } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Trash2, RefreshCw } from 'lucide-react';

interface Coupon {
  id: string;
  name: string;
  percent_off: number | null;
  amount_off: number | null;
  currency: string | null;
  duration: string;
  max_redemptions: number | null;
  times_redeemed: number;
}

interface CouponModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CouponModal({ open, onOpenChange }: CouponModalProps) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [code, setCode] = useState('');
  const [percentOff, setPercentOff] = useState('');
  const [duration, setDuration] = useState<'once' | 'repeating' | 'forever'>('once');
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const { toast } = useToast();

  const fetchCoupons = async () => {
    setFetching(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-coupons', {
        method: 'POST',
        body: { action: 'list' },
      });
      if (error) throw error;
      setCoupons(data?.coupons || []);
    } catch (error: any) {
      toast({ title: 'Failed to fetch coupons', description: error.message, variant: 'destructive' });
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchCoupons();
    }
  }, [open]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !percentOff) {
      toast({ title: 'Code and discount are required', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-coupons', {
        method: 'POST',
        body: {
          action: 'create',
          name: code.trim().toUpperCase(),
          percent_off: parseFloat(percentOff),
          duration,
          max_redemptions: maxRedemptions ? parseInt(maxRedemptions) : undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Coupon created successfully' });
      setCode('');
      setPercentOff('');
      setMaxRedemptions('');
      fetchCoupons();
    } catch (error: any) {
      toast({ title: 'Failed to create coupon', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (couponId: string) => {
    setDeleting(couponId);
    try {
      const { data, error } = await supabase.functions.invoke('manage-coupons', {
        method: 'POST',
        body: { action: 'delete', coupon_id: couponId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Coupon deleted' });
      setCoupons(coupons.filter(c => c.id !== couponId));
    } catch (error: any) {
      toast({ title: 'Failed to delete coupon', description: error.message, variant: 'destructive' });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">Manage Discount Codes</DialogTitle>
        </DialogHeader>

        {/* Create form */}
        <form onSubmit={handleCreate} className="space-y-4 border-b pb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="SUMMER20"
                required
              />
            </div>
            <div>
              <Label htmlFor="percentOff">Discount % *</Label>
              <Input
                id="percentOff"
                type="number"
                min="1"
                max="100"
                value={percentOff}
                onChange={(e) => setPercentOff(e.target.value)}
                placeholder="20"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration">Duration</Label>
              <Select value={duration} onValueChange={(v: 'once' | 'repeating' | 'forever') => setDuration(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Once</SelectItem>
                  <SelectItem value="repeating">Repeating</SelectItem>
                  <SelectItem value="forever">Forever</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="maxRedemptions">Max Uses (optional)</Label>
              <Input
                id="maxRedemptions"
                type="number"
                min="1"
                value={maxRedemptions}
                onChange={(e) => setMaxRedemptions(e.target.value)}
                placeholder="Unlimited"
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Create Coupon
          </Button>
        </form>

        {/* Existing coupons */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium">Existing Coupons</h4>
            <Button variant="ghost" size="sm" onClick={fetchCoupons} disabled={fetching}>
              <RefreshCw className={`w-4 h-4 ${fetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {fetching ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : coupons.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No coupons yet</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {coupons.map((coupon) => (
                <div key={coupon.id} className="flex items-center justify-between p-3 bg-muted rounded">
                  <div>
                    <span className="font-mono text-sm font-medium">{coupon.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {coupon.percent_off ? `${coupon.percent_off}% off` : 
                       coupon.amount_off ? `$${(coupon.amount_off / 100).toFixed(2)} off` : ''}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({coupon.times_redeemed} used{coupon.max_redemptions ? `/${coupon.max_redemptions}` : ''})
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(coupon.id)}
                    disabled={deleting === coupon.id}
                    className="text-destructive hover:text-destructive"
                  >
                    {deleting === coupon.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
