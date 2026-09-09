import { Bell, BellOff, Loader2Icon } from "lucide-react";
import { SettingsSection } from "./SettingsSection";
import { SettingsRow } from "./SettingsRow";
import { Switch } from "@/components/ui/switch";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { showErrorToast, showSuccessToast } from "@/utils/toastHandler";

export function NotificationsSection() {
  const { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe } =
    usePushNotifications();

  if (!isSupported) return null;

  const handleToggle = async (checked: boolean) => {
    try {
      if (!checked) {
        await unsubscribe();
        showSuccessToast("Powiadomienia wyłączone");
        return;
      }

      await subscribe();
      if (Notification.permission === "granted") {
        showSuccessToast("Powiadomienia włączone");
      } else {
        showErrorToast("Brak zgody na powiadomienia w przeglądarce");
      }
    } catch (error) {
      showErrorToast(error as Error);
    }
  };

  return (
    <SettingsSection
      title="Powiadomienia"
      description="Dostawaj powiadomienie, gdy ktoś inny doda produkty do wspólnej listy."
    >
      <SettingsRow
        icon={isSubscribed ? <Bell className="size-4" /> : <BellOff className="size-4" />}
        label="Powiadomienia push"
        trailing={
          isLoading ? (
            <Loader2Icon size={18} className="animate-spin text-muted-foreground" />
          ) : (
            <Switch checked={isSubscribed} onCheckedChange={handleToggle} />
          )
        }
      />
      {permission === "denied" && (
        <p className="px-1 pt-2 text-xs text-muted-foreground/70">
          Zablokowano powiadomienia dla tej strony - żeby je włączyć, zmień to w ustawieniach
          witryny w przeglądarce.
        </p>
      )}
    </SettingsSection>
  );
}
