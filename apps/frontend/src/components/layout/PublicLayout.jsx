import { Link, NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Accueil" },
  { to: "/properties", label: "Biens" },
  { to: "/login", label: "Connexion" }
];

export const PublicLayout = () => (
  <div className="min-h-screen bg-stone-950 text-stone-100">
    <header className="border-b border-white/10 bg-stone-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="text-2xl font-semibold tracking-wide text-brand-100">
          Yopii
        </Link>
        <nav className="flex gap-5 text-sm text-stone-300">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? "text-white" : "transition hover:text-white")}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
    <main>
      <Outlet />
    </main>
  </div>
);
