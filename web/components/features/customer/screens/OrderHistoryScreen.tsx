"use client";
import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Clock, CheckCircle, Utensils, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetCurrentLocale, getLocalizedText } from "@/lib/customerUtils";
import type { RestaurantSettings } from "@/shared/types/customer";

import { MenuViewProps, ViewProps, ViewType, ThankYouScreenViewProps } from "./types"; // Updated imports

interface OrderHistoryScreenProps {
	setView: (view: ViewType, props?: ViewProps) => void;
	restaurantSettings: RestaurantSettings;
	viewProps: MenuViewProps; // OrderHistoryScreen is often navigated from a context that fits MenuViewProps
}

interface OrderItem {
	id: string;
	quantity: number;
	notes?: string;
	status: 'ordered' | 'preparing' | 'ready' | 'served';
	created_at: string;
	name_en: string;
	name_ja: string;
	name_vi: string;
	unit_price: number;
	total: number;
	menu_item_id: string;
}

interface Order {
	id: string;
	session_id: string;
	guest_count: number;
	status: string;
	table_id: string | null;
	table_name: string | null;
	total_amount: number;
	created_at: string;
	items: OrderItem[];
}

export function OrderHistoryScreen({
	setView,
	restaurantSettings,
	viewProps,
}: OrderHistoryScreenProps) {
	const t = useTranslations("Customer");
	const tCommon = useTranslations("Common");
	const { tableId, sessionId, tableNumber } = viewProps;
	const locale = useGetCurrentLocale();
	const [order, setOrder] = useState<Order|null>(null);
	const [loading, setLoading] = useState(true);
	const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
	//const totalPrice = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
	const guestCount = viewProps.guestCount || order?.guest_count || 1;

	const fetchOrderHistory = async () => {
		try {
			const params = new URLSearchParams();
			if (tableId) params.append('tableId', tableId); // Only append if tableId exists
			if (sessionId) {
				params.append('sessionId', sessionId);
			}

			const response = await fetch(`/api/v1/orders/session-info?${params.toString()}`); // Ensure params is stringified
			const data = await response.json();

			if (data.success) {
				setOrder(data.orders || null);
				setCurrentSessionId(data.currentSessionId || null);
			}
		} catch (error) {
			console.error("Failed to fetch order history:", error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchOrderHistory();

		// Poll for updates every 30 seconds only if order is active
		let interval: NodeJS.Timeout;
		if (order && order.status !== 'completed' && order.status !== 'cancelled') {
			interval = setInterval(fetchOrderHistory, 30000);
			return () => clearInterval(interval);
		}
	}, [tableId, sessionId]);

	const getStatusIcon = (status: string) => {
		switch (status) {
			case 'ordered':
				return <Clock className="h-4 w-4" />;
			case 'preparing':
				return <Utensils className="h-4 w-4" />;
			case 'ready':
				return <Truck className="h-4 w-4" />;
			case 'served':
				return <CheckCircle className="h-4 w-4" />;
			default:
				return <Clock className="h-4 w-4" />;
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'ordered':
				return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
			case 'preparing':
				return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
			case 'ready':
				return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
			case 'served':
				return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
			default:
				return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
		}
	};

	const getStatusText = (status: string) => {
		switch (status) {
			case 'ordered':
				return t("thankyou.status_ordered");
			case 'preparing':
				return t("thankyou.status_preparing");
			case 'ready':
				return t("thankyou.status_ready");
			case 'served':
				return t("thankyou.status_completed");
			default:
				return status;
		}
	};

	const isCurrentSession = (order: Order) => {
		return currentSessionId && order.session_id === currentSessionId;
	};

	if (loading) {
		return (
			<div className="max-w-2xl mx-auto p-4">
				<div className="flex items-center mb-6">
					<Button
						onClick={() => setView("thankyou", { ...viewProps, orderId: viewProps.orderId || "N/A" } as ThankYouScreenViewProps)} // Ensure orderId is present for ThankYouScreenViewProps
						variant="ghost"
						size="sm"
						className="mr-2"
					>
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<h1 className="text-2xl font-bold">{t("thankyou.order_history_title")}</h1>
				</div>
				<div className="text-center py-8">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
					<p className="mt-2 text-gray-600">Loading order history...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="max-w-2xl mx-auto p-4">
			<div className="flex items-center mb-6">
				<Button
					onClick={() => setView("thankyou", { ...viewProps, orderId: viewProps.orderId || "N/A" } as ThankYouScreenViewProps)} // Ensure orderId is present
					variant="ghost"
					size="sm"
					className="mr-2"
				>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<h1 className="text-2xl font-bold">{t("thankyou.order_history_title")}</h1>
			</div>

			{tableNumber && (
				<Card className="p-4 mb-6">
					<h2 className="font-semibold text-lg">
						{t("thankyou.table_number", { number: tableNumber })}
					</h2>
					<p className="text-sm text-gray-600 dark:text-gray-300">
						{ order&& order.status !== "completed" ? t("session_active_more") : t("thankyou.inactive_session_message") }
					</p>
					{order && order.status !== "completed" && order.status !== "expired" && (
						<div className="mt-2 text-center">
						<p className="text-sm text-gray-600 mb-4">
						{t("session.share_passcode")}
						</p>
						<div className="bg-gray-100 p-2 rounded-lg mb-4">
						<span className="text-2xl font-mono font-bold tracking-widest text-blue-600">
							{order?.id.substring(0,4).toUpperCase()}
						</span>
						</div>
						<p className="text-xs text-gray-500">
						{t("session.passcode_instruction")}
						</p>
					</div>)}
				</Card>
			)}

			{order === null ? (
				<Card className="p-8 text-center">
					<h3 className="text-lg font-semibold mb-2">{t("no_order_found")}</h3>
					<p className="text-gray-600 dark:text-gray-300 mb-4">
						{t("no_order_items")}
					</p>
					<Button
						onClick={() => setView("menu", viewProps as MenuViewProps)} // viewProps is already MenuViewProps
						style={{ backgroundColor: restaurantSettings.primaryColor || "#0ea5e9" }}
						className="text-white hover:opacity-90"
					>
					{t("guest_dialog.confirm")}
					</Button>
				</Card>
			) : (
				<div className="space-y-4">
						<Card key={order.id} className="p-4">
							<div className="flex justify-between items-start mb-4">
								<div>
									<div className="flex items-center gap-2 mb-1">
										<h3 className="font-semibold">
											 {t("current_session")}
										</h3>
										{order && (
											<Badge className="bg-green-100 text-green-800">{t("active")}</Badge>
										)}
									</div>
									<p className="text-sm text-gray-600 dark:text-gray-300">
										{new Date(order.created_at).toLocaleString()}
									</p>
								</div>
								<div className="text-right">
									<p className="font-semibold">
										{t("currency_format", { value: order.total_amount })}
									</p>
									<p className="text-sm text-gray-600 dark:text-gray-300">
										{order.items.length} {order.items.length === 1 ? t("thankyou.item") : t("thankyou.items")}
									</p>
								</div>
							</div>

							<div className="space-y-3">
								{order.items.map((item) => (
									<div key={item.id} className="flex justify-between items-start">
										<div className="flex-1">
											<h4 className="font-medium">
												{getLocalizedText({ "name_en": item.name_en, "name_vi": item.name_vi, "name_jp": item.name_ja }, locale)}
											</h4>
											<div className="flex items-center gap-2 mt-1">
												<p className="text-sm text-gray-600 dark:text-gray-300">
													{t("menu.item_quantity", {quantity: item.quantity})}
												</p>
												<Badge className={`text-xs ${getStatusColor(item.status)}`}>
													<span className="flex items-center gap-1">
														{getStatusIcon(item.status)}
														{getStatusText(item.status)}
													</span>
												</Badge>
											</div>
											{item.notes && (
												<p className="text-sm text-gray-500 mt-1">
													{t("menu.item_notes",{notes: item.notes})}
												</p>
											)}
										</div>
										<div className="text-right ml-4">
											<p className="font-medium">
												{t("currency_format", { value: item.total })}
											</p>
										</div>
									</div>
								))}
							</div>

							{isCurrentSession(order) && (
								<div className="mt-4 pt-4 border-t">
									<Button
										onClick={() => setView("menu", viewProps as MenuViewProps)} // viewProps is already MenuViewProps
										variant="outline"
										size="sm"
										style={{ borderColor: restaurantSettings.primaryColor || "#0ea5e9" }}
										className="w-full"
									>
										{tCommon("add_more_items")}
									</Button>
								</div>
							)}
						</Card>
				</div>
			)}

			<div className="mt-6 text-center">
				{/**TODO: implement checkout view, and set view to checkout */}
				{order && order.status !== "completed" && (
				<Button
					onClick={() => alert(t("currency_format", { value: order?.total_amount || 0 }))} // Show total amount of the first order
					style={{ backgroundColor: restaurantSettings.primaryColor || "#0ea5e9" }}
					className="text-white w-full mb-2"
				>
					{t("orderhistory.checkout_button")}
				</Button>)}
				{guestCount > 2 && (
					<p className="text-sm text-gray-600">{t("orderhistory.price_per_person", { value: (order?.total_amount||0 / guestCount).toFixed(2) })}</p>
				)}
				<Button
					onClick={() => setView("menu", viewProps as MenuViewProps)}
					style={{ backgroundColor: restaurantSettings.primaryColor || "#0ea5e9" }}
					className="text-white hover:opacity-90 mt-4"
				>
					{tCommon("back_to_menu")}
				</Button>
			</div>
		</div>
	);
}