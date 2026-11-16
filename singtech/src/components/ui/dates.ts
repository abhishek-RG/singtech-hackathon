// Fixed UTC so the server render and the browser always print the same day.
const fmt = new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export const formatDate = (iso: string) => fmt.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
