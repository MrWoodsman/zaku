import { useParams, Link } from "react-router-dom";
import { ROUTES } from "@/config/routes";
import { motion, AnimatePresence } from "framer-motion";
// UI
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
// COMPONENTS
import { ItemAddOverlay } from "@/components/overlay/items/ItemAddOverlay";
import { ItemCard } from "@/components/shopping-lists/ItemCard";
import { ItemsInListOverlay } from "@/components/overlay/items/ItemsInListOverlay";
import { useToggleItemMutation } from "@/hooks/useItemMutations";
import { useShoppingListQuery } from "@/hooks/useLists";
import { Loading } from "@/components/common/Loading";
import { NotFound } from "@/components/common/NotFound";

export function ShoppingScreen() {
  const { id } = useParams() as { id: string };

  const { data, isLoading, error } = useShoppingListQuery(id);
  const toggleItemMutation = useToggleItemMutation(id!);

  if (isLoading)
    return (
      <Loading
        title="Ładowanie zawartości listy"
        description="Jeśli to trwa zbyt długo, sprawdź swoje połączenie internetowe."
      />
    );
  if (error || !data)
    return (
      <NotFound
        title="Nie znaleziono zawartości listy"
        description="Ta lista nie istnieje lub wystąpił problem z połączeniem z serwerem."
      />
    );

  const items = data.items || [];
  const toBuyItems = items.filter((item) => !item.completed);
  const purchasedItems = items.filter((item) => item.completed);

  return (
    <div className="shopping-lists-list h-full flex flex-col bg-background">
      {/* TOP NAVIGATION */}
      <div className="pt-[max(8px,env(safe-area-inset-top))] px-2 pb-2 bg-background border-b z-50 flex items-center justify-between gap-3 shrink-0">
        <Breadcrumb className="flex-1 min-w-0">
          <BreadcrumbList className="flex-nowrap min-w-0 gap-1">
            <BreadcrumbItem className="shrink-0">
              <BreadcrumbLink asChild>
                <Link to={ROUTES.SHOPPING_LISTS}>Lista</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>

            <BreadcrumbSeparator className="shrink-0" />

            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="truncate block">{data.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-center gap-1 shrink-0">
          <ItemsInListOverlay listID={id!} items={data?.items || []} />
          <ItemAddOverlay listId={id!} />
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto px-2 space-y-2 scrollbar-gutter-stable pb-4">
        <Accordion type="multiple" defaultValue={["purchased", "to_buy"]}>
          {/* ... DO KUPIENIA ... */}
          <AccordionItem value="to_buy">
            <AccordionTrigger>Do kupienia ({toBuyItems.length})</AccordionTrigger>
            <AccordionContent className="flex flex-col pt-1 pb-3 h-fit">
              <AnimatePresence initial={false}>
                {toBuyItems.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: "auto", marginBottom: 8 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                    style={{ overflow: "hidden" }}
                  >
                    <ItemCard
                      listId={id!}
                      item={item}
                      onToggle={(completed) =>
                        toggleItemMutation.mutate({ itemId: item.id, completed })
                      }
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </AccordionContent>
          </AccordionItem>

          {/* ... KUPIONE ... */}
          <AccordionItem value="purchased">
            <AccordionTrigger>Kupione ({purchasedItems.length})</AccordionTrigger>
            <AccordionContent className="flex flex-col pt-1 pb-3 h-fit">
              <AnimatePresence initial={false}>
                {purchasedItems.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: "auto", marginBottom: 8 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                    style={{ overflow: "hidden" }}
                  >
                    <ItemCard
                      listId={id!}
                      item={item}
                      onToggle={(completed) =>
                        toggleItemMutation.mutate({ itemId: item.id, completed })
                      }
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
