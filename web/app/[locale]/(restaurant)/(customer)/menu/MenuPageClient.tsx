"use client";

import { SmartMenu } from "@/components/features/customer/menu/SmartMenu";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ViewType,
  ViewProps,
} from "@/components/features/customer/screens/types";
import { useCustomerData } from "@/components/features/customer/layout/CustomerDataContext";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSubdomainFromHost } from "@/lib/utils";
import { buildCustomerPath } from "@/lib/customer-branch";
import { createCustomerBrandTheme } from "@/lib/utils/colors";
import {
  CUSTOMER_SESSION_CODE_LENGTH,
  sanitizeCustomerSessionCodeInput,
} from "@/shared/customer-session";

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

  const customerTheme = useMemo(
    () => createCustomerBrandTheme(restaurantSettings?.primaryColor),
    [restaurantSettings?.primaryColor],
  );
  const brandColor = customerTheme.primary;
  const companyName =
    restaurantSettings?.companyName ?? restaurantSettings?.name ?? "";
  const branchName = restaurantSettings?.name ?? "";
  const activeSessionId =
    sessionData.sessionId || sessionParams.sessionId || "";
  const activeTableNumber =
    sessionData.tableNumber || sessionParams.tableNumber || "";

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
              if (sessionData.sessionId === result.activeSessionId) {
                setPendingSessionId("");
                setRequirePasscode(false);
                setShowJoinDialog(false);
              } else {
                setPendingSessionId(result.activeSessionId);
                setRequirePasscode(result.requirePasscode || false);
                setShowJoinDialog(true);
              }
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
              if (sessionData.sessionId === result.activeSessionId) {
                setPendingSessionId("");
                setRequirePasscode(false);
                setShowJoinDialog(false);
              } else {
                // There's an active session - need to join it
                setPendingSessionId(result.activeSessionId);
                setRequirePasscode(result.requirePasscode || false);
                setShowJoinDialog(true);
              }
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
    sessionData.sessionId,
    t,
  ]);

  // Start new session (called when guest count dialog is submitted)
  const startSession = async () => {
    if (!tableId) return;
    if (!restaurantSettings) return;
    setStartSessionError(null);
    setIsStartingSession(true);

    try {
      const res = await fetch("/api/v1/customer/session/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tableId,
          guests: guestCount,
          restaurantId: restaurantSettings.id,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setSessionId(data.sessionId);
        localStorage.setItem(
          "guestCount",
          String(data.guestCount || guestCount),
        );
        setSessionPasscode(data.sessionCode || data.passcode || "");

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

    if (requirePasscode && passcode.length !== CUSTOMER_SESSION_CODE_LENGTH) {
      setJoinError(t("invalid_passcode_error"));
      return;
    }

    setJoinError(null);
    setIsJoiningSession(true);

    try {
      const response = await fetch("/api/v1/customer/session/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: pendingSessionId,
          passcode: requirePasscode ? passcode : "default",
          restaurantId: restaurantSettings.id,
        }),
      });
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
        if (
          data.error === "Invalid passcode" ||
          data.error === "Invalid session code"
        ) {
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
      const baseParams = new URLSearchParams();
      baseParams.set("view", view);

      if (activeSessionId) {
        baseParams.set("sessionId", activeSessionId);
      }

      if (activeTableNumber) {
        baseParams.set("tableNumber", activeTableNumber);
      }

      if (props) {
        Object.entries(props).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
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
    [activeBranchCode, activeSessionId, activeTableNumber, locale, router],
  );

  const spinnerStyle = { borderBottomColor: brandColor };
  const btnStyle = { backgroundColor: brandColor, borderColor: brandColor };

  // Show loading state
  if (contextLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4"
            style={spinnerStyle}
          ></div>
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
          <Button
            onClick={() => router.push(`/${locale}/`)}
            className="text-white"
            style={btnStyle}
          >
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
          <Button
            onClick={() => router.push(`/${locale}/`)}
            className="text-white"
            style={btnStyle}
          >
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
          <div
            className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4"
            style={spinnerStyle}
          ></div>
          <p className="text-gray-600">{t("redirecting_to_history")}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SmartMenu
        locale={locale}
        sessionId={activeSessionId}
        tableNumber={activeTableNumber}
        canAddItems={sessionData.canAddItems}
        brandColor={brandColor}
        currency={restaurantSettings?.currency}
        setView={handleSetView}
        restaurantId={restaurantSettings?.id || ""}
        restaurantName={companyName}
        branchName={branchName}
        logoUrl={restaurantSettings?.logoUrl}
        allowOrderNotes={restaurantSettings?.allowOrderNotes ?? true}
        timezone={restaurantSettings?.timezone}
      />

      {/* Guest Count + Passcode Dialog (combined 2-step) */}
      <Dialog open={showGuestDialog} onOpenChange={handleGuestDialogOpenChange}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[360px] overflow-hidden rounded-[28px] border border-[#f1dcc4]/16 bg-[#14100b]/96 p-0 text-[#fff7e9] shadow-[0_30px_90px_-45px_rgba(0,0,0,0.95)] backdrop-blur-xl ring-1 ring-white/5 sm:max-w-[380px] [&>button]:text-[#c9b7a0] [&>button]:hover:text-[#fff7e9]">
          {guestDialogStep === "guests" ? (
            <div
              key="guests"
              className="animate-in fade-in-0 zoom-in-95 max-h-[calc(100dvh-2rem)] space-y-5 overflow-y-auto px-5 py-6 text-center duration-200"
            >
              <DialogTitle className="sr-only">
                {t("guest_count_title")}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {t("guest_count_description")}
              </DialogDescription>

              {/* Welcome header */}
              <div className="mb-6">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#f1dcc4]/14 bg-[#f6e8d3]/10">
                  <svg
                    className="w-7 h-7"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.8}
                    stroke="#E9A35E"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z"
                    />
                  </svg>
                </div>
                <h2 className="text-balance text-xl font-semibold leading-tight text-[#fff7e9]">
                  {companyName
                    ? `${t("welcome_to")} ${companyName}`
                    : t("welcome_greeting")}
                </h2>
                <p className="mx-auto mt-2 max-w-[25ch] text-sm leading-5 text-[#c9b7a0]">
                  {branchName && branchName !== companyName
                    ? `${branchName} · ${t("welcome_subtitle")}`
                    : t("welcome_subtitle")}
                </p>
              </div>

              {/* Guest count description */}
              <p className="mx-auto max-w-[26ch] text-sm leading-5 text-[#c9b7a0]">
                {t("guest_count_description")}
              </p>

              {/* Stepper */}
              <div className="flex items-center justify-center gap-6">
                <button
                  type="button"
                  aria-label={t("decrease_guests")}
                  onClick={() => setGuestCount((c) => Math.max(1, c - 1))}
                  disabled={guestCount <= 1}
                  className="h-14 w-14 select-none rounded-full border border-[#e9a35e]/70 bg-[#f6e8d3]/6 text-3xl font-medium text-[#e9a35e] transition-all duration-150 active:scale-90 disabled:cursor-not-allowed disabled:opacity-25"
                >
                  −
                </button>

                <div className="text-center min-w-[3.5rem]">
                  <span className="block text-6xl font-bold leading-none text-[#e9a35e] tabular-nums transition-all duration-150">
                    {guestCount}
                  </span>
                  <span className="mt-1 block text-xs text-[#c9b7a0]">
                    {t("guests_label")}
                  </span>
                </div>

                <button
                  type="button"
                  aria-label={t("increase_guests")}
                  onClick={() => setGuestCount((c) => Math.min(20, c + 1))}
                  disabled={guestCount >= 20}
                  className="h-14 w-14 select-none rounded-full border border-[#e9a35e]/70 bg-[#f6e8d3]/6 text-3xl font-medium text-[#e9a35e] transition-all duration-150 active:scale-90 disabled:cursor-not-allowed disabled:opacity-25"
                >
                  +
                </button>
              </div>

              <Button
                onClick={startSession}
                disabled={isStartingSession}
                className="h-12 w-full rounded-2xl text-base font-semibold text-white shadow-[0_16px_36px_-24px_rgba(0,0,0,0.9)]"
                style={{ backgroundColor: brandColor, borderColor: brandColor }}
              >
                {isStartingSession ? t("starting") : t("start_session")}
              </Button>

              {startSessionError && (
                <p className="text-sm text-[#ffd6ad]">{startSessionError}</p>
              )}
            </div>
          ) : (
            <div
              key="passcode"
              className="animate-in fade-in-0 zoom-in-95 max-h-[calc(100dvh-2rem)] space-y-5 overflow-y-auto px-5 py-6 text-center duration-200"
            >
              <DialogTitle className="sr-only">
                {t("session_created_title")}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {t("passcode_share_instructions")}
              </DialogDescription>

              {/* Success icon */}
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#f1dcc4]/14 bg-[#f6e8d3]/10">
                <svg
                  className="w-9 h-9"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="#E9A35E"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
              </div>

              <h2 className="text-balance text-xl font-semibold leading-tight text-[#fff7e9]">
                {t("session_ready_title")}
              </h2>
              <p className="mx-auto max-w-[26ch] text-sm leading-5 text-[#c9b7a0]">
                {t("passcode_share_instructions")}
              </p>

              {/* Passcode display */}
              <div className="rounded-2xl border border-[#f1dcc4]/12 bg-[#f6e8d3]/8 px-4 py-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#c9b7a0]">
                  {t("table_passcode_label")}
                </p>
                <div className="break-all text-center text-4xl font-bold tracking-[0.16em] text-[#e9a35e]">
                  {sessionPasscode}
                </div>
              </div>

              <p className="mx-auto max-w-[28ch] text-xs leading-5 text-[#c9b7a0]">
                {t("passcode_instructions")}
              </p>

              <Button
                type="button"
                variant="outline"
                onClick={handleCopyPasscode}
                className="h-11 w-full rounded-2xl border-[#f1dcc4]/14 bg-[#f6e8d3]/8 text-[#fff7e9] hover:bg-[#f6e8d3]/14"
              >
                {passcodeCopied ? t("copied") : t("copy_passcode")}
              </Button>

              <Button
                onClick={handleContinueToMenu}
                className="h-12 w-full rounded-2xl text-base font-semibold text-white shadow-[0_16px_36px_-24px_rgba(0,0,0,0.9)]"
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
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[360px] overflow-hidden rounded-[28px] border border-[#f1dcc4]/16 bg-[#14100b]/96 p-0 text-[#fff7e9] shadow-[0_30px_90px_-45px_rgba(0,0,0,0.95)] backdrop-blur-xl ring-1 ring-white/5 sm:max-w-[380px] [&>button]:text-[#c9b7a0] [&>button]:hover:text-[#fff7e9]">
          <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto px-5 py-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#f1dcc4]/14 bg-[#f6e8d3]/10">
              <svg
                className="w-7 h-7"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="#E9A35E"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                />
              </svg>
            </div>

            <DialogTitle className="mb-1 text-balance text-xl font-semibold leading-tight text-[#fff7e9]">
              {t("join_session_title")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t("join_session_description")}
            </DialogDescription>
            <p className="mx-auto mb-6 max-w-[26ch] text-sm leading-5 text-[#c9b7a0]">
              {t("join_session_description")}
            </p>

            {requirePasscode && (
              <Input
                type="text"
                inputMode="text"
                autoCapitalize="characters"
                maxLength={CUSTOMER_SESSION_CODE_LENGTH}
                placeholder={t("enter_passcode")}
                value={passcode}
                onChange={(e) => {
                  setPasscode(sanitizeCustomerSessionCodeInput(e.target.value));
                  if (joinError) setJoinError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isJoiningSession) {
                    void joinSession();
                  }
                }}
                autoFocus
                className="mb-6 h-14 w-full rounded-2xl border-[#f1dcc4]/14 bg-[#f6e8d3]/8 text-center text-2xl font-bold uppercase tracking-[0.25em] text-[#fff7e9] placeholder:text-[#c9b7a0]/45 focus-visible:ring-[#e9a35e]"
              />
            )}

            {joinError && (
              <p className="mb-4 rounded-2xl border border-[#e9a35e]/30 bg-[#e9a35e]/10 px-4 py-3 text-sm leading-5 text-[#ffd6ad]">
                {joinError}
              </p>
            )}

            {requirePasscode && !joinError && (
              <p className="mx-auto mb-4 max-w-[28ch] text-xs leading-5 text-[#c9b7a0]">
                {t("ask_for_passcode_instruction")}
              </p>
            )}

            <Button
              onClick={joinSession}
              disabled={
                isJoiningSession ||
                (requirePasscode &&
                  passcode.length !== CUSTOMER_SESSION_CODE_LENGTH)
              }
              className="mb-3 h-12 w-full rounded-2xl text-base font-semibold text-white shadow-[0_16px_36px_-24px_rgba(0,0,0,0.9)]"
              style={{ backgroundColor: brandColor, borderColor: brandColor }}
            >
              {isJoiningSession ? t("starting") : t("join")}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowJoinDialog(false)}
              className="h-10 w-full rounded-2xl text-sm text-[#c9b7a0] hover:bg-[#f6e8d3]/8 hover:text-[#fff7e9]"
            >
              {t("cancel")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
