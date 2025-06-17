'use client';

import { EnhancedSmartMenu } from '@/components/features/customer/menu/EnhancedSmartMenu';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { ViewType, ViewProps } from '@/components/features/customer/screens/types';
import type { Category } from '@/shared/types/menu';
import { useCustomerData } from '@/components/features/customer/layout/CustomerDataContext';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getSubdomainFromHost } from '@/lib/utils';

interface MenuPageClientProps {
  locale: string;
}

export function MenuPageClient({ locale }: MenuPageClientProps) {
  const router = useRouter();
  const { restaurantSettings, sessionParams, sessionData, setSessionId, isLoading: contextLoading } = useCustomerData();
  const t = useTranslations('Customer');
  
  // Local state
  const [tableId, setTableId] = useState<string | null>(sessionParams.tableId || null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // Session dialog states
  const [guestCount, setGuestCount] = useState<number>(1);
  const [showGuestDialog, setShowGuestDialog] = useState<boolean>(false);
  const [showJoinDialog, setShowJoinDialog] = useState<boolean>(false);
  const [showPasscodeDisplay, setShowPasscodeDisplay] = useState<boolean>(false);
  const [passcode, setPasscode] = useState<string>('');
  const [sessionPasscode, setSessionPasscode] = useState<string>('');
  const [pendingSessionId, setPendingSessionId] = useState<string>('');
  const [requirePasscode, setRequirePasscode] = useState<boolean>(false);

  // Fetch menu data
  useEffect(() => {
    const fetchMenuData = async () => {
      if (!restaurantSettings?.id) return;
      
      try {
        const response = await fetch(`/api/v1/customer/menu?restaurantId=${restaurantSettings.id}`);
        const data = await response.json();
        if (data.success) {
          setCategories(data.categories || []);
        }
      } catch (error) {
        console.error('Error fetching menu data:', error);
      }
    };

    fetchMenuData();
  }, [restaurantSettings]);

  // Handle session resolution for QR codes and session parameters
  useEffect(() => {
    if (!sessionParams.code && !sessionParams.sessionId) {
      return;
    }

    const resolveSession = async () => {
      setIsLoading(true);
      
      try {
        // Handle existing sessionId parameter (direct session access)
        if (sessionParams.sessionId) {
          // Context already handles this, we just need to verify it's still valid
          console.log('Session ID from URL parameters:', sessionParams.sessionId);
        }
        // Handle QR code scanning (code parameter)
        else if (sessionParams.code) {
          const response = await fetch(`/api/v1/customer/session/check-code?code=${sessionParams.code}`);
          const result = await response.json();
          
          if (result.success) {
            setTableId(result.tableId);
            
            if (result.activeSessionId) {
              // There's an active session - need to join it
              setPendingSessionId(result.activeSessionId);
              setRequirePasscode(result.requirePasscode || false);
              setShowJoinDialog(true);
            } else {
              // New session from QR code - show guest count dialog
              setShowGuestDialog(true);
            }
          }
        }
      } catch (error) {
        console.error('Error resolving session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    resolveSession();
  }, [sessionParams.code, sessionParams.sessionId]);

  // Start new session (called when guest count dialog is submitted)
  const startSession = async () => {
    if (!tableId) return;
    if (!restaurantSettings) return;

    try {
      const subdomain = getSubdomainFromHost(window.location.host);
      const params = new URLSearchParams({ tableId });
      params.append('guests', String(guestCount));
      params.append('restaurantId', restaurantSettings.id);
      if (subdomain) params.append('subdomain', subdomain);

      const res = await fetch(`/api/v1/customer/session/create?${params.toString()}`);
      const data = await res.json();
      
      if (data.success) {
        // Use the centralized session management
        setSessionId(data.sessionId);
        
        // Store additional data locally
        localStorage.setItem("guestCount", String(data.guestCount || guestCount));
        
        setSessionPasscode(data.passcode || '');
        setShowGuestDialog(false);
        setShowPasscodeDisplay(true);

        // Update URL to use sessionId instead of code
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.delete('code');
        currentUrl.searchParams.delete('tableId');
        currentUrl.searchParams.set('sessionId', data.sessionId);
        window.history.replaceState({}, '', currentUrl.toString());
      }
    } catch (error) {
      console.error('Error starting session:', error);
    }
  };

  // Join existing session
  const joinSession = async () => {
    if (!pendingSessionId) return;
    if (!restaurantSettings) return;
    try {
      const subdomain = getSubdomainFromHost(window.location.host);
      const params = new URLSearchParams({ 
        sessionId: pendingSessionId,
        passcode: requirePasscode ? passcode : 'default'
      });
      params.append('restaurantId', restaurantSettings.id);
      if (subdomain) params.append('subdomain', subdomain);
      
      const response = await fetch(`/api/v1/customer/session/join?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        // Use the centralized session management
        setSessionId(data.sessionId);
        setShowJoinDialog(false);

        // Update URL to use sessionId instead of code
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.delete('code');
        currentUrl.searchParams.delete('tableId');
        currentUrl.searchParams.set('sessionId', data.sessionId);
        window.history.replaceState({}, '', currentUrl.toString());
      } else {
        // TODO: reflect error in UI
        console.error('Failed to join session:', data.error);
      }
    } catch (error) {
      console.error('Error joining session:', error);
    }
  };

  const handleSetView = useCallback((view: ViewType, props?: ViewProps) => {
    const baseParams = new URLSearchParams({
      locale,
      view,
      sessionId: sessionData.sessionId || '',
      tableNumber: sessionData.tableNumber || '',
    });

    if (props) {
      Object.entries(props).forEach(([key, value]) => {
        if (value !== undefined) {
          baseParams.set(key, String(value));
        }
      });
    }

    switch (view) {
      case 'menu':
        router.push(`/${locale}/menu?${baseParams.toString()}`);
        break;
      case 'menuitemdetail':
        router.push(`/${locale}/menu/item?${baseParams.toString()}`);
        break;
      case 'review':
        router.push(`/${locale}/review?${baseParams.toString()}`);
        break;
      case 'history':
        router.push(`/${locale}/history?${baseParams.toString()}`);
        break;
      default:
        router.push(`/${locale}/menu?${baseParams.toString()}`);
    }
  }, [locale, router, sessionData.sessionId, sessionData.tableNumber]);

  // Show loading state
  if (contextLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  // Show error state for invalid sessions
  if (sessionData.sessionStatus === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-red-600 mb-2">
            {t('session.invalid_session')}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            {t('session.invalid_session_message')}
          </p>
          <Button onClick={() => router.push(`/${locale}/`)}>
            {t('session.scan_qr_again')}
          </Button>
        </div>
      </div>
    );
  }

  // Redirect to history page for expired/completed sessions
  if (sessionData.sessionStatus === 'expired') {
    const historyUrl = new URLSearchParams();
    if (sessionData.sessionId) historyUrl.set('sessionId', sessionData.sessionId);
    router.push(`/${locale}/history?${historyUrl.toString()}`);
    
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('redirecting_to_history')}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <EnhancedSmartMenu
        categories={categories}
        locale={locale}
        sessionId={sessionData.sessionId || ''}
        tableNumber={sessionData.tableNumber || ''}
        canAddItems={sessionData.canAddItems}
        brandColor={restaurantSettings?.primaryColor || "#3b82f6"}
        setView={handleSetView}
        restaurantId={restaurantSettings?.id || ''}
      />

      {/* Guest Count Dialog */}
      <Dialog open={showGuestDialog} onOpenChange={setShowGuestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('session.guest_count_title')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-4">
              {t('session.guest_count_description')}
            </p>
            <Input
              type="number"
              min="1"
              max="20"
              value={guestCount}
              onChange={(e) => setGuestCount(parseInt(e.target.value) || 1)}
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGuestDialog(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={startSession}>
              {t('session.start_session')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join Session Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('session.join_session_title')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-4">
              {t('session.join_session_description')}
            </p>
            {requirePasscode && (
              <Input
                type="text"
                placeholder={t('session.enter_passcode')}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJoinDialog(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={joinSession}>
              {t('session.join')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Passcode Display Dialog */}
      <Dialog open={showPasscodeDisplay} onOpenChange={setShowPasscodeDisplay}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('session.session_created_title')}</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <p className="text-sm text-gray-600 mb-4">
              {t('session.passcode_share_message')}
            </p>
            <div className="text-3xl font-bold text-blue-600 mb-4 p-4 bg-blue-50 rounded-lg">
              {sessionPasscode}
            </div>
            <p className="text-xs text-gray-500">
              {t('session.passcode_instructions')}
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowPasscodeDisplay(false)} className="w-full">
              {t('session.continue_to_menu')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
