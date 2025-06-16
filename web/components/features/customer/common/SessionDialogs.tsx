"use client";
import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {  useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

interface SessionDialogsProps {
  isCreateOpen: boolean;
  isJoinOpen: boolean;
  onCreateClose: () => void;
  onJoinClose: () => void;
  restaurantId: string;
}

export function SessionDialogs({ 
  isCreateOpen, 
  isJoinOpen, 
  onCreateClose, 
  onJoinClose,
  restaurantId
}: SessionDialogsProps) {
  const t = useTranslations();
  const { toast } = useToast();
  const router = useRouter();
  //const params = useParams();
  
  const [guestCount, setGuestCount] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  
  const [sessionCode, setSessionCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  
  // Handle create new session
  const handleCreateSession = async () => {
    if (guestCount < 1) return;
    
    setIsCreating(true);
    try {
      const response = await fetch('/api/v1/customer/reviews/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurantId,
          guestCount
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create session');
      }
      
      // Save session ID in local storage
      localStorage.setItem('coorder_session_id', data.sessionId);
      
      toast({
        title: "Session Created",
        description: `Your session code is: ${data.sessionCode}`,
      });
      
      onCreateClose();
      
      // Refresh or redirect
      router.refresh();
      
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: t("session_create_error"),
        description: error instanceof Error ? error.message : t("try_again_later"),
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };
  
  // Handle join existing session
  const handleJoinSession = async () => {
    if (!sessionCode.trim()) return;
    
    setIsJoining(true);
    try {
      const response = await fetch('/api/v1/customer/reviews/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionCode: sessionCode.trim(),
          restaurantId
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to join session');
      }
      
      // Save session ID in local storage
      localStorage.setItem('coorder_session_id', data.sessionId);
      
      toast({
        title: t("session_joined"),
        description: t("session_joined_success"),
      });
      
      onJoinClose();
      
      // Refresh or redirect
      router.refresh();
      
    } catch (error) {
      console.error('Error joining session:', error);
      toast({
        title: t("session_join_error"),
        description: error instanceof Error ? error.message : t("invalid_session_code"),
        variant: "destructive"
      });
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <>
      {/* Create New Session Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={onCreateClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("create_new_session")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="guestCount">{t("guest_count")}</Label>
              <Input
                id="guestCount"
                type="number"
                min={1}
                max={20}
                value={guestCount}
                onChange={(e) => setGuestCount(parseInt(e.target.value) || 1)}
              />
              <p className="text-sm text-slate-500">{t("guest_count_description")}</p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={onCreateClose}
              disabled={isCreating}
            >
              {t("cancel")}
            </Button>
            <Button 
              onClick={handleCreateSession}
              disabled={isCreating}
            >
              {isCreating ? t("creating") : t("create_session")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Join Existing Session Dialog */}
      <Dialog open={isJoinOpen} onOpenChange={onJoinClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("join_existing_session")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sessionCode">{t("session_code")}</Label>
              <Input
                id="sessionCode"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value)}
                placeholder={t("enter_session_code")}
              />
              <p className="text-sm text-slate-500">{t("session_code_description")}</p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={onJoinClose}
              disabled={isJoining}
            >
              {t("cancel")}
            </Button>
            <Button 
              onClick={handleJoinSession}
              disabled={isJoining || !sessionCode.trim()}
            >
              {isJoining ? t("joining") : t("join_session")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
