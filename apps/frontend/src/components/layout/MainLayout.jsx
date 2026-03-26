import { Link, Outlet } from "react-router-dom";

const navigation = [
  { to: "/", label: "Accueil" },
  { to: "/properties", label: "Biens" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/messages", label: "Messages" }
];

export const MainLayout = () => (
  <div className="min-h-screen bg-stone-950 text-stone-100">
    <header className="border-b border-white/10 bg-stone-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="text-2xl font-semibold tracking-wide text-brand-100">
          Yopii
        </Link>
        <nav className="flex gap-5 text-sm text-stone-300">
          {navigation.map((item) => (
            <Link key={item.to} to={item.to} className="transition hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
    <main>
      <Outlet />
    </main>
  </div>
);
