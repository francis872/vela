"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import VelaGuide from "@/components/vela-guide";
import BrandLogo from "@/components/brand-logo";

const NAV_ITEMS = [
  {
    href: "/vela",
    label: "Command",
    exact: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".9"/>
        <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5"/>
        <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5"/>
        <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".9"/>
      </svg>
    ),
  },
  {
    href: "/build",
    label: "Build",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 1L10.5 6H14L10.5 9.5L12 14L8 11L4 14L5.5 9.5L2 6H5.5L8 1Z" fill="currentColor" opacity=".85"/>
      </svg>
    ),
  },
  {
    href: "/validate",
    label: "Validate",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" opacity=".85"/>
        <circle cx="8" cy="8" r="2.5" fill="currentColor" opacity=".85"/>
      </svg>
    ),
  },
  {
    href: "/capital",
    label: "Capital",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 12L5.5 7.5L8.5 9.5L13 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity=".85"/>
        <circle cx="13" cy="3" r="1.5" fill="currentColor" opacity=".85"/>
      </svg>
    ),
  },
  {
    href: "/relay",
    label: "Relay",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="3" r="2" fill="currentColor" opacity=".85"/>
        <circle cx="3" cy="13" r="2" fill="currentColor" opacity=".6"/>
        <circle cx="13" cy="13" r="2" fill="currentColor" opacity=".6"/>
        <path d="M8 5L3 11M8 5L13 11" stroke="currentColor" strokeWidth="1.2" opacity=".5"/>
      </svg>
    ),
  },
  {
    href: "/network",
    label: "Network",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="3" cy="8" r="1.75" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="13" cy="3" r="1.75" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="13" cy="13" r="1.75" stroke="currentColor" strokeWidth="1.3" />
        <path d="m4.5 7.3 6.8-3.2M4.5 8.7l6.8 3.2" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    href: "/space",
    label: "Space",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="3" width="14" height="2.5" rx="1.25" fill="currentColor" opacity=".85"/>
        <rect x="1" y="7.5" width="9" height="2" rx="1" fill="currentColor" opacity=".55"/>
        <rect x="1" y="11.5" width="11" height="2" rx="1" fill="currentColor" opacity=".4"/>
      </svg>
    ),
  },
  {
    href: "/inspire",
    label: "Inspire",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 2L9.5 5.5H13.5L10.5 7.5L11.5 11L8 9L4.5 11L5.5 7.5L2.5 5.5H6.5L8 2Z" fill="currentColor" opacity=".85"/>
      </svg>
    ),
  },
  {
    href: "/bizzu",
    label: "BiZZu",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="5.5" r="3.5" stroke="currentColor" strokeWidth="1.5" opacity=".85"/>
        <path d="M6 9.5C4 10.5 2.5 12 2.5 14h11c0-2-1.5-3.5-3.5-4.5" stroke="currentColor" strokeWidth="1.2" opacity=".6" strokeLinecap="round"/>
        <circle cx="8" cy="5.5" r="1.2" fill="currentColor" opacity=".85"/>
      </svg>
    ),
  },
  {
    href: "/engine",
    label: "Engine",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 1.5L9 4.5H12L9.5 6.5L10.5 9.5L8 7.5L5.5 9.5L6.5 6.5L4 4.5H7L8 1.5Z" fill="currentColor" opacity=".85"/>
        <path d="M3 12.5H13M5 14.5H11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity=".5"/>
      </svg>
    ),
  },
  {
    href: "/softbox",
    label: "SOFTBOX",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="14" rx="1" fill="currentColor" opacity=".4"/>
        <rect x="9" y="1" width="6" height="9" rx="1" fill="currentColor" opacity=".9"/>
        <rect x="9" y="12" width="6" height="3" rx="1" fill="currentColor" opacity=".5"/>
      </svg>
    ),
  },
];

const BOTTOM_ITEMS = [
  { href: "/profile", label: "Profile" },
  { href: "/profile", label: "Settings" },
  { href: "/admin/waitlist", label: "Waitlist", adminOnly: true },
  { href: "/admin/content", label: "Contenido", adminOnly: true },
  { href: "/admin/users", label: "Usuarios", adminOnly: true },
];

type OsNavProps = {
  userName?: string;
  userRole?: string;
};

export default function OsNav({ userName, userRole }: OsNavProps) {
  const pathname = usePathname();
  const isAdmin = userRole === "admin";
  const [showUser, setShowUser] = useState(false);

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  const navGroups = [
    { label: "Operate", items: NAV_ITEMS.filter((item) => ["/build", "/validate", "/capital"].includes(item.href)) },
    { label: "Connect", items: NAV_ITEMS.filter((item) => ["/network", "/relay"].includes(item.href)) },
    { label: "Workspace", items: [
      { href: "/profile", label: "Venture", icon: NAV_ITEMS.find((item) => item.href === "/space")?.icon },
      { href: "/network", label: "Team", icon: NAV_ITEMS.find((item) => item.href === "/network")?.icon },
      { href: "/space", label: "Resources", icon: NAV_ITEMS.find((item) => item.href === "/space")?.icon },
    ] },
  ];

  const currentLabel = navGroups.flatMap((group) => group.items).find((item) => isActive(item.href))?.label ?? "Workspace";

  return (
    <>
    <header className="os-topbar">
      <span className="os-topbar-context">{currentLabel}</span>
      <input className="os-topbar-search" type="search" placeholder="Search anything in VELA…" aria-label="Search anything in VELA" disabled />
      <span className="os-topbar-date">WED, SEP 11, 2026 <b>•</b> WEEK 37</span>
      <button className="os-topbar-notification" type="button" aria-label="Notifications">○</button>
      <Link href="/profile" className="os-topbar-user">{userName ?? "Usuario"}</Link>
    </header>
    <nav className="os-sidebar">
      {/* Logo */}
      <div className="os-nav-logo">
        <BrandLogo variant="wordmark" priority />
        <span className="os-nav-tagline">VENTURE OPERATING SYSTEM</span>
      </div>

      {/* Primary nav */}
      <Link href="/vela" className={`os-nav-item ${isActive("/vela", true) ? "active" : ""}`}>
        <span className="nav-icon" aria-hidden="true">{NAV_ITEMS.find((item) => item.href === "/vela")?.icon}</span>
        Home
      </Link>
      {navGroups.map((group) => (
        <div key={group.label}>
          <div className="os-nav-group">{group.label}</div>
          {group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`os-nav-item ${isActive(item.href) ? "active" : ""}`}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      ))}

      {/* Bottom nav */}
      <div className="os-nav-bottom">
        {BOTTOM_ITEMS.filter((i) => !i.adminOnly || isAdmin).map((item) => (
          <Link
            key={`${item.href}-${item.label}`}
            href={item.href}
            className={`os-nav-item ${isActive(item.href) ? "active" : ""}`}
            style={{ fontSize: "0.8rem" }}
          >
            {item.label}
          </Link>
        ))}

        {/* User */}
        <button
          onClick={() => setShowUser(!showUser)}
          className="os-nav-item"
          style={{ marginTop: "0.5rem", width: "100%", textAlign: "left", fontSize: "0.8rem" }}
        >
          <span style={{
            width: 24, height: 24, borderRadius: "50%",
            background: "var(--accent-glow)", border: "1px solid var(--accent-glow-strong)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.7rem", fontWeight: 800, color: "var(--accent)", flexShrink: 0,
          }}>
            {userName ? userName.charAt(0).toUpperCase() : "?"}
          </span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {userName ?? "Usuario"}
          </span>
        </button>

        {showUser && (
          <div style={{ display: "grid", gap: "0.35rem", marginTop: "0.25rem" }}>
            <Link href="/profile" className="btn-ghost" style={{ width: "100%", fontSize: "0.8rem", justifyContent: "center", textDecoration: "none" }}>
              Perfil y seguridad
            </Link>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="btn-ghost" style={{ width: "100%", fontSize: "0.8rem", justifyContent: "center" }}>
                Salir
              </button>
            </form>
          </div>
        )}
      </div>
    </nav>
    <nav className="os-mobile-nav" aria-label="Primary navigation">
      {["/vela", "/build", "/validate", "/capital", "/profile"].map((href) => {
        const item = href === "/profile" ? { label: "Profile" } : NAV_ITEMS.find((candidate) => candidate.href === href);
        if (!item) return null;
        return <Link key={href} href={href} className={isActive(href, href === "/vela") ? "active" : ""}>{item.label}</Link>;
      })}
    </nav>
    <VelaGuide />
    </>
  );
}
