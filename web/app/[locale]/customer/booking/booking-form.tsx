"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, CheckCircle, CalendarIcon, ClockIcon, UsersIcon, ShoppingBag } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils/currency"; // Assuming this utility

// Schema for form validation (mirroring API's Zod schema but for client-side)
const PreOrderItemClientSchema = z.object({
  menuItemId: z.string(),
  quantity: z.number().min(1),
  selected: z.boolean().optional(), // For client-side handling
});

const BookingFormSchema = z.object({
  tableId: z.string().min(1, "Table selection is required."),
  customerName: z.string().min(2, "Name must be at least 2 characters."),
  customerPhone: z.string().min(10, "Phone number seems too short."), // Basic validation
  customerEmail: z.string().email("Invalid email address.").optional().or(z.literal('')),
  bookingDate: z.date({ required_error: "Booking date is required."}),
  bookingTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM)."),
  partySize: z.number().min(1, "Party size must be at least 1 person."),
  notes: z.string().optional(),
  preOrderItems: z.array(PreOrderItemClientSchema).optional(),
});

type BookingFormData = z.infer<typeof BookingFormSchema>;

interface Table {
  id: string;
  name: string; // Already localized
  capacity: number;
}

interface MenuItem {
  id: string;
  name: string; // Already localized
  price: number;
  // currencyCode: string; // If needed, or use restaurantSettings.currency
}

interface BookingFormProps {
  availableTables: Table[];
  menuItemsForPreorder: MenuItem[];
  restaurantPrimaryColor: string;
  restaurantCurrency: string; // e.g. "JPY"
  locale: string;
}

export default function BookingForm({
  availableTables,
  menuItemsForPreorder,
  restaurantPrimaryColor,
  restaurantCurrency,
  locale,
}: BookingFormProps) {
  const t = useTranslations("BookingPage");
  const tCommon = useTranslations("Common");
  const router = useRouter();

  const { control, handleSubmit, register, watch, setValue, formState: { errors } } = useForm<BookingFormData>({
    resolver: zodResolver(BookingFormSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      bookingTime: "12:00", // Default time
      partySize: 1,
      notes: "",
      preOrderItems: menuItemsForPreorder.map(item => ({ menuItemId: item.id, quantity: 1, selected: false })),
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const watchedPreOrderItems = watch("preOrderItems", []);

  const onSubmit = async (data: BookingFormData) => {
    setIsSubmitting(true);
    setError(null);

    const actualPreOrderItems = data.preOrderItems
      ?.filter(item => item.selected && item.quantity > 0)
      .map(item => ({ menuItemId: item.menuItemId, quantity: item.quantity }));

    const payload = {
      ...data,
      bookingDate: format(data.bookingDate, "yyyy-MM-dd"), // Format date for API
      preOrderItems: actualPreOrderItems,
    };

    try {
      const response = await fetch("/api/v1/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error(t("errorConflict"));
        }
        throw new Error(result.error || result.details?.map((d:any)=>d.message).join(', ') || t("errorSubmittingBooking"));
      }
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTextColor = (bgColor: string): string => {
    const color = bgColor.startsWith("#") ? bgColor.substring(1, 7) : bgColor;
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    return r * 0.299 + g * 0.587 + b * 0.114 > 186 ? "#000000" : "#ffffff";
  };
  const buttonTextColor = getTextColor(restaurantPrimaryColor);


  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center p-8 border rounded-lg shadow-xl">
        <CheckCircle className="mx-auto mb-6 h-20 w-20" style={{color: restaurantPrimaryColor}}/>
        <h2 className="text-3xl font-semibold mb-4">{t("bookingSubmittedTitle")}</h2>
        <p className="text-muted-foreground mb-8">{t("bookingSubmittedMessage")}</p>
        <Button asChild style={{backgroundColor: restaurantPrimaryColor, color: buttonTextColor }}>
          <Link href={`/${locale}/customer`}>{t("backToMenuButton")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center" style={{color: restaurantPrimaryColor}}>
        {t("formTitle")}
      </h1>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <Terminal className="h-4 w-4" />
          <AlertTitle>{tCommon("alert.error.title")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Personal Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="customerName" className="block text-sm font-medium">{t("nameLabel")}</label>
            <Input id="customerName" {...register("customerName")} className="mt-1"/>
            {errors.customerName && <p className="text-sm text-red-600 mt-1">{errors.customerName.message}</p>}
          </div>
          <div>
            <label htmlFor="customerPhone" className="block text-sm font-medium">{t("phoneLabel")}</label>
            <Input id="customerPhone" {...register("customerPhone")} className="mt-1"/>
            {errors.customerPhone && <p className="text-sm text-red-600 mt-1">{errors.customerPhone.message}</p>}
          </div>
        </div>
        <div>
            <label htmlFor="customerEmail" className="block text-sm font-medium">{t("emailLabel")}</label>
            <Input id="customerEmail" type="email" {...register("customerEmail")} className="mt-1"/>
            {errors.customerEmail && <p className="text-sm text-red-600 mt-1">{errors.customerEmail.message}</p>}
        </div>

        {/* Booking Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="tableId" className="block text-sm font-medium">{t("tableLabel")}</label>
            <Controller
              name="tableId"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t("selectTablePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTables.map(table => (
                      <SelectItem key={table.id} value={table.id}>
                        {table.name} (Capacity: {table.capacity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.tableId && <p className="text-sm text-red-600 mt-1">{errors.tableId.message}</p>}
          </div>
          <div>
            <label htmlFor="partySize" className="block text-sm font-medium">{t("partySizeLabel")}</label>
            <Input id="partySize" type="number" {...register("partySize", { valueAsNumber: true })} className="mt-1"/>
            {errors.partySize && <p className="text-sm text-red-600 mt-1">{errors.partySize.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="bookingDate" className="block text-sm font-medium">{t("dateLabel")}</label>
            <Controller
              name="bookingDate"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full mt-1 justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, "PPP") : <span>{t("selectDatePlaceholder")}</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus disabled={{ before: new Date() }}/>
                  </PopoverContent>
                </Popover>
              )}
            />
            {errors.bookingDate && <p className="text-sm text-red-600 mt-1">{errors.bookingDate.message}</p>}
          </div>
          <div>
            <label htmlFor="bookingTime" className="block text-sm font-medium">{t("timeLabel")}</label>
            <Input id="bookingTime" type="time" {...register("bookingTime")} className="mt-1"/>
            {errors.bookingTime && <p className="text-sm text-red-600 mt-1">{errors.bookingTime.message}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium">{t("notesLabel")}</label>
          <Textarea id="notes" {...register("notes")} rows={3} className="mt-1" placeholder={t("notesPlaceholder")}/>
          {errors.notes && <p className="text-sm text-red-600 mt-1">{errors.notes.message}</p>}
        </div>

        {/* Pre-order Section */}
        {menuItemsForPreorder.length > 0 && (
          <div className="pt-4">
            <h2 className="text-xl font-semibold mb-3 flex items-center" style={{color: restaurantPrimaryColor}}>
              <ShoppingBag className="mr-2 h-5 w-5"/>{t("preOrderTitle")}
            </h2>
            <div className="space-y-3 max-h-60 overflow-y-auto p-3 border rounded-md">
              {menuItemsForPreorder.map((menuItem, index) => (
                <div key={menuItem.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                  <div className="flex items-center">
                    <Controller
                        name={`preOrderItems.${index}.selected`}
                        control={control}
                        render={({ field }) => (
                            <Checkbox
                                id={`preOrderItems.${index}.selected`}
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="mr-3"
                            />
                        )}
                    />
                    <label htmlFor={`preOrderItems.${index}.selected`} className="text-sm font-medium cursor-pointer">
                        {menuItem.name} <span className="text-xs text-muted-foreground">({formatCurrency(menuItem.price, restaurantCurrency, locale)})</span>
                    </label>
                  </div>
                  {watchedPreOrderItems?.[index]?.selected && (
                     <Controller
                        name={`preOrderItems.${index}.quantity`}
                        control={control}
                        defaultValue={1}
                        render={({ field }) => (
                            <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value,10) || 0)}
                                className="w-20 h-8 text-sm"
                                min={1}
                            />
                        )}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <Button type="submit" className="w-full text-lg py-6" disabled={isSubmitting} style={{backgroundColor: restaurantPrimaryColor, color: buttonTextColor}}>
          {isSubmitting ? tCommon("loading") : t("submitButton")}
        </Button>
      </form>
    </div>
  );
}
