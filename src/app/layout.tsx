import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { getSnapshot } from "@/lib/data";
import { currentUser } from "@/lib/auth";
import ProgressBanner from "@/components/ProgressBanner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bäst Fotbollskunskap 2026/27",
  description: "Privat tävling kring Premier League 2026/27",
};

export const dynamic = "force-dynamic";

async function Footer() {
  let updatedAt: string | null = null;
  try {
    updatedAt = (await getSnapshot())?.updatedAt ?? null;
  } catch {
    // Saknad databas ska inte fälla hela sajten
  }
  return (
    <footer className="mt-12 border-t border-slate-200 py-6 text-center text-xs text-slate-500">
      {updatedAt ? (
        <p>
          Senast uppdaterad:{" "}
          {new Date(updatedAt).toLocaleString("sv-SE", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "Europe/Stockholm",
          })}
        </p>
      ) : (
        <p>Ingen data hämtad än</p>
      )}
      <p className="mt-1">Bäst Fotbollskunskap 2026/27</p>
    </footer>
  );
}

async function Nav() {
  let user = null;
  try {
    user = await currentUser();
  } catch {}
  const links = [
    { href: "/", label: "Hem" },
    { href: "/gissning", label: "Gissningen" },
    { href: "/tabell", label: "Ligatabellen" },
    { href: "/pl", label: "PL-tabellen" },
    { href: "/regler", label: "Reglerna" },
  ];
  return (
    <nav className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-1 overflow-x-auto px-3 py-2 text-sm">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="whitespace-nowrap rounded-md px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-100"
          >
            {l.label}
          </Link>
        ))}
        <span className="ml-auto whitespace-nowrap pl-2 text-xs text-slate-500">
          {user ? user.name : ""}
        </span>
      </div>
    </nav>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body className={inter.className}>
        <Nav />
        <ProgressBanner />
        <main className="mx-auto max-w-3xl px-3 py-6">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
