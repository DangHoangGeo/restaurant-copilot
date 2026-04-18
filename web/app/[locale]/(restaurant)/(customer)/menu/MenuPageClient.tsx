"use client";

import { SmartMenu } from "@/components/features/customer/menu/SmartMenu";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type {
  ViewType,
  ViewProps,
} from "@/components/features/customer/screens/types";
import { useCustomerData } from "@/components/features/customer/layout/CustomerDataContext";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSubdomainFromHost } from "@/lib/utils";
import { buildCustomerPath } from "@/lib/customer-branch";

interface MenuPageClientProps {
  locale: string;
}

export function MenuPageClient({ locale }: MenuPageClientProps) {
  const router = useRouter();
  const {
    restaurantSettings,
    sessionParams,
    activeBranchCode,
    sessionData,
    setSessionId,
    isLoading: contextLoading,
  } = useCustomerData();
  const t = useTranslations("customer.session");

  // Local state
  const [tableId, setTableId] = useState<string | null>(
    sessionParams.tableId || null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Session dialog states
  const [guestCount, setGuestCount] = useState<number>(1);
  const [showGuestDialog, setShowGuestDialog] = useState<boolean>(false);
  const [guestDialogStep, setGuestDialogStep] = useState<"guests" | "passcode">(
    "guests",
  );
  const [isStartingSession, setIsStartingSession] = useState<boolean>(false);
  const [showJoinDialog, setShowJoinDialog] = useState<boolean>(false);
  const [passcode, setPasscode] = useState<string>("");
  const [sessionPasscode, setSessionPasscode] = useState<string>("");
  const [pendingSessionId, setPendingSessionId] = useState<string>("");
  const [requirePasscode, setRequirePasscode] = useState<boolean>(false);
  const [startSessionError, setStartSessionError] = useState<string | null>(
    null,
  );
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoiningSession, setIsJoiningSession] = useState<boolean>(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [passcodeCopied, setPasscodeCopied] = useState<boolean>(false);

  const brandColor = restaurantSettings?.primaryColor || "#3b82f6";
  const companyName =
    restaurantSettings?.companyName ?? restaurantSettings?.name ?? "";
  const branchName = restaurantSettings?.name ?? "";

  // Handle session resolution for QR codes and session parameters
  useEffect(() => {
    if (
      !sessionParams.code &&
      !sessionParams.sessionId &&
      !(sessionParams.branch && sessionParams.table)
    ) {
      return;
    }

    const resolveSession = async () => {
      setIsLoading(true);
      setResolveError(null);

      try {
        // Handle existing sessionId parameter (direct session access)
        if (sessionParams.sessionId) {
          // Context already handles this, we just need to verify it's still valid
        } else if (sessionParams.branch && sessionParams.table) {
          const params = new URLSearchParams({
            branch: sessionParams.branch,
            table: sessionParams.table,
          });
          const orgIdentifier = getSubdomainFromHost(window.location.host);
          if (orgIdentifier) params.set("org", orgIdentifier);

          const response = await fetch(
            `/api/v1/customer/entry/resolve?${params.toString()}`,
          );
          const result = await response.json();

          if (result.success) {
            setTableId(result.table.id);

            if (result.activeSessionId) {
              setPendingSessionId(result.activeSessionId);
              setRequirePasscode(result.requirePasscode || false);
              setShowJoinDialog(true);
            } else {
              setShowGuestDialog(true);
            }
          } else {
            setResolveError(t("invalid_session_message"));
          }
        }
        // Handle QR code scanning (code parameter)
        else if (sessionParams.code) {
          const response = await fetch(
            `/api/v1/customer/session/check-code?code=${sessionParams.code}`,
          );
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
          } else {
            setResolveError(t("invalid_session_message"));
          }
        }
      } catch (error) {
        console.error("Error resolving session:", error);
        setResolveError(t("join_failed"));
      } finally {
        setIsLoading(false);
      }
    };

    resolveSession();
  }, [
    sessionParams.branch,
    sessionParams.code,
    sessionParams.sessionId,
    sessionParams.table,
    t,
  ]);

  // Start new session (called when guest count dialog is submitted)
  const startSession = async () => {
    if (!tableId) return;
    if (!restaurantSettings) return;
    setStartSessionError(null);
    setIsStartingSession(true);

    try {
      const subdomain = getSubdomainFromHost(window.location.host);
      const params = new URLSearchParams({ tableId });
      params.append("guests", String(guestCount));
      params.append("restaurantId", restaurantSettings.id);
      if (subdomain) params.append("subdomain", subdomain);

      const res = await fetch(
        `/api/v1/customer/session/create?${params.toString()}`,
      );
      const data = await res.json();

      if (data.success) {
        setSessionId(data.sessionId);
        localStorage.setItem(
          "guestCount",
          String(data.guestCount || guestCount),
        );
        setSessionPasscode(data.passcode || "");

        // Transition to passcode step within the same dialog
        setGuestDialogStep("passcode");

        // Update URL to use sessionId instead of code
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.delete("code");
        currentUrl.searchParams.delete("tableId");
        currentUrl.searchParams.set("sessionId", data.sessionId);
        window.history.replaceState({}, "", currentUrl.toString());
      } else {
        setStartSessionError(t("start_session_failed"));
      }
    } catch (error) {
      console.error("Error starting session:", error);
      setStartSessionError(t("start_session_failed"));
    } finally {
      setIsStartingSession(false);
    }
  };

  // Join existing session
  const joinSession = async () => {
    if (!pendingSessionId) return;
    if (!restaurantSettings) return;

    if (requirePasscode && passcode.length !== 4) {
      setJoinError(t("invalid_passcode_error"));
      return;
    }

    setJoinError(null);
    setIsJoiningSession(true);

    try {
      const subdomain = getSubdomainFromHost(window.location.host);
      const params = new URLSearchParams({
        sessionId: pendingSessionId,
        passcode: requirePasscode ? passcode : "default",
      });
      params.append("restaurantId", restaurantSettings.id);
      if (subdomain) params.append("subdomain", subdomain);

      const response = await fetch(
        `/api/v1/customer/session/join?${params.toString()}`,
      );
      const data = await response.json();

      if (data.success) {
        setSessionId(data.sessionId);
        setShowJoinDialog(false);
        setPasscode("");
        setJoinError(null);

        // Update URL to use sessionId instead of code
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.delete("code");
        currentUrl.searchParams.delete("tableId");
        currentUrl.searchParams.set("sessionId", data.sessionId);
        window.history.replaceState({}, "", currentUrl.toString());
      } else {
        if (data.error === "Invalid passcode") {
          setJoinError(t("invalid_passcode_error"));
        } else if (data.error === "Session is no longer active") {
          setJoinError(t("session_expired_message"));
        } else {
          setJoinError(t("join_failed"));
        }
      }
    } catch (error) {
      console.error("Error joining session:", error);
      setJoinError(t("join_failed"));
    } finally {
      setIsJoiningSession(false);
    }
  };

  const handleContinueToMenu = () => {
    setShowGuestDialog(false);
    setGuestDialogStep("guests");
    setStartSessionError(null);
    setPasscodeCopied(false);
  };

  const handleGuestDialogOpenChange = (open: boolean) => {
    if (!open) {
      setShowGuestDialog(false);
      setGuestDialogStep("guests");
      setStartSessionError(null);
      setPasscodeCopied(false);
    }
  };

  const handleJoinDialogOpenChange = (open: boolean) => {
    setShowJoinDialog(open);
    if (!open) {
      setPasscode("");
      setJoinError(null);
      setIsJoiningSession(false);
    }
  };

  const handleCopyPasscode = async () => {
    if (!sessionPasscode) return;

    try {
      await navigator.clipboard.writeText(sessionPasscode);
      setPasscodeCopied(true);
      window.setTimeout(() => setPasscodeCopied(false), 1500);
    } catch (error) {
      console.error("Failed to copy session passcode:", error);
    }
  };

  const handleSetView = useCallback(
    (view: ViewType, props?: ViewProps) => {
      const baseParams = new URLSearchParams({
        locale,
        view,
        sessionId: sessionData.sessionId || "",
        tableNumber: sessionData.tableNumber || "",
      });

      if (props) {
        Object.entries(props).forEach(([key, value]) => {
          if (value !== undefined) {
            baseParams.set(key, String(value));
          }
        });
      }

      switch (view) {
        case "menu":
          router.push(
            buildCustomerPath({
              locale,
              path: "menu",
              branchCode: activeBranchCode,
              searchParams: baseParams,
            }),
          );
          break;
        case "menuitemdetail":
          router.push(
            buildCustomerPath({
              locale,
              path: "menu/item",
              branchCode: activeBranchCode,
              searchParams: baseParams,
            }),
          );
          break;
        case "review":
          router.push(
            buildCustomerPath({
              locale,
              path: "review",
              branchCode: activeBranchCode,
              searchParams: baseParams,
            }),
          );
          break;
        case "history":
          router.push(
            buildCustomerPath({
              locale,
              path: "history",
              branchCode: activeBranchCode,
              searchParams: baseParams,
            }),
          );
          break;
        default:
          router.push(
            buildCustomerPath({
              locale,
              path: "menu",
              branchCode: activeBranchCode,
              searchParams: baseParams,
            }),
          );
      }
    },
    [
      activeBranchCode,
      locale,
      router,
      sessionData.sessionId,
      sessionData.tableNumber,
    ],
  );

  // Show loading state
  if (contextLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t("loading")}</p>
        </div>
      </div>
    );
  }

  // Show error state for invalid sessions
  if (sessionData.sessionStatus === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-red-600 mb-2">
            {t("invalid_session")}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            {t("invalid_session_message")}
          </p>
          <Button onClick={() => router.push(`/${locale}/`)}>
            {t("scan_qr_again")}
          </Button>
        </div>
      </div>
    );
  }

  if (resolveError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center max-w-md px-4">
          <h2 className="text-xl font-semibold text-red-600 mb-2">
            {t("invalid_session")}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            {resolveError}
          </p>
          <Button onClick={() => router.push(`/${locale}/`)}>
            {t("scan_qr_again")}
          </Button>
        </div>
      </div>
    );
  }

  // Redirect to history page for expired/completed sessions
  if (sessionData.sessionStatus === "expired" && sessionParams.sessionId) {
    const historyUrl = new URLSearchParams();
    if (sessionData.sessionId)
      historyUrl.set("sessionId", sessionData.sessionId);
    router.push(
      buildCustomerPath({
        locale,
        path: "history",
        branchCode: activeBranchCode,
        searchParams: historyUrl,
      }),
    );

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t("redirecting_to_history")}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SmartMenu
        locale={locale}
        sessionId={sessionData.sessionId || ""}
        tableNumber={sessionData.tableNumber || ""}
        canAddItems={sessionData.canAddItems}
        brandColor={restaurantSettings?.primaryColor || "#3b82f6"}
        setView={handleSetView}
        restaurantId={restaurantSettings?.id || ""}
        restaurantName={companyName}
        branchName={branchName}
        logoUrl={restaurantSettings?.logoUrl}
        allowOrderNotes={restaurantSettings?.allowOrderNotes ?? true}
      />

      {/* Guest Count + Passcode Dialog (combined 2-step) */}
      <Dialog open={showGuestDialog} onOpenChange={handleGuestDialogOpenChange}>
        <DialogContent className="sm:max-w-sm p-0 overflow-hidden">
          {guestDialogStep === "guests" ? (
            <div
              key="guests"
              className="text-center p-6 animate-in fade-in-0 zoom-in-95 duration-200"
            >
              <DialogTitle className="sr-only">
                {t("guest_count_title")}
              </DialogTitle>

              {/* Welcome header */}
              <div className="mb-6">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: `${brandColor}20` }}
                >
                  <svg
                    className="w-7 h-7"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.8}
                    stroke={brandColor}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  {companyName
                    ? `${t("welcome_to")} ${companyName}`
                    : t("welcome_greeting")}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {branchName && branchName !== companyName
                    ? `${branchName} · ${t("welcome_subtitle")}`
                    : t("welcome_subtitle")}
                </p>
              </div>

              {/* Guest count description */}
              <p className="text-sm text-gray-600 mb-5">
                {t("guest_count_description")}
              </p>

              {/* Stepper */}
              <div className="flex items-center justify-center gap-8 mb-8">
                <button
                  type="button"
                  aria-label={t("decrease_guests")}
                  onClick={() => setGuestCount((c) => Math.max(1, c - 1))}
                  disabled={guestCount <= 1}
                  className="w-14 h-14 rounded-full text-3xl font-medium border-2 transition-all duration-150 active:scale-90 disabled:opacity-25 disabled:cursor-not-allowed select-none"
                  style={{ borderColor: brandColor, color: brandColor }}
                >
                  −
                </button>

                <div className="text-center min-w-[3.5rem]">
                  <span
                    className="text-6xl font-bold tabular-nums leading-none block transition-all duration-150"
                    style={{ color: brandColor }}
                  >
                    {guestCount}
                  </span>
                  <span className="text-xs text-gray-400 mt-1 block">
                    {t("guests_label")}
                  </span>
                </div>

                <button
                  type="button"
                  aria-label={t("increase_guests")}
                  onClick={() => setGuestCount((c) => Math.min(20, c + 1))}
                  disabled={guestCount >= 20}
                  className="w-14 h-14 rounded-full text-3xl font-medium border-2 transition-all duration-150 active:scale-90 disabled:opacity-25 disabled:cursor-not-allowed select-none"
                  style={{ borderColor: brandColor, color: brandColor }}
                >
                  +
                </button>
              </div>

              <Button
                onClick={startSession}
                disabled={isStartingSession}
                className="w-full h-12 text-base font-semibold text-white"
                style={{ backgroundColor: brandColor, borderColor: brandColor }}
              >
                {isStartingSession ? t("starting") : t("start_session")}
              </Button>

              {startSessionError && (
                <p className="mt-3 text-sm text-red-600">{startSessionError}</p>
              )}
            </div>
          ) : (
            <div
              key="passcode"
              className="text-center p-6 animate-in fade-in-0 zoom-in-95 duration-200"
            >
              <DialogTitle className="sr-only">
                {t("session_created_title")}
              </DialogTitle>

              {/* Success icon */}
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: `${brandColor}20` }}
              >
                <svg
                  className="w-9 h-9"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke={brandColor}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
              </div>

              <h2 className="text-xl font-bold text-gray-900 mb-1">
                {t("session_ready_title")}
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                {t("passcode_share_instructions")}
              </p>

              {/* Passcode display */}
              <div
                className="rounded-2xl px-6 py-5 mb-4"
                style={{ backgroundColor: `${brandColor}12` }}
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
                  {t("table_passcode_label")}
                </p>
                <div
                  className="text-5xl font-bold tracking-[0.3em] pl-[0.3em]"
                  style={{ color: brandColor }}
                >
                  {sessionPasscode}
                </div>
              </div>

              <p className="text-xs text-gray-400 mb-6">
                {t("passcode_instructions")}
              </p>

              <Button
                type="button"
                variant="outline"
                onClick={handleCopyPasscode}
                className="w-full h-11 mb-3"
              >
                {passcodeCopied ? t("copied") : t("copy_passcode")}
              </Button>

              <Button
                onClick={handleContinueToMenu}
                className="w-full h-12 text-base font-semibold text-white"
                style={{ backgroundColor: brandColor, borderColor: brandColor }}
              >
                {t("start_ordering")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Join Session Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={handleJoinDialogOpenChange}>
        <DialogContent className="sm:max-w-sm p-0 overflow-hidden">
          <div className="text-center p-6">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: `${brandColor}20` }}
            >
              <svg
                className="w-7 h-7"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke={brandColor}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                />
              </svg>
            </div>

            <DialogTitle className="text-xl font-bold text-gray-900 mb-1">
              {t("join_session_title")}
            </DialogTitle>
            <p className="text-sm text-gray-500 mb-6">
              {t("join_session_description")}
            </p>

            {requirePasscode && (
              <Input
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder={t("enter_passcode")}
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value.replace(/\D/g, "").slice(0, 4));
                  if (joinError) setJoinError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isJoiningSession) {
                    void joinSession();
                  }
                }}
                autoFocus
                className="w-full text-center text-2xl font-bold tracking-[0.4em] h-14 mb-6"
              />
            )}

            {joinError && (
              <p className="text-sm text-red-600 mb-4">{joinError}</p>
            )}

            {requirePasscode && !joinError && (
              <p className="text-xs text-gray-500 mb-4">
                {t("ask_for_passcode_instruction")}
              </p>
            )}

            <Button
              onClick={joinSession}
              disabled={
                isJoiningSession || (requirePasscode && passcode.length !== 4)
              }
              className="w-full h-12 text-base font-semibold text-white mb-3"
              style={{ backgroundColor: brandColor, borderColor: brandColor }}
            >
              {isJoiningSession ? t("starting") : t("join")}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowJoinDialog(false)}
              className="w-full h-10 text-sm text-gray-500"
            >
              {t("cancel")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
