import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ShoppingCart, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export default function Header({ onSearch }) {
  const { user, profile, signOut } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleSearchSubmit(e) {
    e.preventDefault();
    onSearch?.(query);
    navigate("/");
  }

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  const initials = (profile?.nombre_completo || user?.email || "?")
    .trim()
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 bg-graphite text-bone border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Marca */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="w-2.5 h-2.5 rounded-sm bg-brand-500" />
            <span className="font-display font-semibold text-lg tracking-tight">
              Industr<span className="text-brand-500">IA</span>
            </span>
          </Link>

          {/* Nav desktop */}
          <nav className="hidden md:flex items-center gap-6 font-medium text-sm text-bone/80">
            <Link to="/" className="hover:text-brand-500 transition-colors">
              Catálogo
            </Link>
            <Link
              to="/historial"
              className="hover:text-brand-500 transition-colors"
            >
              Historial
            </Link>
            <a href="#soporte" className="hover:text-brand-500 transition-colors">
              Soporte
            </a>
            <Link to='/vincular-movil' className='hover:text-brand-500 transition-colors'>
  Vincular app
</Link>
          </nav>

          {/* Buscador */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden sm:flex flex-1 max-w-md relative"
          >
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-steel"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                onSearch?.(e.target.value);
              }}
              placeholder="Buscar productos, categorías, specs..."
              className="w-full bg-white/5 border border-white/10 rounded-md pl-9 pr-3 py-2 text-sm placeholder:text-steel focus:bg-white/10 focus:border-brand-500/50 outline-none transition-colors"
            />
          </form>

          {/* Acciones */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/quote-form"
              className="relative p-2 rounded-md hover:bg-white/10 transition-colors"
              aria-label="Ver cotización"
            >
              <ShoppingCart size={20} />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-brand-500 text-graphite text-[10px] font-mono font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>

            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-white/10">
              <div className="w-8 h-8 rounded-full bg-brand-500/20 text-brand-500 font-mono text-xs font-semibold flex items-center justify-center">
                {initials}
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 rounded-md hover:bg-white/10 transition-colors"
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <LogOut size={18} />
              </button>
            </div>

            <button
              className="md:hidden p-2"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Abrir menú"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden pb-4 flex flex-col gap-3 text-sm font-medium">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-steel"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  onSearch?.(e.target.value);
                }}
                placeholder="Buscar productos..."
                className="w-full bg-white/5 border border-white/10 rounded-md pl-9 pr-3 py-2 text-sm outline-none"
              />
            </form>
            <Link to="/" onClick={() => setMobileOpen(false)}>
              Catálogo
            </Link>
            <Link to="/historial" onClick={() => setMobileOpen(false)}>
              Historial
            </Link>
            <button onClick={handleSignOut} className="text-left text-amber-500">
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
