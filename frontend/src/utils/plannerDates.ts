import { format } from "date-fns";

// Date as the backend expects it (local day, not UTC - toISOString() would shift it near midnight)
export const toDateKey = (date: Date) => format(date, "yyyy-MM-dd");
