import { useState } from "react";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { ImageIcon, PencilIcon, RotateCcwIcon } from "lucide-react";
import type { Deposit } from "@shared/types";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { HoldToConfirmButton } from "@/components/common/HoldToConfirmButton";
import { ImageLightbox } from "@/components/common/ImageLightbox";
import { DepositTicket } from "@/components/deposit/DepositTicket";
import { DepositEditForm } from "@/components/deposit/DepositEditForm";
import { DepositStatusNotice } from "@/components/deposit/DepositStatusNotice";
import { formatDepositValue, getDepositState } from "@/components/deposit/depositStatus";
import { useDeleteDepositMutation, useSetDepositUsedMutation } from "@/hooks/useDepositMutations";
import { showSuccessToast } from "@/utils/toastHandler";

interface DepositDetailsOverlayProps {
  deposit: Deposit;
  children: React.ReactNode;
}

// Voucher details: ticket with a big barcode to scan at the till, fullscreen photo,
// hold-to-confirm "mark as used" / undo. "Edit" switches the same drawer into a form
// (like renaming in ListSettingsOverlay), where the voucher can also be deleted.
export function DepositDetailsOverlay({ deposit, children }: DepositDetailsOverlayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);
  const { mutate: setUsed, isPending: isSettingUsed } = useSetDepositUsedMutation();
  const { mutate: deleteDeposit, isPending: isDeleting } = useDeleteDepositMutation();

  const isUsed = !!deposit.used_at;

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) setTimeout(() => setIsEditing(false), 300); // Czekamy na animację zamknięcia
  };

  const markUsed = () => {
    setUsed(
      { depositId: deposit.id, used: true },
      {
        onSuccess: () => {
          // Short pause so the "Wykorzystany" state is visible before the drawer closes
          window.setTimeout(() => handleOpenChange(false), 400);
          showSuccessToast(`Wykorzystano kupon na ${formatDepositValue(deposit.value)}`);
        },
      },
    );
  };

  const handleDelete = () => {
    deleteDeposit(deposit.id, {
      onSuccess: () => {
        handleOpenChange(false);
        showSuccessToast(`Usunięto kupon na ${formatDepositValue(deposit.value)}`);
      },
    });
  };

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>

      <DrawerContent className="bg-background border-border px-4 pb-[max(24px,var(--safe-bottom))]">
        <DrawerHeader className="px-0 text-left">
          <DrawerTitle>{isEditing ? "Edytuj kupon" : "Kupon kaucji"}</DrawerTitle>
          <DrawerDescription>
            {isEditing
              ? "Popraw dane kuponu, jeśli coś się źle odczytało."
              : deposit.expiring_date
                ? `${getDepositState(deposit) === "expired" ? "Był ważny" : "Ważny"} do ${format(parseISO(deposit.expiring_date), "d MMMM yyyy", { locale: pl })}`
                : "Bez daty ważności"}
          </DrawerDescription>
        </DrawerHeader>

        <div className="mx-auto flex w-full max-w-sm flex-col gap-4 py-2">
          {isEditing ? (
            <>
              <DepositEditForm deposit={deposit} onDone={() => setIsEditing(false)} />

              {/* Delete lives in edit mode, away from the everyday buttons, and needs a hold */}
              <HoldToConfirmButton
                variant="destructive"
                className="h-11 w-full"
                disabled={isDeleting}
                onConfirm={handleDelete}
                holdingLabel="Trzymaj…"
                doneLabel="Usunięto"
              >
                Przytrzymaj, aby usunąć kupon
              </HoldToConfirmButton>
            </>
          ) : (
            <>
              {/* Used / expired / expiring soon - said plainly before the barcode */}
              <DepositStatusNotice deposit={deposit} />
              <DepositTicket deposit={deposit} />

              <div className="flex gap-2">
                {deposit.image_url && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-11 shrink-0"
                    aria-label="Pokaż zdjęcie kuponu"
                    onClick={() => setIsPhotoOpen(true)}
                  >
                    <ImageIcon />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  className="size-11 shrink-0"
                  aria-label="Edytuj kupon"
                  onClick={() => setIsEditing(true)}
                >
                  <PencilIcon />
                </Button>

                {isUsed ? (
                  <Button
                    variant="outline"
                    className="h-11 flex-1"
                    disabled={isSettingUsed}
                    onClick={() => setUsed({ depositId: deposit.id, used: false })}
                  >
                    <RotateCcwIcon /> Cofnij wykorzystanie
                  </Button>
                ) : (
                  <HoldToConfirmButton
                    className="h-11 flex-1"
                    disabled={isSettingUsed}
                    onConfirm={markUsed}
                    // Short enough not to hold up the till, long enough to rule out a stray tap
                    durationMs={800}
                    holdingLabel="Trzymaj…"
                    doneLabel="Wykorzystany"
                  >
                    Przytrzymaj, aby wykorzystać
                  </HoldToConfirmButton>
                )}
              </div>
            </>
          )}
        </div>

        {deposit.image_url && (
          <ImageLightbox
            src={deposit.image_url}
            fullSrc={deposit.image_original_url}
            alt={`Zdjęcie kuponu ${deposit.shop_name ?? ""}`}
            open={isPhotoOpen}
            onOpenChange={setIsPhotoOpen}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}
