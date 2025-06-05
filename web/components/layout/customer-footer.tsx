import { useTranslations } from "next-intl";

interface CustomerFooterProps {
  restaurantSettings: {
    name: string;
  };
}

export default function CustomerFooter({
  restaurantSettings,
}: CustomerFooterProps) {
  const t = useTranslations("CustomerLayout");
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t py-6 md:py-8">
      <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
        <p className="text-sm text-muted-foreground">
          {t("copyright", { year: currentYear, restaurantName: restaurantSettings.name })}
        </p>
        <p className="text-sm text-muted-foreground">
          {t("poweredBy")}
        </p>
      </div>
    </footer>
  );
}
