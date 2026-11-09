import { BookOpen, Feather, LibraryBig, type LucideIcon, PenLine, Sparkles } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  subtitle?: () => string;
};

export const NAV: NavItem[] = [
  {
    href: "/",
    label: "Today",
    icon: PenLine,
    subtitle: () => new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
  },
  { href: "/library", label: "Library", icon: LibraryBig },
  { href: "/ask", label: "Ask", icon: Sparkles },
  { href: "/style", label: "My voice", icon: Feather },
];

const NOTE: NavItem = { href: "/notes", label: "Note", icon: BookOpen };

export function pageFor(pathname: string): NavItem {
  if (pathname.startsWith("/notes")) return NOTE;
  return NAV.find((n) => (n.href === "/" ? pathname === "/" : pathname.startsWith(n.href))) ?? NAV[0];
}

/** The sidebar item to highlight; a note highlights Library since that's where it lives. */
export function activeHref(pathname: string) {
  return pathname.startsWith("/notes") ? "/library" : pageFor(pathname).href;
}
