// Case- and accent-insensitive text for search, so "zabka" finds "Żabka"
// and "intermarche" finds "Intermarché" (ł doesn't decompose in NFD, hence the extra replace)
export const normalizeSearch = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l");
