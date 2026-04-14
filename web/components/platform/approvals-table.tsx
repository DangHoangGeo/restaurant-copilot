'use client';

// Pending Approvals Table Component

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { RestaurantSummary } from '@/shared/types/platform';

export default function ApprovalsTable() {
  const t = useTranslations('platform.approvals');
  const tc = useTranslations('platform.common');

  const [restaurants, setRestaurants] = useState<RestaurantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantSummary | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [approveNotes, setApproveNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const errorLabel = tc('error');

  const fetchPendingApprovals = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/v1/platform/restaurants?verified=unverified', {
        signal: controller.signal
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error || errorLabel);
      }

      if (requestId !== requestIdRef.current) return;

      setRestaurants(body.data || []);
    } catch (error) {
      if (controller.signal.aborted || requestId !== requestIdRef.current) return;
      console.error('Error fetching approvals:', error);
      setError(error instanceof Error ? error.message : errorLabel);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }, [errorLabel]);

  useEffect(() => {
    fetchPendingApprovals();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchPendingApprovals]);

  const handleApprove = async () => {
    if (!selectedRestaurant) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/v1/platform/restaurants/${selectedRestaurant.id}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: approveNotes })
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error || errorLabel);
      }

      setApproveDialogOpen(false);
      setApproveNotes('');
      setSelectedRestaurant(null);
      fetchPendingApprovals();
    } catch (error) {
      console.error('Error approving restaurant:', error);
      setError(error instanceof Error ? error.message : errorLabel);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRestaurant || !rejectReason) return;

    try {
      setSubmitting(true);
      const response = await fetch('/api/v1/platform/restaurants/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: selectedRestaurant.id,
          reason: rejectReason
        })
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error || errorLabel);
      }

      setRejectDialogOpen(false);
      setRejectReason('');
      setSelectedRestaurant(null);
      fetchPendingApprovals();
    } catch (error) {
      console.error('Error rejecting restaurant:', error);
      setError(error instanceof Error ? error.message : errorLabel);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">{t('loading')}</div>;
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600 space-y-3">
        <p>{error}</p>
        <Button variant="outline" size="sm" onClick={fetchPendingApprovals}>
          {tc('refresh')}
        </Button>
      </div>
    );
  }

  if (restaurants.length === 0) {
    return <div className="text-center py-8 text-gray-500">{t('empty')}</div>;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('table.restaurant')}</TableHead>
            <TableHead>{t('table.email')}</TableHead>
            <TableHead>{t('table.created_at')}</TableHead>
            <TableHead>{t('table.plan')}</TableHead>
            <TableHead className="text-right">{t('table.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {restaurants.map((restaurant) => (
            <TableRow key={restaurant.id}>
              <TableCell className="font-medium">{restaurant.name}</TableCell>
              <TableCell>{restaurant.email}</TableCell>
              <TableCell>{new Date(restaurant.created_at).toLocaleDateString()}</TableCell>
              <TableCell>
                {restaurant.subscription_plan ? (
                  <Badge variant="outline">{restaurant.subscription_plan}</Badge>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedRestaurant(restaurant);
                    setApproveDialogOpen(true);
                  }}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  {t('actions.approve')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedRestaurant(restaurant);
                    setRejectDialogOpen(true);
                  }}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  {t('actions.reject')}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('approve_dialog.title')}</DialogTitle>
            <DialogDescription>{t('approve_dialog.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="approve-notes">{t('approve_dialog.notes_label')}</Label>
              <Textarea
                id="approve-notes"
                placeholder={t('approve_dialog.notes_placeholder')}
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              {t('approve_dialog.cancel')}
            </Button>
            <Button onClick={handleApprove} disabled={submitting}>
              {submitting ? 'Approving...' : t('approve_dialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('reject_dialog.title')}</DialogTitle>
            <DialogDescription>{t('reject_dialog.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="reject-reason">{t('reject_dialog.reason_label')}</Label>
              <Textarea
                id="reject-reason"
                placeholder={t('reject_dialog.reason_placeholder')}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              {t('reject_dialog.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={submitting || !rejectReason}
            >
              {submitting ? 'Rejecting...' : t('reject_dialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
