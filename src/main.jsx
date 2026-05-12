import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BadgeDollarSign,
  BarChart3,
  Boxes,
  Car,
  ChevronDown,
  CheckCircle2,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Filter,
  Gamepad2,
  Headphones,
  KeyRound,
  LayoutDashboard,
  Lock,
  Mail,
  Map,
  Menu,
  MessageCircle,
  Minus,
  Monitor,
  Package,
  Plus,
  Rocket,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Shirt,
  ShoppingCart,
  Star,
  Timer,
  Trash2,
  Upload,
  UserCircle,
  Wallet,
  Wrench,
  X,
  Zap,
  Image,
  Pickaxe,
  Crosshair,
  Globe,
  Target
} from "lucide-react";
import {
  siCounterstrike,
  siDiscord,
  siFivem,
  siFortnite,
  siRoblox,

  siSupercell,
  siUbisoft,
  siValorant
} from "simple-icons";
import "./styles.css";

const API = "/api";
const CART_KEY = "zyvory-cart";
const ADMIN_TOKEN_KEY = "zyvory-admin-token";

const CartContext = createContext(null);
const CurrencyContext = createContext(null);

const CURRENCIES = [
  { code: "EUR", symbol: "€", locale: "de-DE" },
  { code: "USD", symbol: "$", locale: "en-US" },
  { code: "GBP", symbol: "£", locale: "en-GB" },
  { code: "TRY", symbol: "₺", locale: "tr-TR" },
  { code: "TND", symbol: "د.ت", locale: "ar-TN" },
  { code: "CNY", symbol: "¥", locale: "zh-CN" },
];

function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState(() => localStorage.getItem("zyvory-currency") || "EUR");
  const [rates, setRates] = useState({});
  useEffect(() => {
    api("/prices").then((data) => {
      if (data && data.fiatRates) setRates(data.fiatRates);
    }).catch(() => {});
  }, []);
  useEffect(() => localStorage.setItem("zyvory-currency", currency), [currency]);
  const convert = (eurValue) => {
    if (currency === "EUR") return eurValue || 0;
    const key = `eurTo${currency.toLowerCase()}`;
    const rate = rates[key];
    return rate ? (eurValue || 0) * rate : eurValue || 0;
  };
  const value = useMemo(() => ({ currency, setCurrency, convert, rates }), [currency, rates]);
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

function useCurrency() { return useContext(CurrencyContext); }

function money(value, curr) {
  const code = curr || "EUR";
  const info = CURRENCIES.find((c) => c.code === code) || CURRENCIES[0];
  return new Intl.NumberFormat(info.locale, { style: "currency", currency: code }).format(value || 0);
}

function Money({ value }) {
  const ctx = useCurrency();
  if (!ctx) return money(value);
  return money(ctx.convert(value), ctx.currency);
}

async function api(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = isFormData
    ? { ...(options.headers || {}) }
    : { "Content-Type": "application/json", ...(options.headers || {}) };
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.error || "Request failed");
  return data;
}

function useRoute() {
  const [path, setPath] = useState(window.location.pathname + window.location.search);
  useEffect(() => {
    const sync = () => setPath(window.location.pathname + window.location.search);
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  const navigate = (href) => {
    window.history.pushState({}, "", href);
    setPath(window.location.pathname + window.location.search);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return { path, pathname: window.location.pathname, search: window.location.search, navigate };
}

function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    } catch {
      return [];
    }
  });
  useEffect(() => localStorage.setItem(CART_KEY, JSON.stringify(items)), [items]);
  const value = useMemo(() => {
    const add = (product) => {
      setItems((current) => {
        const existing = current.find((item) => item.productId === product.id);
        if (existing) return current.map((item) => (item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item));
        return [...current, { productId: product.id, slug: product.slug, name: product.name, image: product.image, price: product.price, category: product.category, quantity: 1 }];
      });
    };
    const update = (productId, quantity) => setItems((current) => current.map((item) => (item.productId === productId ? { ...item, quantity: Math.max(1, quantity) } : item)));
    const remove = (productId) => setItems((current) => current.filter((item) => item.productId !== productId));
    const clear = () => setItems([]);
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return { items, add, update, remove, clear, total, count: items.reduce((sum, item) => sum + item.quantity, 0) };
  }, [items]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

function useCart() {
  return useContext(CartContext);
}

function Link({ href, children, className = "", onClick }) {
  const route = useRouteContext();
  return (
    <a
      href={href}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        onClick?.();
        route.navigate(href);
      }}
    >
      {children}
    </a>
  );
}

const RouteContext = createContext(null);
function useRouteContext() {
  return useContext(RouteContext);
}

const categoryIcons = {
  FiveM: Gamepad2,
  Scripts: Code2,
  Maps: Map,
  Vehicles: Car,
  EUP: Shirt,
  Tools: Wrench,
  Accounts: UserCircle,
  Games: Monitor,
  Methods: KeyRound,
  Boosting: Rocket,
  VPN: Shield,
  Other: Boxes
};

const browseCategories = [
  { name: "Accounts", category: "Accounts", icon: UserCircle, color: "#6366f1" },
  { name: "Social", category: "Social", icon: UserCircle, color: "#ec4899" },
  { name: "Games", category: "Games", icon: Gamepad2, color: "#22d3ee" },
  { name: "Generators", category: "Generators", icon: Monitor, color: "#a78bfa" },
  { name: "Methods", category: "Methods", icon: KeyRound, color: "#f59e0b" },
  { name: "Spoofers", category: "Spoofers", icon: Shield, color: "#ef4444" },
  { name: "VPN", category: "VPN", icon: Globe, color: "#10b981" },
  { name: "Boosting", category: "Boosting", icon: Rocket, color: "#F8FBFF" },
  { name: "FiveM", category: "FiveM", brand: siFivem, color: "#F40552" },
  { name: "Counter-Strike 2", category: "Games", brand: siCounterstrike, color: "#DE9B35" },
  { name: "Valorant", category: "Games", brand: siValorant, color: "#FF4655" },
  { name: "Rainbow Six Siege", category: "Games", brand: siUbisoft, color: "#F8FBFF" },
  { name: "Fortnite", category: "Games", brand: siFortnite, color: "#00AFF0" },
  { name: "Minecraft", category: "Games", icon: Pickaxe, color: "#62B47A" },
  { name: "Roblox", category: "Games", brand: siRoblox, color: "#E2231A" },
  { name: "Rust", category: "Games", icon: Crosshair, color: "#CE412B" },
  { name: "Supercell", category: "Games", brand: siSupercell, color: "#5BC500" }
];

const marketplaceStats = [
  { value: "400K+", label: "Products Sold" },
  { value: "30K+", label: "Satisfied Customers" },
  { value: "4.98", label: "Average Rating" }
];

const buyerReviews = [
  { id: "seed-1", name: "M. Al", language: "EN", productName: "ChatGPT Plus", rating: 5, time: "18h ago", text: "Got the account fast, dashboard showed the details right away. smooth checkout." },
  { id: "seed-2", name: "Y. Ben", language: "AR", productName: "Valorant Access", rating: 5, time: "1d ago", text: "وصل الطلب بسرعة، كل البيانات كانت واضحة والدعم رد لما سألت." },
  { id: "seed-3", name: "Lina M.", language: "FR", productName: "NordVPN Lifetime", rating: 5, time: "1d ago", text: "Commande recue direct. Le lien marche bien, rien a redire pour le prix." },
  { id: "seed-4", name: "S. Lopez", language: "ES", productName: "CS2 Prime Account", rating: 5, time: "2d ago", text: "Todo ok, la cuenta llego con los datos correctos. Confirmacion un poco lenta pero bien." },
  { id: "seed-5", name: "T. Muller", language: "DE", productName: "Spotify Premium", rating: 4, time: "2d ago", text: "Hat funktioniert. Lieferung war schnell, nur die Zahlung hat paar Minuten gebraucht." },
  { id: "seed-6", name: "Kaan T.", language: "TR", productName: "Fortnite Account Gen", rating: 5, time: "3d ago", text: "Hesap geldi, mail bilgileri dogruydu. support iyi, tekrar alirim." },
  { id: "seed-7", name: "R. Silva", language: "PT", productName: "Netflix Lifetime", rating: 5, time: "3d ago", text: "Recebi o login certinho, sem enrolacao. painel simples de ver depois." },
  { id: "seed-8", name: "A. Nasser", language: "AR", productName: "FiveM Tools", rating: 4, time: "4d ago", text: "الملفات اشتغلت، احتجت اسأل عن التثبيت والدعم ساعدني." },
  { id: "seed-9", name: "Noah W.", language: "EN", productName: "FiveM Pack", rating: 5, time: "5d ago", text: "Pack worked after install. docs could be clearer tho, but delivery was instant." },
  { id: "seed-10", name: "D. Ivan", language: "RU", productName: "CS2 Prime", rating: 5, time: "5d ago", text: "ключ пришел быстро, проверил в кабинете, все нормально." },
  { id: "seed-11", name: "H. Chen", language: "EN", productName: "ChatGPT Accounts", rating: 5, time: "6d ago", text: "No weird login issue. got mail + pass, changed it and it stayed fine." },
  { id: "seed-12", name: "O. R.", language: "FR", productName: "Roblox Robux", rating: 4, time: "1w ago", text: "Service propre, pas fake. J'ai attendu un peu mais tout est arrive." }
];


function App() {
  const route = useRoute();
  return (
    <RouteContext.Provider value={route}>
      <CurrencyProvider>
        <CartProvider>
          <Shell>
            <Router />
          </Shell>
        </CartProvider>
      </CurrencyProvider>
    </RouteContext.Provider>
  );
}

function CurrencySelector() {
  const { currency, setCurrency } = useCurrency();
  return (
    <select className="currency-select" value={currency} onChange={(e) => setCurrency(e.target.value)}>
      {CURRENCIES.map((c) => (
        <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
      ))}
    </select>
  );
}

function Shell({ children }) {
  const { pathname } = useRouteContext();
  const [open, setOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const cart = useCart();
  const nav = [
    ["/", "Home"],
    ["/products", "Products"],
    ["/#reviews", "Reviews"]
  ];
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return <>{children}</>;
  }
  return (
    <div className="min-h-screen bg-[#02070D] text-[#F5FAFF]">
      <header className="site-header">
        <div className="site-nav">
          <Link href="/" className="brand-lockup">
            <span className="brand-mark">
              <img src="/images/zyvola-logo.png" alt="Zyvory logo" />
            </span>
            <span>
              <span className="brand-name">Zyvory</span>
              <span className="brand-subtitle">Digital Market</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-7 lg:flex">
            {nav.map(([href, label]) =>
              href.startsWith("http") ? (
                <a key={href} href={href} className="nav-link">
                  {label}
                </a>
              ) : (
                <Link key={href} href={href} className={label === "Dashboard" ? "nav-link dashboard-link" : "nav-link"}>
                  {label === "Cart" ? `Cart (${cart.count})` : label}
                </Link>
              )
            )}
            <a href="https://discord.gg/PKWwqG8uYB" className="discord-nav-link" aria-label="Join Discord">
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="currentColor">
                <path d={siDiscord.path} />
              </svg>
            </a>
            <button type="button" className="cart-nav-link" onClick={() => setCartOpen(true)}>
              <ShoppingCart className="h-4 w-4" /> Cart
            </button>
            <a href="/dashboard" target="_blank" rel="noopener noreferrer" className="dashboard-link">
              <ExternalLink className="h-4 w-4" /> Dashboard
            </a>
          </nav>
          <div className="flex items-center gap-2 lg:hidden">
            <CurrencySelector />
            <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 lg:hidden">
          <div className="ml-auto h-full w-80 border-l border-blue-500/15 bg-[#07111D] p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="font-bold">Menu</span>
              <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-6 grid gap-2">
              {nav.map(([href, label]) =>
                href.startsWith("http") ? (
                  <a key={href} href={href} className="mobile-link">
                    {label}
                  </a>
                ) : (
                  <Link key={href} href={href} className="mobile-link" onClick={() => setOpen(false)}>
                    {label === "Cart" ? `Cart (${cart.count})` : label}
                  </Link>
                )
              )}
              <a href="https://discord.gg/PKWwqG8uYB" className="mobile-link">
                Discord
              </a>
              <button type="button" className="mobile-link" onClick={() => { setOpen(false); setCartOpen(true); }}>
                Cart ({cart.count})
              </button>
              <a href="/dashboard" target="_blank" rel="noopener noreferrer" className="mobile-link" onClick={() => setOpen(false)}>
                Dashboard
              </a>
            </div>
          </div>
        </div>
      )}
      {cartOpen && <CartDrawer cart={cart} onClose={() => setCartOpen(false)} />}
      <main className="site-main">{children}</main>
      <Footer />
    </div>
  );
}

function CartDrawer({ cart, onClose }) {
  const hasItems = cart.items.length > 0;
  return (
    <div className="cart-drawer-layer" role="dialog" aria-modal="true" aria-label="Cart">
      <button className="cart-drawer-backdrop" type="button" onClick={onClose} aria-label="Close cart" />
      <aside className="cart-drawer">
        <div className="cart-drawer-head">
          <h2>Cart</h2>
          <button type="button" onClick={onClose} aria-label="Close cart">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="cart-drawer-body">
          {hasItems ? (
            <div className="cart-drawer-items">
              {cart.items.map((item) => (
                <div className="cart-drawer-item" key={item.productId}>
                  {item.image ? <img src={item.image} alt={item.name} /> : <span className="cart-drawer-img-fallback"><Package className="h-5 w-5" /></span>}
                  <div className="cart-drawer-info">
                    <strong>{item.name}</strong>
                    <span><Money value={item.price} /></span>
                    <div className="cart-drawer-qty">
                      <button type="button" onClick={() => cart.update(item.productId, item.quantity - 1)} aria-label={`Decrease ${item.name}`}>
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span>{item.quantity}</span>
                      <button type="button" onClick={() => cart.update(item.productId, item.quantity + 1)} aria-label={`Increase ${item.name}`}>
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <button className="cart-drawer-remove" type="button" onClick={() => cart.remove(item.productId)} aria-label={`Remove ${item.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="cart-drawer-empty">Your cart is empty.</p>
          )}
        </div>
        <div className="cart-drawer-footer">
          <div className="cart-drawer-row">
            <span>Items</span>
            <strong>{cart.count}</strong>
          </div>
          <div className="cart-drawer-row">
            <span>Total</span>
            <strong><Money value={cart.total} /></strong>
          </div>
          <Link href="/checkout" className={`cart-drawer-checkout${hasItems ? "" : " disabled"}`} onClick={onClose}>
            Checkout
          </Link>
          <button type="button" className="cart-drawer-clear" onClick={cart.clear} disabled={!hasItems}>
            Clear cart
          </button>
        </div>
      </aside>
    </div>
  );
}

function Router() {
  const { pathname } = useRouteContext();
  if (pathname === "/") return <HomePage />;
  if (pathname === "/products") return <ProductsPage />;
  if (pathname.startsWith("/products/")) return <ProductDetail slug={pathname.split("/").pop()} />;
  if (pathname === "/cart") return <CartPage />;
  if (pathname === "/checkout") return <CheckoutPage />;
  if (pathname.startsWith("/invoice/")) return <InvoicePage invoiceId={pathname.split("/").pop()} />;
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return <DashboardPage />;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return <AdminPage section={pathname.split("/")[2] || "overview"} />;
  if (pathname === "/terms") return <PolicyPage type="terms" />;
  if (pathname === "/privacy") return <PolicyPage type="privacy" />;
  if (pathname === "/support") return <SupportPage />;
  return <NotFound />;
}

function HomePage() {
  const [reviews, setReviews] = useState([]);
  useEffect(() => {
    api("/reviews")
      .then((rev) => setReviews(Array.isArray(rev) ? rev : []))
      .catch(() => {
        setReviews([]);
      });
  }, []);

  return (
    <main className="landing-page">
      <HeroSection />
      <MovingHighlights />
      <CategoriesSection />
      <MarketplaceStatsSection />
      <ReviewsSection reviews={reviews} />
      <FaqSection />
    </main>
  );
}

function HeroSection() {
  return (
    <section className="zy-hero">
      <div className="hero-bg-image" aria-hidden="true" />
      <div className="hero-bg-overlay" aria-hidden="true" />
      <div className="hero-orb-2" aria-hidden="true" />
      <div className="hero-particles" aria-hidden="true">
        <div className="hero-particle" />
        <div className="hero-particle" />
        <div className="hero-particle" />
        <div className="hero-particle" />
        <div className="hero-particle" />
        <div className="hero-particle" />
        <div className="hero-particle" />
        <div className="hero-particle" />
      </div>
      <div className="zy-hero-shell">
        <motion.div className="zy-hero-copy" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: "easeOut" }}>
          <div className="eyebrow-badge">
            <ShieldCheck className="h-4 w-4" /> Zyvory verified market
          </div>
          <h1>
            Digital products for gamers.
            <span>Instant delivery.</span>
          </h1>
          <p className="hero-lede">
            Accounts, keys, scripts, tools, boosts, and private links with verified stock, crypto checkout, and clean customer delivery logs.
          </p>
          <div className="hero-actions">
            <Link href="/products" className="primary-btn">
              <Package className="h-5 w-5" /> Browse Products
            </Link>
            <a href="https://discord.gg/Zhd6unzQGm" className="secondary-btn discord-hero-btn" aria-label="Join Discord">
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="currentColor">
                <path d={siDiscord.path} />
              </svg>
            </a>
          </div>
          <div className="hero-trust-row">
            <span><ShieldCheck className="h-4 w-4" /> Verified stock</span>
            <span><Zap className="h-4 w-4" /> Instant delivery</span>
            <span><Wallet className="h-4 w-4" /> LTC / BTC / SOL / ETH</span>
          </div>
          <div className="hero-glass-strip" aria-label="Marketplace highlights">
            <span><Package className="h-4 w-4" /> Accounts</span>
            <span><Code2 className="h-4 w-4" /> Scripts</span>
            <span><BadgeDollarSign className="h-4 w-4" /> From €0.99</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function StatsRow() {
  return (
    <section className="container-shell stats-row">
      <Metric value="4" label="Crypto rails" text="LTC, BTC, SOL, and ETH invoice flows." />
      <Metric value="15m" label="Invoice windows" text="Clean countdowns with status tracking." />
      <Metric value="24/7" label="Delivery logs" text="Keys, files, and private links stay visible." />
    </section>
  );
}

function TrustCards() {
  const cards = [
    { icon: ShieldCheck, title: "Guaranteed Quality", text: "Curated inventory with admin approval and stock controls." },
    { icon: Zap, title: "Instant Delivery", text: "Eligible keys and files unlock after payment confirmation." },
    { icon: Headphones, title: "Live Support", text: "Discord alerts and support routing keep orders moving." }
  ];
  return (
    <section className="container-shell trust-section">
      <div className="trust-grid">
        {cards.map((card) => (
          <FeatureCard key={card.title} {...card} />
        ))}
      </div>
    </section>
  );
}

function MovingHighlights() {
  const highlights = [
    { type: "metric", value: "4", label: "Crypto rails", text: "LTC, BTC, SOL, ETH invoice flows." },
    { type: "metric", value: "15m", label: "Invoice windows", text: "Clean countdown status tracking." },
    { type: "metric", value: "24/7", label: "Delivery logs", text: "Keys and files stay visible." },
    { type: "feature", icon: ShieldCheck, label: "Guaranteed Quality", text: "Curated stock controls." },
    { type: "feature", icon: Zap, label: "Instant Delivery", text: "Unlocks after confirmation." },
    { type: "feature", icon: Headphones, label: "Live Support", text: "Discord support routing." }
  ];

  return (
    <section className="moving-highlights" aria-label="Store highlights">
      <div className="moving-highlights-fade left" aria-hidden="true" />
      <div className="moving-highlights-fade right" aria-hidden="true" />
      <div className="moving-highlights-track">
        {[...highlights, ...highlights].map((item, index) => {
          const Icon = item.icon;
          return (
            <div className="moving-highlight-card" key={`${item.label}-${index}`} aria-hidden={index >= highlights.length ? "true" : undefined}>
              {item.type === "metric" ? (
                <strong>{item.value}</strong>
              ) : (
                <span className="moving-highlight-icon"><Icon className="h-4 w-4" /></span>
              )}
              <div>
                <p>{item.label}</p>
                <small>{item.text}</small>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CategoriesSection() {
  return (
    <section className="section-band landing-section">
      <div className="container-shell">
        <SectionHeading eyebrow="Browse" title="Product Categories" text="Find accounts, tools, games, methods, VPNs, scripts, maps, vehicles, and more." />
        <div className="zy-category-grid mt-8">
          {browseCategories.map((item) => {
            const Icon = item.icon || categoryIcons[item.category] || Boxes;
            const c = item.color || "#6366f1";
            return (
              <motion.div key={item.name} whileHover={{ y: -6, scale: 1.02 }} transition={{ duration: 0.22 }}>
                <Link href={`/products?filter=${encodeURIComponent(item.name)}`} className="zy-category-card" style={{"--cat-color": c}}>
                  <span className={item.brand ? "category-logo brand-logo" : "category-logo"} style={{color: c, filter: `drop-shadow(0 0 12px ${c}40)`}}>
                    {item.brand ? <BrandIcon icon={item.brand} /> : <Icon className="h-11 w-11" strokeWidth={2.15} />}
                  </span>
                  <span>{item.name}</span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function MarketplaceStatsSection() {
  return (
    <section className="marketplace-stats-section" aria-label="Marketplace statistics">
      <div className="marketplace-stats-bg" aria-hidden="true" />
      <div className="container-shell marketplace-stats-grid">
        {marketplaceStats.map((stat) => (
          <motion.div
            className="marketplace-stat"
            key={stat.label}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.45 }}
          >
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function ReviewsSection({ reviews }) {
  const liveReviews = reviews.map((review) => ({
    ...review,
    language: review.language || "BUYER",
    time: review.time || "recent"
  }));
  const displayReviews = [...liveReviews, ...buyerReviews].slice(0, 12);
  const reviewRows = [
    displayReviews.slice(0, 6),
    displayReviews.slice(4, 10),
    [...displayReviews.slice(8, 12), ...displayReviews.slice(0, 2)]
  ].filter((row) => row.length);

  return (
    <section id="reviews" className="section-band landing-section">
      <div className="container-shell reviews-heading-shell">
        <SectionHeading eyebrow="Customer Reviews" title="Hear from our buyers" text="Short buyer notes from different regions, products, and delivery types." />
      </div>
      {displayReviews.length ? (
        <div className="review-marquee-wall mt-8" aria-label="Customer review carousel">
          {reviewRows.map((row, rowIndex) => (
            <div className={`review-marquee-row row-${rowIndex + 1}`} key={`review-row-${rowIndex}`}>
              <div className="review-marquee-track">
                {[...row, ...row].map((review, index) => (
                  <motion.div className="review-card buyer-review-card premium-hover" key={`${review.id}-${rowIndex}-${index}`} whileHover={{ y: -5 }}>
                    <Stars rating={review.rating} />
                    <p className="review-copy">{review.text}</p>
                    <div className="review-footer">
                      <div>
                        <p>{review.name || "Verified buyer"}</p>
                        {review.productName && <small>{review.productName}</small>}
                      </div>
                      <div className="review-tags">
                        <span>{review.language}</span>
                        <span>{review.time}</span>
                      </div>
                    </div>
                    <span className="verified-pill review-verified">Verified purchase</span>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="container-shell">
          <div className="review-empty-state mt-8">
            <div className="empty-icon"><Star className="h-7 w-7" /></div>
            <h3>No public reviews yet</h3>
            <p>Verified purchase reviews will appear here after approval.</p>
          </div>
        </div>
      )}
    </section>
  );
}

function FeatureCard({ icon: Icon, title, text }) {
  return (
    <motion.div className="feature-card premium-hover" whileHover={{ y: -6 }} transition={{ duration: 0.18 }}>
      <span className="feature-icon"><Icon className="h-5 w-5" /></span>
      <h3>{title}</h3>
      <p>{text}</p>
    </motion.div>
  );
}

function BrandIcon({ icon }) {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label={icon.title} className="h-14 w-14" fill="currentColor">
      <path d={icon.path} />
    </svg>
  );
}

function Metric({ value, label, text }) {
  return (
    <div className="metric-card">
      <strong>{value}</strong>
      <span>{label}</span>
      {text && <p>{text}</p>}
    </div>
  );
}

function SectionHeading({ eyebrow, title, text }) {
  return (
    <div className="section-heading">
      <p>{eyebrow}</p>
      <div>
        <h2>{title}</h2>
        {text && <span>{text}</span>}
      </div>
    </div>
  );
}

function ProductCard({ product, onAdd }) {
  const inStock = product.stockCount > 0;
  const safeSlug = product.slug || encodeURIComponent(product.name || "product");
  return (
    <motion.article className="product-card landing-product-card premium-hover" whileHover={{ y: -7 }} transition={{ duration: 0.18 }}>
      <Link href={`/products/${safeSlug}`} className="block">
        <div className="product-image">
          {product.image ? <img src={product.image} alt={product.name} /> : <div className="product-image-placeholder"><Package className="h-10 w-10 text-slate-600" /></div>}
          <div className="product-image-overlay">
            <span>{product.badge || "Verified"}</span>
            <span className={`stock-badge ${inStock ? "in" : "out"}`}>{inStock ? "In stock" : "Sold out"}</span>
          </div>
        </div>
      </Link>
      <div className="product-content">
        <div className="product-meta-line">
          <span className="product-category">{product.category || "Digital"}</span>
          <Stars rating={product.rating || "4.8"} compact />
        </div>
        <h3>{product.name}</h3>
        <p>{product.description || "Verified digital product with protected checkout and dashboard delivery."}</p>
        <div className="product-buy-row">
          <strong className="text-blue-300"><Money value={product.price} /></strong>
          <span className="stock-count">{inStock ? `${product.stockCount} left` : "Restocking"}</span>
        </div>
        <div className="product-actions">
          <Link href={`/products/${safeSlug}`} className="small-btn">View Product</Link>
          <button className="small-btn accent" onClick={onAdd} disabled={!inStock}>
            <ShoppingCart className="h-4 w-4" /> Add
          </button>
        </div>
      </div>
    </motion.article>
  );
}

function Stars({ rating, compact = false }) {
  return (
    <span className="flex items-center gap-1 text-blue-300">
      <Star className="h-4 w-4 fill-current" />
      <span className={compact ? "text-xs" : "text-sm"}>{rating || "New"}</span>
    </span>
  );
}

function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [openCat, setOpenCat] = useState(null);
  const urlFilter = new URLSearchParams(window.location.search).get("filter") || "";
  const [activePill, setActivePill] = useState(urlFilter);
  const cart = useCart();

  useEffect(() => {
    api("/categories").then(setCategories);
    api("/products").then(setProducts);
  }, []);

  const grouped = {};
  products.forEach((p) => {
    const cat = p.category || "Uncategorized";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(p);
  });

  const catData = categories.map((c) => {
    const name = c.name || c;
    const items = grouped[name] || [];
    const prices = items.map((p) => Number(p.price));
    const totalStock = items.reduce((sum, p) => sum + (p.stockCount || 0), 0);
    return {
      ...c,
      name,
      image: c.image || null,
      items,
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0,
      totalStock,
    };
  });

  const filteredCats = activePill
    ? catData.filter((c) => c.tag === activePill || c.name === activePill)
    : search
      ? catData.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.items.some((p) => p.name.toLowerCase().includes(search.toLowerCase())))
      : catData;

  const modalProducts = openCat ? (grouped[openCat] || []) : [];

  // Build unique browse filter names from browseCategories
  const filterPills = browseCategories.map((bc) => bc.name);

  return (
    <div className="products-page">
      <section className="mx-auto max-w-7xl px-4 py-12" style={{position:'relative',zIndex:1}}>
      <div className="product-filter-panel">
        <div className="products-search-bar">
          <span>Keyword</span>
          <div className="search-input-wrap">
            <Search className="h-4 w-4 text-slate-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setActivePill(""); }} placeholder="Search products..." />
          </div>
        </div>
        <div className="category-pills-section">
          <span>Category</span>
          <div className="category-pills">
            <button className={`cat-pill ${activePill === "" ? "active" : ""}`} onClick={() => { setActivePill(""); setSearch(""); }}>All</button>
            {filterPills.map((name) => (
              <button key={name} className={`cat-pill ${activePill === name ? "active" : ""}`} onClick={() => { setActivePill(name); setSearch(""); }}>{name}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="product-grid mt-8">
        {filteredCats.map((c) => (
          <motion.article className="product-card premium-hover cursor-pointer" key={c.name} whileHover={{ y: -7 }} transition={{ duration: 0.18 }} onClick={() => setOpenCat(c.name)}>
            <div className="product-image">
              {c.image ? <img src={c.image} alt={c.name} /> : <div className="product-image-placeholder"><Package className="h-10 w-10 text-slate-600" /></div>}
            </div>
            <div className="product-content">
              <h3>{c.name}</h3>
              <div className="product-buy-row">
                <strong className="text-blue-300">
                  {c.minPrice === c.maxPrice ? <Money value={c.minPrice} /> : <><Money value={c.minPrice} /> – <Money value={c.maxPrice} /></>}
                </strong>
                <span className="stock-badge in">
                  {c.items.length} {c.items.length === 1 ? "product" : "products"}
                </span>
              </div>
            </div>
          </motion.article>
        ))}
        {filteredCats.length === 0 && (
          <div className="empty-state col-span-full">
            <Package className="h-8 w-8 text-blue-300" />
            <p>No categories found.</p>
          </div>
        )}
      </div>

      {openCat && (
        <div className="modal-overlay" onClick={() => setOpenCat(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{openCat}</h2>
              <button className="modal-close" onClick={() => setOpenCat(null)}><X className="h-5 w-5" /></button>
            </div>
            <div className="modal-products">
              {modalProducts.length === 0 && <p className="text-slate-400 text-center py-8">No products in this category yet.</p>}
              {modalProducts.map((product) => (
                <Link href={`/products/${product.slug}`} key={product.id} className="modal-product-card" onClick={() => setOpenCat(null)}>
                  <div className="modal-product-img">
                    {product.image ? <img src={product.image} alt={product.name} /> : <div className="product-image-placeholder"><Package className="h-8 w-8 text-slate-600" /></div>}
                  </div>
                  <h4>{product.name}</h4>
                  <div className="modal-product-meta">
                    <span className="text-blue-300 font-bold"><Money value={product.price} /></span>
                    <span className={`stock-badge ${product.stockCount > 0 ? "in" : "out"}`}>
                      {product.stockCount > 0 ? `${product.stockCount} in stock` : "Out of stock"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
    </div>
  );
}

function ProductDetail({ slug }) {
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const cart = useCart();
  const route = useRouteContext();
  const navigate = route.navigate;
  useEffect(() => {
    api(`/products/${slug}`).then(setProduct).catch(() => setProduct(false));
  }, [slug]);
  if (product === false) return <NotFound />;
  if (!product) return <Loading />;
  const inStock = product.stockCount > 0;
  const specs = [
    ["Product", product.category || product.name],
    ["Login", "Email & Password"],
    ["Access", "Full Access"],
    ["Delivery", "Instant Delivery"]
  ];
  const total = (product.price * qty).toFixed(2);
  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="detail-image">
            {product.image ? <img src={product.image} alt={product.name} /> : <div className="h-64 flex items-center justify-center bg-[var(--card)]"><Package className="h-16 w-16 text-slate-600" /></div>}
          </div>
          {product.image && (
            <div className="mt-4 grid grid-cols-4 gap-3">
              {[product.image].map((image, index) => (
                <img className="thumb" src={image} alt={`${product.name} ${index + 1}`} key={index} />
              ))}
            </div>
          )}
          <div className="product-rich-content mt-8">
            {product.shortDescription && <p className="text-lg leading-8 text-slate-300">{product.shortDescription}</p>}
            {product.description && (
              <div className="mt-6 text-slate-300 leading-7 whitespace-pre-line">{product.description}</div>
            )}
            {product.features?.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><Zap className="h-5 w-5 text-blue-300" /> Key Features</h3>
                <ul className="feature-list mt-3">
                  {product.features.map((f) => <li key={f}><CheckCircle2 className="h-4 w-4 text-blue-300 shrink-0" /><span>{f}</span></li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
        <div>
          <div className="flex flex-wrap gap-2">
            <span className="pill accent"><Rocket className="h-3.5 w-3.5" /> Instant Delivery</span>
          </div>
          <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl">{product.name}</h1>
          {specs.length > 0 && (
            <div className="specs-grid mt-5">
              {specs.map(([label, value]) => (
                <div className="spec-cell" key={label}>
                  <span className="spec-label">{label}</span>
                  <span className="spec-value">{value}</span>
                </div>
              ))}
            </div>
          )}
          <div className="purchase-box mt-6">
            <h3 className="text-lg font-bold text-white">Purchase</h3>
            <div className="purchase-product-row mt-3">
              <div>
                <strong className="text-white">{product.name}</strong>
                <span className="text-2xl font-black text-blue-300"><Money value={product.price} /></span>
              </div>
              <span className={`stock-badge ${inStock ? "in" : "out"}`}>{inStock ? `${product.stockCount} In Stock` : "Out of Stock"}</span>
            </div>
            <div className="qty-section mt-5">
              <span className="text-sm text-slate-400">Select Quantity</span>
              <div className="qty-control mt-1">
                <button onClick={() => setQty(Math.max(1, qty - 1))}><Minus className="h-4 w-4" /></button>
                <input type="number" min="1" max={product.stockCount || 1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} />
                <button onClick={() => setQty(qty + 1)}><Plus className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm text-slate-400">Total</span>
              <p className="text-3xl font-black text-white"><Money value={total} /></p>
            </div>
            <div className="purchase-actions mt-5">
              <button className="secondary-btn flex-1" onClick={() => { for (let i = 0; i < qty; i++) cart.add(product); }} disabled={!inStock}>
                <ShoppingCart className="h-5 w-5" /> Add to Cart
              </button>
              <button className="primary-btn flex-1" onClick={() => { for (let i = 0; i < qty; i++) cart.add(product); navigate("/cart"); }} disabled={!inStock}>
                Purchase
              </button>
            </div>
          </div>
        </div>
      </div>
      <section className="mt-16">
        <SectionHeading eyebrow="Reviews" title="Verified Feedback" />
        {product.reviews?.length ? (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {product.reviews.map((review) => (
              <div className="review-card" key={review.id}>
                <Stars rating={review.rating} />
                <p className="mt-3 text-slate-200">{review.text}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state mt-6">
            <Star className="h-8 w-8 text-blue-300" />
            <p>No approved purchase reviews yet.</p>
          </div>
        )}
      </section>
    </section>
  );
}

function InfoList({ title, items }) {
  return (
    <div className="info-panel">
      <h3>{title}</h3>
      <ul>
        {items?.map((item) => (
          <li key={item}>
            <CheckCircle2 className="h-4 w-4 text-blue-300" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CartPage() {
  const cart = useCart();
  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <SectionHeading eyebrow="Basket" title="Cart" />
      {cart.items.length ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-4">
            {cart.items.map((item) => (
              <div className="cart-row" key={item.productId}>
                <img src={item.image} alt={item.name} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white">{item.name}</p>
                  <p className="text-sm text-blue-300">{item.category}</p>
                  <p className="mt-1 text-slate-300"><Money value={item.price} /></p>
                </div>
                <div className="quantity">
                  <button onClick={() => cart.update(item.productId, item.quantity - 1)} aria-label="Decrease quantity">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span>{item.quantity}</span>
                  <button onClick={() => cart.update(item.productId, item.quantity + 1)} aria-label="Increase quantity">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <button className="icon-btn" onClick={() => cart.remove(item.productId)} aria-label={`Remove ${item.name}`}>
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
          <aside className="summary-panel">
            <p className="text-sm text-slate-400">Total</p>
            <p className="mt-2 text-4xl font-black text-white"><Money value={cart.total} /></p>
            <Link href="/checkout" className="primary-btn mt-6 w-full justify-center">
              Checkout
            </Link>
            <button className="secondary-btn mt-3 w-full justify-center" onClick={cart.clear}>
              Clear Cart
            </button>
          </aside>
        </div>
      ) : (
        <div className="empty-state mt-8">
          <ShoppingCart className="h-8 w-8 text-blue-300" />
          <p>Your cart is empty.</p>
          <Link href="/products" className="primary-btn mt-4">
            Browse Products
          </Link>
        </div>
      )}
    </section>
  );
}

function StepTabs({ step }) {
  const tabs = ["Order Information", "Confirm & Pay", "Receive Your Items"];
  return (
    <div className="step-tabs">
      {tabs.map((label, i) => (
        <div key={label} className={`step-tab ${i <= step ? "active" : ""} ${i === step ? "current" : ""}`}>
          <span>{label}</span>
          {i < step && <CheckCircle2 className="h-4 w-4" />}
        </div>
      ))}
    </div>
  );
}

const paymentMethods = [
  { value: "LTC", label: "Litecoin", sub: "via Litecoin Network", color: "#345D9D", icon: "Ł" },
  { value: "BTC", label: "Bitcoin", sub: "via Bitcoin Network", color: "#F7931A", icon: "₿", tag: "+5%" },
  { value: "SOL", label: "Solana", sub: "via Solana Network", color: "#9945FF", icon: "◎" },
  { value: "ETH", label: "Ethereum", sub: "via Ethereum Network", color: "#627EEA", icon: "Ξ" },
  { value: "BALANCE", label: "Customer Balance", sub: "Click to authenticate", color: "#334155", icon: "◉" },
  { value: "PAYPAL_FF", label: "PayPal (Friends & Family)", sub: "via PayPal", color: "#003087", icon: "P" }
];

function CheckoutPage() {
  const cart = useCart();
  const route = useRouteContext();
  const [form, setForm] = useState({ email: "", discord: "", couponCode: "", paymentMethod: "LTC", agreedToTerms: false, newsletter: false });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [discordLink, setDiscordLink] = useState("");
  useEffect(() => {
    api("/settings/public").then((s) => setDiscordLink(s.discordInvite || "")).catch(() => {});
  }, []);
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const invoice = await api("/invoices", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          items: cart.items.map((item) => ({ productId: item.productId, quantity: item.quantity }))
        })
      });
      cart.clear();
      route.navigate(`/invoice/${invoice.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  if (!cart.items.length) return <CartPage />;
  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <StepTabs step={0} />
      <form className="mt-8 grid gap-6 lg:grid-cols-[340px_1fr]" onSubmit={submit}>
        <aside className="co-sidebar">
          <div className="co-sidebar-head">
            <div className="co-logo-row"><Zap className="h-5 w-5 text-blue-300" /><span className="font-bold text-white">Zyvory</span></div>
          </div>
          <p className="co-pay-label">PAY Zyvory</p>
          <p className="co-total"><Money value={cart.total} /></p>
          <div className="co-items">
            {cart.items.map((item) => (
              <div className="co-item" key={item.productId}>
                {item.image && <img src={item.image} alt={item.name} className="co-item-img" />}
                <div className="co-item-info">
                  <p className="co-item-name">{item.name} <span className="co-item-qty">x{item.quantity}</span></p>
                </div>
                <span className="co-item-price"><Money value={item.price * item.quantity} /></span>
              </div>
            ))}
          </div>
          <div className="co-subtotals">
            <div className="co-row"><span>Subtotal</span><span><Money value={cart.total} /></span></div>
            <div className="co-row co-row-total"><span>Total</span><span><Money value={cart.total} /></span></div>
          </div>
          <div className="co-support">
            <p className="co-support-title">Having issues with your order?</p>
            <p className="co-support-text">You can Open a Ticket on your Customer Dashboard to receive assistance from our support team.</p>
            {discordLink && (
              <a href={discordLink} target="_blank" rel="noopener noreferrer" className="co-support-link">
                Open a Support Ticket <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </aside>
        <div className="co-form-area">
          <div className="co-section">
            <p className="co-section-label">CONTACT & DELIVERY</p>
            <label className="co-field">
              <input required type="text" inputMode="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="E-mail Address *" />
            </label>
            <label className="co-field mt-3">
              <input value={form.discord} onChange={(e) => setForm({ ...form, discord: e.target.value })} placeholder="Discord username or ID" />
            </label>
          </div>
          <div className="co-section">
            <p className="co-section-label">DISCOUNT</p>
            <div className="co-coupon-row">
              <input value={form.couponCode} onChange={(e) => setForm({ ...form, couponCode: e.target.value })} placeholder="Coupon Code" className="co-coupon-input" />
              <button type="button" className="co-coupon-btn">Apply <span className="co-arrow">→</span></button>
            </div>
          </div>
          <div className="co-section">
            <div className="co-payment-head">
              <p className="co-section-label">PAYMENT</p>
              <p className="co-secure-note"><Lock className="h-3.5 w-3.5" /> All transactions are secure and encrypted.</p>
            </div>
            <div className="co-payment-grid">
              {paymentMethods.map((pm) => (
                <label key={pm.value} className={`co-pay-option ${form.paymentMethod === pm.value ? "active" : ""}`} onClick={() => setForm({ ...form, paymentMethod: pm.value })}>
                  <input type="radio" name="paymentMethod" checked={form.paymentMethod === pm.value} onChange={() => {}} className="hidden" />
                  <span className="co-pay-icon" style={{ background: pm.color }}>{pm.icon}</span>
                  <div className="co-pay-text">
                    <span className="co-pay-name">{pm.label}</span>
                    <span className="co-pay-sub">{pm.sub}</span>
                  </div>
                  {pm.tag && <span className="co-pay-tag">{pm.tag}</span>}
                  {form.paymentMethod === pm.value && <span className="co-pay-check"><CheckCircle2 className="h-4 w-4" /></span>}
                </label>
              ))}
            </div>
          </div>
          <label className="co-check">
            <input required type="checkbox" checked={form.agreedToTerms} onChange={(e) => setForm({ ...form, agreedToTerms: e.target.checked })} />
            <span>I have read and agree to Zyvory's Terms of Service.</span>
          </label>
          <label className="co-check">
            <input type="checkbox" checked={form.newsletter} onChange={(e) => setForm({ ...form, newsletter: e.target.checked })} />
            <span>I would like to receive updates and promotions from Zyvory.</span>
          </label>
          {error && <div className="error-box mt-2">{error}</div>}
          <button className="co-proceed-btn" disabled={loading}>
            {loading ? "Processing..." : "Proceed to Payment"} <span className="co-arrow">→</span>
          </button>
        </div>
      </form>
    </section>
  );
}

async function downloadInvoicePdf(invoice) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  let y = 20;
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Zyvory", 14, y);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Digital Market", 14, y + 6);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", w - 14, y, { align: "right" });
  y += 20;
  doc.setDrawColor(200);
  doc.line(14, y, w - 14, y);
  y += 10;
  const rows = [
    ["Invoice ID", invoice.id],
    ["Status", invoice.status.toUpperCase()],
    ["E-mail", invoice.customerEmail],
    ["Payment Method", invoice.selectedCoin || "N/A"],
    ["Total (EUR)", `€${Number(invoice.totalUsd).toFixed(2)}`],
  ];
  if (invoice.expectedCryptoAmount) rows.push(["Crypto Amount", `${invoice.expectedCryptoAmount} ${invoice.selectedCoin}`]);
  if (invoice.depositAddress) rows.push(["Deposit Address", invoice.depositAddress]);
  if (invoice.discord) rows.push(["Discord", invoice.discord]);
  rows.push(["Created", new Date(invoice.createdAt).toLocaleString()]);
  doc.setFontSize(10);
  for (const [label, val] of rows) {
    doc.setFont("helvetica", "bold");
    doc.text(label + ":", 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(val), 60, y);
    y += 7;
  }
  y += 5;
  doc.line(14, y, w - 14, y);
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.text("ITEMS", 14, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  const items = typeof invoice.items === "string" ? JSON.parse(invoice.items) : invoice.items;
  for (const item of items) {
    doc.text(`${item.name}  x${item.quantity}`, 14, y);
    doc.text(`€${Number(item.lineTotal || item.price * item.quantity).toFixed(2)}`, w - 14, y, { align: "right" });
    y += 6;
  }
  y += 5;
  doc.line(14, y, w - 14, y);
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`TOTAL: €${Number(invoice.totalUsd).toFixed(2)}`, w - 14, y, { align: "right" });
  y += 15;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text("Thank you for your purchase. For support, open a ticket on our Discord server.", 14, y);
  doc.save(`Zyvory-Invoice-${invoice.id}.pdf`);
}

function InvoicePage({ invoiceId }) {
  const [invoice, setInvoice] = useState(null);
  const [discordLink, setDiscordLink] = useState("");
  const [prices, setPrices] = useState(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState("");
  useEffect(() => {
    api(`/invoices/${invoiceId}`).then(setInvoice).catch((err) => setError(err.message));
    api("/settings/public").then((s) => setDiscordLink(s.discordInvite || "")).catch(() => {});
    api("/prices").then(setPrices).catch(() => {});
    const tick = setInterval(() => setNow(Date.now()), 1000);
    // Poll invoice status every 10s for auto-detection
    const poll = setInterval(() => {
      api(`/invoices/${invoiceId}`).then((inv) => { if (inv) setInvoice(inv); }).catch(() => {});
    }, 10_000);
    return () => { clearInterval(tick); clearInterval(poll); };
  }, [invoiceId]);
  if (error) return <ErrorMessage message={error} />;
  if (!invoice) return <Loading />;
  const seconds = Math.max(0, Math.floor((new Date(invoice.expiresAt).getTime() - now) / 1000));
  const expired = invoice.status === "expired" || seconds <= 0;
  const paid = invoice.status === "paid";
  const coinLabel = paymentMethods.find((p) => p.value === invoice.selectedCoin)?.label || invoice.selectedCoin;
  const coinIcon = paymentMethods.find((p) => p.value === invoice.selectedCoin)?.icon || "";
  const coinColor = paymentMethods.find((p) => p.value === invoice.selectedCoin)?.color || "#345D9D";
  const detected = !paid && invoice.transactionId && invoice.status === "pending";
  const requiredConfs = { BTC: 2, LTC: 2, ETH: 12, SOL: 1 }[invoice.selectedCoin] || 2;
  const shortAddr = invoice.depositAddress ? `${invoice.depositAddress.slice(0, 8)}...${invoice.depositAddress.slice(-6)}` : "";
  const copyText = (text, label) => { navigator.clipboard.writeText(text); setCopied(label); setTimeout(() => setCopied(""), 2000); };
  const createdAgo = () => { const diff = Math.floor((now - new Date(invoice.createdAt).getTime()) / 1000); return diff < 60 ? `${diff} seconds ago` : `${Math.floor(diff / 60)} minutes ago`; };
  const expiresIn = () => { if (expired) return "Expired"; const m = Math.floor(seconds / 60); return m > 60 ? `in ${Math.floor(m / 60)} hours` : `in ${m} minutes`; };

  return (
    <section className="mx-auto max-w-4xl px-4 py-8">
      <StepTabs step={paid ? 2 : 1} />
      {paid && (
        <div className="inv-paid-banner">
          <CheckCircle2 className="h-12 w-12 text-green-400" />
          <h2>Payment Confirmed!</h2>
          <p style={{marginBottom:"0.75rem"}}>Your payment has been verified. Please open a support ticket to receive your order.</p>
          <div style={{background:"rgba(37,99,235,0.08)",border:"1px solid rgba(37,99,235,0.25)",borderRadius:"12px",padding:"1.25rem",textAlign:"left",maxWidth:"440px",margin:"0 auto 1rem"}}>
            <p style={{margin:"0 0 0.5rem",fontSize:"0.8rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",color:"#8b949e"}}>Include in your ticket</p>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.4rem 0",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
              <span style={{color:"#8b949e",fontSize:"0.85rem"}}>Order ID</span>
              <span style={{color:"#f0f6ff",fontWeight:600,fontSize:"0.85rem",fontFamily:"monospace"}}>{invoice.orderId || invoice.id}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.4rem 0"}}>
              <span style={{color:"#8b949e",fontSize:"0.85rem"}}>Email</span>
              <span style={{color:"#f0f6ff",fontWeight:600,fontSize:"0.85rem"}}>{invoice.customerEmail}</span>
            </div>
          </div>
          <p style={{color:"#22c55e",fontWeight:600,fontSize:"0.9rem",margin:"0 0 1rem"}}>⚡ You will receive your order within 10 minutes max</p>
          {discordLink && (
            <a href={discordLink} target="_blank" rel="noopener noreferrer" className="co-proceed-btn" style={{maxWidth:"340px",margin:"0 auto 0.75rem",display:"flex",alignItems:"center",justifyContent:"center",gap:"0.5rem"}}>
              <MessageCircle className="h-5 w-5" /> Open a Ticket on Discord
            </a>
          )}
          <Link href={`/dashboard?email=${encodeURIComponent(invoice.customerEmail)}`} className="co-proceed-btn" style={{maxWidth:"340px",margin:"0 auto",background:"transparent",border:"1px solid rgba(255,255,255,0.12)"}}>
            Open Dashboard <span className="co-arrow">→</span>
          </Link>
        </div>
      )}
      {expired && !paid && (
        <div className="inv-expired-banner">
          <AlertTriangle className="h-12 w-12 text-red-400" />
          <h2>Invoice Expired</h2>
          <p>This invoice has expired. Please create a new order.</p>
          <Link href="/products" className="co-proceed-btn" style={{maxWidth:"320px",margin:"1rem auto 0"}}>
            Browse Products <span className="co-arrow">→</span>
          </Link>
        </div>
      )}
      {!paid && !expired && invoice.depositAddress && (
        <div className="inv-pay-card">
          <div className="inv-pay-header">
            <div className="inv-pay-coin">
              <span className="co-pay-icon" style={{ background: coinColor }}>{coinIcon}</span>
              <div>
                <p className="inv-pay-coin-label">{invoice.selectedCoin} Payment</p>
                <p className="inv-pay-coin-addr">{shortAddr}</p>
              </div>
            </div>
            <p className="inv-pay-amount-top">{invoice.expectedCryptoAmount} {invoice.selectedCoin}</p>
          </div>
          {invoice.qrCode && (
            <div className="inv-qr-wrap">
              <img src={invoice.qrCode} alt="Payment QR code" className="inv-qr" />
            </div>
          )}
          <div className="inv-addr-row">
            <span className="inv-addr-label">Address:</span>
            <span className="inv-addr-value">{invoice.depositAddress}</span>
            <button className="inv-copy-btn" onClick={() => copyText(invoice.depositAddress, "addr")} title="Copy address">
              {copied === "addr" ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          {invoice.qrCodeData && (
            <a href={invoice.qrCodeData} className="inv-open-wallet-btn">
              Open Wallet <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <div className="inv-exact-amount">
            <p className="inv-exact-label">SEND EXACT AMOUNT</p>
            <div className="inv-exact-row">
              <span className="inv-exact-value">{invoice.expectedCryptoAmount} {invoice.selectedCoin}</span>
              <button className="inv-copy-btn" onClick={() => copyText(String(invoice.expectedCryptoAmount), "amount")} title="Copy amount">
                {copied === "amount" ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="inv-how-to-pay">
            <p className="inv-how-label">HOW TO PAY</p>
            <div className="inv-step"><span className="inv-step-num">1</span><span>Send {invoice.expectedCryptoAmount} {invoice.selectedCoin} to the address above</span></div>
            <div className="inv-step"><span className="inv-step-num">2</span><span>Payment will be detected automatically after network confirmation</span></div>
            <div className="inv-step"><span className="inv-step-num">3</span><span>Send only {invoice.selectedCoin} to this address. Other cryptocurrencies will be lost.</span></div>
          </div>
          {detected ? (
            <div className="inv-waiting" style={{borderColor:"rgba(34,197,94,0.3)",background:"rgba(34,197,94,0.08)"}}>
              <span className="inv-waiting-dot" style={{background:"#22c55e"}}></span>
              Payment detected! Waiting for confirmations ({invoice.confirmationCount || 0}/{requiredConfs})
            </div>
          ) : (
            <div className="inv-waiting">
              <span className="inv-waiting-dot"></span>
              Waiting for payment. This page updates automatically.
            </div>
          )}
        </div>
      )}
      {paid && (
        <>
          <div className="inv-info-table">
            <p className="inv-info-title">ORDER INFORMATION</p>
            <div className="inv-info-row"><span>Invoice ID</span><span className="inv-info-val">{invoice.id} <button className="inv-copy-btn" onClick={() => copyText(invoice.id, "id")}>{copied === "id" ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}</button></span></div>
            <div className="inv-info-row"><span>Payment Method</span><span className="inv-info-val">{coinLabel} <span className="co-pay-icon" style={{ background: coinColor, width: "22px", height: "22px", fontSize: "11px" }}>{coinIcon}</span></span></div>
            <div className="inv-info-row"><span>E-mail Address</span><span className="inv-info-val">{invoice.customerEmail}</span></div>
            {invoice.discord && <div className="inv-info-row"><span>Discord</span><span className="inv-info-val">{invoice.discord}</span></div>}
            <div className="inv-info-row"><span>Total Price</span><span className="inv-info-val">{money(invoice.totalUsd)}</span></div>
            {invoice.expectedCryptoAmount && <div className="inv-info-row"><span>Total Amount ({invoice.selectedCoin})</span><span className="inv-info-val">{invoice.expectedCryptoAmount} {invoice.selectedCoin}</span></div>}
            {invoice.transactionId && <div className="inv-info-row"><span>Transaction ID</span><span className="inv-info-val" style={{fontSize:"0.75rem",wordBreak:"break-all"}}>{invoice.transactionId}</span></div>}
            {invoice.confirmationCount > 0 && <div className="inv-info-row"><span>Confirmations</span><span className="inv-info-val">{invoice.confirmationCount}</span></div>}
            <div className="inv-info-row"><span>Created</span><span className="inv-info-val">{createdAgo()}</span></div>
          </div>
          {prices && prices.fiatRates && (
            <div className="inv-info-table" style={{marginTop:"1rem"}}>
              <p className="inv-info-title">PRICE IN OTHER CURRENCIES</p>
              {Object.entries({
                USD: prices.fiatRates.eurTousd,
                USDT: prices.fiatRates.eurTousdt,
                GBP: prices.fiatRates.eurTogbp,
                TRY: prices.fiatRates.eurTotry,
                CNY: prices.fiatRates.eurTocny
              }).filter(([,r]) => r).map(([fiat, rate]) => (
                <div className="inv-info-row" key={fiat}>
                  <span>{fiat}</span>
                  <span className="inv-info-val">{(invoice.totalUsd * rate).toFixed(2)} {fiat}</span>
                </div>
              ))}
            </div>
          )}
          <button className="inv-discord-btn" style={{marginTop:"1rem", borderColor:"rgba(125,249,255,0.3)", background:"rgba(125,249,255,0.08)", color:"var(--cyan)"}} onClick={() => downloadInvoicePdf(invoice)}>
            <Download className="h-5 w-5" /> Download PDF Invoice
          </button>
        </>
      )}
    </section>
  );
}

function DataTile({ label, value }) {
  return (
    <div className="data-tile">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="copy-field">
      <span>{label}</span>
      <div>
        <code>{value}</code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
          aria-label={`Copy ${label}`}
        >
          {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function DashboardPage() {
  const route = useRouteContext();
  const LOGO = "https://res.cloudinary.com/db4mpxc2k/image/upload/v1778619521/Zyvolalogo_yecrow.png";
  const [step, setStep] = useState("email"); // email | code | dashboard
  const [email, setEmail] = useState(new URLSearchParams(route.search).get("email") || "");
  const [code, setCode] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("home");
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const sendCode = async (e) => {
    e?.preventDefault();
    if (!email.trim()) { setError("Enter your email address."); return; }
    setError(""); setLoading(true);
    try {
      await api("/dashboard/send-code", { method: "POST", body: JSON.stringify({ email }) });
      setStep("code"); setResendTimer(60);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const verifyCode = async (e) => {
    e?.preventDefault();
    if (!code.trim()) { setError("Enter the 6-digit code."); return; }
    setError(""); setLoading(true);
    try {
      const result = await api("/dashboard/verify-code", { method: "POST", body: JSON.stringify({ email, code }) });
      setData(result); setStep("dashboard");
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const logout = () => { setData(null); setStep("email"); setCode(""); setError(""); };

  const greetName = (data?.customer?.email || email || "").split("@")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  // Dashboard stats
  const paidOrders = (data?.orders || []).filter(o => o.status === "completed");
  const totalOrders = (data?.invoices || []).length;
  const paidCount = paidOrders.length;
  const balance = data?.customer?.balance || 0;
  const reviewCount = data?.reviewCount || 0;
  const recentOrders = paidOrders.slice(-5).reverse();

  // Downloads: extract delivered items from orders
  const downloads = paidOrders.flatMap(order => {
    const items = typeof order.deliveryItems === "string" ? JSON.parse(order.deliveryItems) : (order.deliveryItems || []);
    return items.map(item => ({ ...item, orderId: order.id, orderDate: order.createdAt }));
  });

  if (step !== "dashboard") {
    return (
      <section className="cd-auth-page">
        <div className="cd-auth-topbar">
          <Link href="/" className="cd-back-link"><span>←</span> Back to store</Link>
          <div className="cd-lang-wrap">
            <span className="cd-lang-flag">🇬🇧</span>
            <select className="cd-lang-select" defaultValue="English"><option>English</option></select>
          </div>
        </div>
        <div className="cd-auth-center">
          <img className="cd-auth-logo" src={LOGO} alt="Zyvora" />
          {step === "email" ? (
            <form className="cd-auth-card" onSubmit={sendCode}>
              <h1>Welcome back</h1>
              <p>Enter your email to receive a verification code and access your dashboard.</p>
              <label>
                <span>Email address <b>*</b></span>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com" />
              </label>
              {error && <div className="cd-auth-error"><AlertTriangle className="h-4 w-4" /> {error}</div>}
              <button type="submit" disabled={loading}>{loading ? "Sending..." : "Send Code"} <span>›</span></button>
            </form>
          ) : (
            <form className="cd-auth-card" onSubmit={verifyCode}>
              <h1>Check your email</h1>
              <p>We sent a 6-digit code to <strong>{email}</strong></p>
              <label>
                <span>Verification code <b>*</b></span>
                <input required type="text" inputMode="numeric" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" className="cd-code-input" autoFocus />
              </label>
              {error && <div className="cd-auth-error"><AlertTriangle className="h-4 w-4" /> {error}</div>}
              <button type="submit" disabled={loading}>{loading ? "Verifying..." : "Verify & Login"} <span>›</span></button>
              <div className="cd-auth-actions">
                <button type="button" className="cd-text-btn" onClick={() => { setStep("email"); setCode(""); setError(""); }}>← Change email</button>
                <button type="button" className="cd-text-btn" disabled={resendTimer > 0} onClick={sendCode}>{resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend code"}</button>
              </div>
            </form>
          )}
          <p className="cd-auth-footer">© {new Date().getFullYear()} Zyvora. All rights reserved.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="cd-shell">
      {/* Top nav bar */}
      <header className="cd-topbar">
        <div className="cd-topbar-inner">
          <Link href="/" className="cd-brand">
            <img src={LOGO} alt="Zyvora" className="cd-brand-logo" />
            <span className="cd-brand-name">Zyvora</span>
          </Link>
          <div className="cd-topbar-search">
            <Search className="h-4 w-4" />
            <input placeholder="Search for orders, tickets, products..." readOnly />
          </div>
          <div className="cd-topbar-right">
            <div className="cd-lang-wrap">
              <span className="cd-lang-flag">🇬🇧</span>
              <select className="cd-lang-select" defaultValue="English"><option>English</option></select>
            </div>
            <div className="cd-user-pill">
              <span className="cd-user-avatar">{greetName.slice(0, 2).toUpperCase()}</span>
              <span className="cd-user-name">{greetName}</span>
            </div>
            <button type="button" className="cd-logout-btn" onClick={logout}>Logout</button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="cd-tabs">
        <div className="cd-tabs-inner">
          {[["home", "Home", LayoutDashboard], ["orders", "Orders", Package], ["downloads", "Downloads", Download], ["support", "Support", MessageCircle]].map(([key, label, Icon]) => (
            <button key={key} className={`cd-tab ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <main className="cd-main">
        <div className="cd-container">
          {tab === "home" && (
            <>
              <div className="cd-welcome">
                <h1>{greeting}, <span>{greetName}</span></h1>
                <p>Here's a summary of your account and recent activity.</p>
              </div>
              <div className="cd-stat-grid">
                <div className="cd-stat-card">
                  <div className="cd-stat-head"><span>Total Orders</span><Package className="h-5 w-5 text-blue-400" /></div>
                  <p className="cd-stat-sub">All time orders</p>
                  <span className="cd-stat-value">{totalOrders}</span>
                </div>
                <div className="cd-stat-card cd-stat-wide">
                  <div className="cd-stat-head"><span>Balance</span><Wallet className="h-5 w-5 text-green-400" /></div>
                  <p className="cd-stat-sub">Your current account balance and transaction history</p>
                  <div className="cd-balance-row">
                    <div>
                      <span className="cd-balance-amount">{money(balance)}</span>
                      <span className="cd-balance-label">Current Balance</span>
                    </div>
                    <div>
                      <span className="cd-stat-value">{paidCount}</span>
                      <span className="cd-balance-label">Paid Orders</span>
                    </div>
                  </div>
                </div>
                <div className="cd-stat-card">
                  <div className="cd-stat-head"><span>Total Reviews</span><Star className="h-5 w-5 text-yellow-400" /></div>
                  <p className="cd-stat-sub">Reviews given</p>
                  <span className="cd-stat-value">{reviewCount}</span>
                </div>
              </div>
              <div className="cd-section">
                <div className="cd-section-head">
                  <h2>Recent Orders</h2>
                  <p>Your last {recentOrders.length} most recent orders</p>
                </div>
                {recentOrders.length > 0 ? (
                  <div className="cd-orders-table">
                    <div className="cd-table-header">
                      <span>ORDER</span><span>DATE</span><span>AMOUNT</span><span>STATUS</span><span></span>
                    </div>
                    {recentOrders.map(order => {
                      const inv = (data.invoices || []).find(i => i.id === order.invoiceId);
                      const items = typeof order.items === "string" ? JSON.parse(order.items) : (order.items || []);
                      const date = new Date(order.createdAt);
                      return (
                        <div className="cd-table-row" key={order.id}>
                          <div className="cd-order-id-cell">
                            <CheckCircle2 className="h-5 w-5 text-green-400" />
                            <div>
                              <span className="cd-order-id">{order.id}</span>
                              <span className="cd-order-sub">Order ID</span>
                            </div>
                          </div>
                          <span className="cd-order-date">{date.toLocaleDateString("en-GB")}<br/><small>{date.toLocaleTimeString("en-GB", {hour:"2-digit",minute:"2-digit"})}</small></span>
                          <span className="cd-order-amount">{money(inv?.totalUsd || order.totalUsd)}</span>
                          <span className={`cd-status ${order.status === "completed" ? "delivered" : order.status === "cancelled" ? "cancelled" : ""}`}>
                            <CheckCircle2 className="h-3.5 w-3.5" /> {order.status === "completed" ? "Delivered" : order.status}
                          </span>
                          <button className="cd-view-btn" onClick={() => { setTab("orders"); }}>View</button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="cd-empty">
                    <Package className="h-10 w-10 text-slate-500" />
                    <h3>No orders yet</h3>
                    <p>Your completed orders will appear here.</p>
                  </div>
                )}
              </div>
            </>
          )}

          {tab === "orders" && (
            <>
              <div className="cd-welcome">
                <h1>Orders</h1>
                <p>View and manage your order history.</p>
              </div>
              {paidOrders.length > 0 ? (
                <div className="cd-orders-table">
                  <div className="cd-table-header">
                    <span>ORDER</span><span>PRODUCTS</span><span>DATE</span><span>AMOUNT</span><span>STATUS</span>
                  </div>
                  {[...paidOrders].reverse().map(order => {
                    const inv = (data.invoices || []).find(i => i.id === order.invoiceId);
                    const items = typeof order.items === "string" ? JSON.parse(order.items) : (order.items || []);
                    const deliveryItems = typeof order.deliveryItems === "string" ? JSON.parse(order.deliveryItems) : (order.deliveryItems || []);
                    const date = new Date(order.createdAt);
                    const daysAgo = Math.floor((Date.now() - date.getTime()) / 86400000);
                    const agoText = daysAgo === 0 ? "today" : daysAgo === 1 ? "1d ago" : `${daysAgo}d ago`;
                    return (
                      <div className="cd-table-row" key={order.id}>
                        <div className="cd-order-id-cell">
                          <CheckCircle2 className="h-5 w-5 text-green-400" />
                          <div>
                            <span className="cd-order-id">{order.id}</span>
                            <span className="cd-order-sub">{agoText}</span>
                          </div>
                        </div>
                        <div className="cd-order-products">
                          <span className="cd-product-name">{items.map(i => i.name).join(", ")}</span>
                          <span className="cd-product-detail">{items.map(i => `${i.name} × ${i.quantity}`).join(", ")}</span>
                        </div>
                        <span className="cd-order-date">{date.toLocaleDateString("en-GB")}<br/><small>{date.toLocaleTimeString("en-GB", {hour:"2-digit",minute:"2-digit"})}</small></span>
                        <span className="cd-order-amount">{money(inv?.totalUsd || order.totalUsd)}</span>
                        <span className={`cd-status ${order.status === "completed" ? "delivered" : order.status === "cancelled" ? "cancelled" : ""}`}>
                          <CheckCircle2 className="h-3.5 w-3.5" /> {order.status === "completed" ? "Delivered" : order.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="cd-empty">
                  <Package className="h-10 w-10 text-slate-500" />
                  <h3>No orders found</h3>
                  <p>You haven't made any purchases yet.</p>
                </div>
              )}
            </>
          )}

          {tab === "downloads" && (
            <>
              <div className="cd-welcome">
                <h1>Download Center</h1>
                <p>Access all your purchased files and digital content in one place.</p>
              </div>
              {downloads.length > 0 ? (
                <div className="cd-downloads-grid">
                  {downloads.map((item, idx) => (
                    <div className="cd-download-card" key={`${item.productId}-${idx}`}>
                      <div className="cd-download-icon"><Download className="h-5 w-5 text-blue-400" /></div>
                      <div className="cd-download-info">
                        <strong>{item.name}</strong>
                        <span className="cd-download-order">Order: {item.orderId}</span>
                        {item.delivered?.map((val, i) => (
                          <code className="cd-download-value" key={i}>{val}</code>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="cd-empty">
                  <Download className="h-10 w-10 text-slate-500" />
                  <h3>No downloads available</h3>
                  <p>You don't have any downloadable files yet. Files from your purchases will appear here.</p>
                </div>
              )}
            </>
          )}

          {tab === "support" && (
            <>
              <div className="cd-welcome" style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"1rem"}}>
                <div>
                  <h1>Support Tickets</h1>
                  <p>Manage your support tickets and get help from our team</p>
                </div>
                <a href="https://discord.gg/PKWwqG8uYB" target="_blank" rel="noopener noreferrer" className="cd-create-ticket-btn">
                  <Plus className="h-4 w-4" /> Create ticket
                </a>
              </div>
              <div className="cd-empty">
                <MessageCircle className="h-10 w-10 text-slate-500" />
                <h3>No support tickets</h3>
                <p>You haven't created any support tickets yet.</p>
                <a href="https://discord.gg/PKWwqG8uYB" target="_blank" rel="noopener noreferrer" className="cd-create-ticket-btn" style={{marginTop:"1rem"}}>
                  <Plus className="h-4 w-4" /> Create ticket
                </a>
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="cd-footer">
        <p>© {new Date().getFullYear()} Zyvora. All rights reserved.</p>
      </footer>
    </section>
  );
}

const adminNavItems = [
  ["overview", "Overview", LayoutDashboard],
  ["products", "Products", Package],
  ["categories", "Categories", Boxes],
  ["orders", "Orders", ShoppingCart],
  ["invoices", "Invoices", Wallet],
  ["customers", "Customers", UserCircle],
  ["coupons", "Coupons", BadgeDollarSign],
  ["reviews", "Reviews", Star],
  ["settings", "Settings", Settings]
];


function AdminPage({ section }) {
  const [token, setToken] = useState(localStorage.getItem(ADMIN_TOKEN_KEY) || "");
  const [login, setLogin] = useState({ email: "crownshoptn@gmail.com", password: "" });
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const signIn = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const result = await api("/admin/login", { method: "POST", body: JSON.stringify(login) });
      localStorage.setItem(ADMIN_TOKEN_KEY, result.token);
      setToken(result.token);
    } catch (err) {
      setError(err.message);
    }
  };
  useEffect(() => {
    if (!token) return;
    setData(null);
    const path =
      section === "products" || section === "categories"
        ? "/admin/catalog"
        : section === "orders"
          ? "/admin/orders"
          : section === "invoices"
            ? "/admin/invoices"
            : section === "settings"
              ? "/admin/settings"
              : "/admin/summary";
    api(path, { headers }).then(setData).catch((err) => setError(err.message));
  }, [section, token, reloadKey]);
  if (!token) {
    return (
      <section className="admin-login-screen">
        <div className="admin-login-card">
          <span className="admin-login-icon"><Lock className="h-6 w-6" /></span>
          <p className="admin-kicker">Secure admin access</p>
          <h1>Zyvory Control Center</h1>
          <p>Sign in to manage products, invoices, orders, delivery stock, and payment settings.</p>
          <form className="mt-6 grid gap-4" onSubmit={signIn}>
            <label className="field">
              <span>Email</span>
              <input value={login.email} onChange={(event) => setLogin({ ...login, email: event.target.value })} />
            </label>
            <label className="field">
              <span>Password</span>
              <input type="password" value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} />
            </label>
            {error && <div className="error-box">{error}</div>}
            <button className="primary-btn justify-center">Login</button>
          </form>
        </div>
      </section>
    );
  }
  return (
    <AdminLayout
      section={section}
      onSignOut={() => {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        setToken("");
      }}
    >
      {error && <AdminNotice message={error} tone="error" />}
      <AdminContent section={section} data={data} headers={headers} onChange={() => setReloadKey((value) => value + 1)} />
    </AdminLayout>
  );
}

const defaultProductForm = {
  name: "",
  category: "",
  price: "0",
  currency: "USD",
  image: "",
  badge: "New",
  status: "active",
  deliveryType: "license key",
  stockCount: "0",
  shortDescription: "",
  description: "",
  features: "",
  slug: "",
  metaTitle: "",
  metaDescription: ""
};

function listToText(value) {
  return Array.isArray(value) ? value.join("\n") : String(value || "");
}

function productToForm(product) {
  return {
    name: product.name || "",
    category: product.category || "",
    price: String(product.price ?? 0),
    currency: product.currency || "USD",
    image: product.image || "",
    badge: product.badge || "New",
    status: product.status || "active",
    deliveryType: product.deliveryType || "license key",
    stockCount: String(product.stockCount ?? 0),
    shortDescription: product.shortDescription || "",
    description: product.description || "",
    features: listToText(product.features),
    slug: product.slug || "",
    metaTitle: product.metaTitle || "",
    metaDescription: product.metaDescription || ""
  };
}

function formPayload(form) {
  return {
    ...form,
    price: Number(form.price || 0),
    stockCount: Number(form.stockCount || 0)
  };
}

function AdminLayout({ section, children, onSignOut }) {
  const [drawer, setDrawer] = useState(false);
  return (
    <section className="admin-shell">
      <div className="admin-mobile-bar">
        <button className="small-btn" onClick={() => setDrawer(true)}><Menu className="h-4 w-4" /> Menu</button>
        <span>Admin / {adminLabel(section)}</span>
      </div>
      <aside className={`admin-sidebar ${drawer ? "open" : ""}`}>
        <div className="admin-sidebar-head">
          <Link href="/" className="brand-lockup">
            <span className="brand-mark"><img src="/images/zyvola-logo.png" alt="Zyvory logo" /></span>
            <span><span className="brand-name">Zyvory</span><span className="brand-subtitle">Digital Market</span></span>
          </Link>
          <button className="icon-btn lg:hidden" onClick={() => setDrawer(false)}><X className="h-4 w-4" /></button>
        </div>
        <nav className="admin-nav">
          {adminNavItems.map(([name, label, Icon]) => (
            <Link key={name} href={name === "overview" ? "/admin" : `/admin/${name}`} className={section === name ? "active" : ""}>
              <Icon className="h-4 w-4" /> <span>{label}</span>
            </Link>
          ))}
        </nav>
        <button className="admin-signout" onClick={onSignOut}><Lock className="h-4 w-4" /> Sign out</button>
      </aside>
      {drawer && <button className="admin-drawer-backdrop" onClick={() => setDrawer(false)} aria-label="Close admin menu" />}
      <main className="admin-main">
        <div className="admin-topbar">
          <div>
            <p>Admin / {adminLabel(section)}</p>
            <strong>Marketplace control center</strong>
          </div>
          <div className="admin-top-actions">
            <CurrencySelector />
            <Link href="/dashboard" className="small-btn">Dashboard</Link>
            <span className="admin-profile"><UserCircle className="h-4 w-4" /> Admin</span>
          </div>
        </div>
        {children}
      </main>
    </section>
  );
}

function adminLabel(section) {
  return adminNavItems.find(([name]) => name === section)?.[1] || "Overview";
}

function AdminPageHeader({ section, title, subtitle, action }) {
  return (
    <div className="admin-page-header">
      <div>
        <p className="admin-kicker">Admin / {adminLabel(section)}</p>
        <h1>{title}</h1>
        <span>{subtitle}</span>
      </div>
      {action && <div className="admin-header-action">{action}</div>}
    </div>
  );
}

function AdminPanel({ title, text, icon: Icon, children, action }) {
  return (
    <section className="admin-panel admin-panel-pro">
      <div className="admin-panel-head">
        <div>
          {title && <h3>{Icon && <Icon className="h-5 w-5" />} {title}</h3>}
          {text && <p>{text}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function AdminStatCard({ icon: Icon, label, value, text, tone = "" }) {
  return (
    <motion.div className={`admin-stat ${tone}`} whileHover={{ y: -4 }} transition={{ duration: 0.16 }}>
      <span><Icon className="h-5 w-5" /></span>
      <div>
        <strong>{value}</strong>
        <p>{label}</p>
        <small>{text}</small>
      </div>
    </motion.div>
  );
}

function AdminEmptyState({ icon: Icon = Package, title, text, action }) {
  return (
    <div className="admin-empty-state">
      <span><Icon className="h-7 w-7" /></span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

function StatusBadge({ status = "pending" }) {
  const normalized = String(status || "pending").toLowerCase();
  return <span className={`admin-status ${normalized}`}>{normalized}</span>;
}

function formatAdminDate(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleString();
}

function clip(value, length = 18) {
  const text = String(value || "");
  return text.length > length ? `${text.slice(0, length)}...` : text || "Not set";
}

function AdminLoadingSkeleton() {
  return (
    <div className="admin-content-stack">
      <div className="admin-skeleton hero" />
      <div className="admin-stat-grid">
        {Array.from({ length: 6 }).map((_, index) => <div className="admin-skeleton" key={index} />)}
      </div>
    </div>
  );
}

function AdminContent({ section, data, headers, onChange }) {
  if (!data) return <AdminLoadingSkeleton />;
  if (section === "products") {
    return <AdminProducts data={data} headers={headers} onChange={onChange} />;
  }
  if (section === "categories") {
    return <AdminCategories data={data} headers={headers} onChange={onChange} />;
  }
  if (section === "invoices") {
    return <AdminInvoices data={data} headers={headers} onChange={onChange} />;
  }
  if (section === "orders") {
    return <AdminOrders data={data} />;
  }
  if (section === "settings") {
    return <AdminSettings data={data} headers={headers} onChange={onChange} />;
  }
  if (["customers", "coupons", "reviews"].includes(section)) {
    return <AdminPlaceholder section={section} />;
  }
  const lowStock = data.lowStock || [];
  return (
    <div className="admin-content-stack">
      <AdminPageHeader section="overview" title="Operations Center" subtitle="Manage products, invoices, orders, delivery logs, and payment settings." />
      <div className="admin-stat-grid">
        <AdminStatCard icon={BadgeDollarSign} label="Total Revenue" value={money(data.revenue || 0)} text="Confirmed sales value" />
        <AdminStatCard icon={ShoppingCart} label="Orders" value={data.orders || 0} text="Purchase records" />
        <AdminStatCard icon={Wallet} label="Pending Invoices" value={data.invoices || 0} text="Payment activity" />
        <AdminStatCard icon={Package} label="Products" value={data.products || 0} text="Published catalog" />
        <AdminStatCard icon={Boxes} label="Stock Items" value={lowStock.reduce((sum, p) => sum + Number(p.stockCount || 0), 0)} text="Low-stock total" />
        <AdminStatCard icon={Star} label="Reviews" value={data.reviews || 0} text="Approved feedback" />
      </div>
      <div className="admin-overview-grid">
        <AdminPanel title="Recent Orders" text="Latest customer purchases and delivery activity." icon={ShoppingCart}>
          <AdminMiniRows rows={[]} empty="No orders yet." />
        </AdminPanel>
        <AdminPanel title="Recent Invoices" text="Crypto invoice states and confirmation progress." icon={Wallet}>
          <AdminMiniRows rows={[]} empty="No invoices yet." />
        </AdminPanel>
        <AdminPanel title="Low Stock Products" text="Products that need fresh keys, accounts, or files." icon={AlertTriangle}>
          {lowStock.length ? (
            <div className="admin-mini-list">
              {lowStock.map((product) => (
                <div className="admin-mini-row" key={product.id}>
                  <span>{product.name}</span>
                  <strong>{product.stockCount} left</strong>
                </div>
              ))}
            </div>
          ) : <AdminEmptyState icon={ShieldCheck} title="Stock looks healthy" text="Low-stock alerts will appear here." />}
        </AdminPanel>
        <AdminPanel title="Quick Actions" text="Jump straight into the store controls." icon={Zap}>
          <div className="admin-quick-actions">
            <Link href="/admin/products" className="primary-btn"><Plus className="h-4 w-4" /> Add Product</Link>
            <Link href="/admin/categories" className="secondary-btn"><Boxes className="h-4 w-4" /> Create Category</Link>
            <Link href="/admin/orders" className="secondary-btn"><ShoppingCart className="h-4 w-4" /> View Orders</Link>
            <Link href="/admin/settings" className="secondary-btn"><Settings className="h-4 w-4" /> Payment Settings</Link>
          </div>
        </AdminPanel>
      </div>
    </div>
  );
}

function AdminMiniRows({ rows, empty }) {
  if (!rows.length) return <p className="text-slate-400">{empty}</p>;
  return (
    <div className="admin-mini-list">
      {rows.slice(0, 4).map((row, index) => (
        <div className="admin-mini-row" key={index}>
          {row.map((cell, cellIndex) => cellIndex === row.length - 1 ? <StatusBadge key={cellIndex} status={cell} /> : <span key={cellIndex}>{cell}</span>)}
        </div>
      ))}
    </div>
  );
}

function AdminOrders({ data }) {
  const orders = Array.isArray(data) ? data : [];
  const stats = [
    ["Total Orders", orders.length, ShoppingCart],
    ["Paid Orders", orders.filter((o) => o.status === "paid").length, CheckCircle2],
    ["Pending Orders", orders.filter((o) => o.status === "pending").length, Timer],
    ["Failed Orders", orders.filter((o) => ["failed", "refunded"].includes(o.status)).length, AlertTriangle]
  ];
  return (
    <div className="admin-content-stack">
      <AdminPageHeader section="orders" title="Orders" subtitle="Track purchases, delivery status, and customer activity." />
      <div className="admin-stat-grid compact">
        {stats.map(([label, value, Icon]) => <AdminStatCard key={label} icon={Icon} label={label} value={value} text="Order state" />)}
      </div>
      <AdminPanel title="Order Ledger" text="Every completed checkout should create a delivery-aware order record." icon={ShoppingCart}>
        <div className="admin-table order-table">
          <div className="admin-table-head"><span>Order ID</span><span>Customer Email</span><span>Product</span><span>Total</span><span>Payment</span><span>Status</span><span>Delivery</span><span>Created</span><span>Actions</span></div>
          {orders.map((order) => (
            <div className="admin-table-row" key={order.id}>
              <strong>{order.id}</strong>
              <span>{order.customerEmail || order.email || "Unknown"}</span>
              <span>{order.product || order.products?.join(", ") || order.deliveryItems?.[0]?.name || "Digital product"}</span>
              <strong>{money(order.totalUsd || order.total || 0)}</strong>
              <span>{order.paymentMethod || order.selectedCoin || "Balance"}</span>
              <StatusBadge status={order.status || "pending"} />
              <StatusBadge status={order.deliveryStatus || (order.status === "paid" ? "delivered" : "queued")} />
              <span>{formatAdminDate(order.createdAt)}</span>
              <div className="admin-row-actions"><button className="small-btn">View</button><button className="small-btn">Resend</button><button className="small-btn">Mark delivered</button></div>
            </div>
          ))}
          {!orders.length && <AdminEmptyState icon={ShoppingCart} title="No orders yet" text="Orders will appear here when customers complete checkout." />}
        </div>
      </AdminPanel>
    </div>
  );
}

function AdminPlaceholder({ section }) {
  const title = adminLabel(section);
  return (
    <div className="admin-content-stack">
      <AdminPageHeader section={section} title={title} subtitle={`${title} controls are ready for backend wiring.`} />
      <AdminPanel title={`${title} Manager`} text="This section is styled and reserved for the next backend endpoints." icon={Settings}>
        <AdminEmptyState icon={Settings} title={`${title} module ready`} text="Connect the API and this area can show tables, filters, and actions without redesigning the layout." />
      </AdminPanel>
    </div>
  );
}

function AdminInvoices({ data, headers, onChange }) {
  const source = Array.isArray(data) ? data : [];
  const [filter, setFilter] = useState("all");
  const [message, setMessage] = useState("");
  const filtered = filter === "all" ? source : source.filter((inv) => inv.status === filter);
  const markPaid = async (id) => {
    try {
      await api(`/admin/invoices/${id}/mark-paid`, { method: "POST", body: "{}", headers });
      setMessage(`Invoice ${id} marked as paid!`);
      onChange();
    } catch (err) { setMessage(err.message); }
  };
  const counts = ["pending", "detected", "confirming", "paid", "expired", "underpaid"].map((status) => [status, source.filter((inv) => inv.status === status).length]);
  return (
    <div className="admin-content-stack">
      <AdminPageHeader section="invoices" title="Invoices" subtitle="Monitor crypto invoices, payment confirmations, and delivery triggers." />
      <div className="admin-stat-grid compact">
        {counts.map(([status, count]) => <AdminStatCard key={status} icon={Wallet} label={status} value={count} text="Invoice state" tone={status} />)}
      </div>
      {message && <AdminNotice message={message} tone="success" />}
      <AdminPanel title="Invoice Ledger" text="Blockchain addresses are matched to invoices server-side." icon={Wallet} action={
        <div className="admin-filter-tabs">
          {["all", "pending", "detected", "confirming", "paid", "expired", "underpaid"].map((f) => <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>{f}</button>)}
        </div>
      }>
        <div className="admin-table invoice-table">
          <div className="admin-table-head">
            <span>Invoice ID</span><span>Customer</span><span>Coin</span><span>Expected</span><span>Paid</span><span>Address</span><span>Conf.</span><span>Status</span><span>Expires</span><span>TXID</span><span>Actions</span>
          </div>
          {filtered.map((inv) => (
            <div className="admin-table-row" key={inv.id}>
              <strong>{inv.id}</strong>
              <span>{inv.customerEmail || inv.customer || "Unknown"}</span>
              <span>{inv.selectedCoin || inv.coin || "LTC"}</span>
              <span>{inv.expectedCryptoAmount || inv.expectedAmount || "0.00000000"}</span>
              <span>{inv.paidAmount || "0"}</span>
              <code>{clip(inv.depositAddress || inv.address, 16)}</code>
              <span>{inv.confirmations ?? inv.confirmationCount ?? 0}</span>
              <StatusBadge status={inv.status} />
              <span>{formatAdminDate(inv.expiresAt || inv.expirationDate)}</span>
              <code>{clip(inv.txid || inv.transactionId, 12)}</code>
              <div className="admin-row-actions">
                <button className="small-btn">View</button>
                <button className="small-btn" onClick={() => navigator.clipboard?.writeText(inv.depositAddress || inv.address || "")}><Copy className="h-3.5 w-3.5" /></button>
                <button className="small-btn" onClick={() => markPaid(inv.id)}>Mark paid</button>
              </div>
            </div>
          ))}
          {!filtered.length && <AdminEmptyState icon={Wallet} title="No invoices found" text="Crypto invoices will appear here after checkout starts." />}
        </div>
      </AdminPanel>
    </div>
  );
}

function AdminSettings({ data, headers, onChange }) {
  const [tab, setTab] = useState("General");
  const [form, setForm] = useState({
    storeName: data.storeName || "Zyvory Market",
    domain: data.domain || "zyvory.xyz",
    defaultCurrency: data.defaultCurrency || "EUR",
    timezone: data.timezone || "Africa/Lagos",
    discordInvite: data.discordInvite || "",
    ltcAddress: (data.walletAddresses || {}).LTC || "",
    btcAddress: (data.walletAddresses || {}).BTC || "",
    solAddress: (data.walletAddresses || {}).SOL || "",
    ethAddress: (data.walletAddresses || {}).ETH || ""
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const save = async (e) => {
    e.preventDefault();
    setMessage(""); setError("");
    try {
      await api("/admin/settings", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          storeName: form.storeName,
          discordInvite: form.discordInvite,
          walletAddresses: {
            LTC: form.ltcAddress,
            BTC: form.btcAddress,
            SOL: form.solAddress,
            ETH: form.ethAddress
          }
        })
      });
      setMessage("Settings saved!");
      onChange();
    } catch (err) { setError(err.message); }
  };
  const tabs = ["General", "Payments", "Crypto Wallets", "Discord Webhooks", "Email SMTP", "Security", "Branding"];
  return (
    <div className="admin-content-stack">
      <AdminPageHeader section="settings" title="Settings" subtitle="Configure storefront, payments, wallets, Discord, email, security, and branding." />
      {(message || error) && <AdminNotice message={message || error} tone={error ? "error" : "success"} />}
      <AdminPanel title="Store Settings" text="Sensitive secrets belong on the server only. Keep wallet/API credentials out of frontend code." icon={Settings}>
        <div className="settings-tabs">{tabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</div>
        <form className="admin-form settings-form" onSubmit={save}>
          {tab === "General" && <>
            <AdminField label="Store name" help="Displayed in checkout, dashboard, and emails."><input value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} /></AdminField>
            <AdminField label="Domain"><input value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} /></AdminField>
            <AdminField label="Support Discord URL"><input value={form.discordInvite} onChange={(e) => setForm({ ...form, discordInvite: e.target.value })} /></AdminField>
            <AdminField label="Default currency"><select value={form.defaultCurrency} onChange={(e) => setForm({ ...form, defaultCurrency: e.target.value })}>{CURRENCIES.map((c) => <option key={c.code}>{c.code}</option>)}</select></AdminField>
            <AdminField label="Timezone"><input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} /></AdminField>
          </>}
          {tab === "Payments" && <>
            {["LTC", "BTC", "SOL", "ETH"].map((coin) => <label className="admin-toggle" key={coin}><span>{coin}</span><input type="checkbox" defaultChecked /></label>)}
            <AdminField label="Invoice expiration minutes"><input type="number" defaultValue="15" /></AdminField>
            <AdminField label="Confirmation requirements"><input defaultValue="LTC: 2, BTC: 1, SOL: 1, ETH: 12" /></AdminField>
            <AdminField label="Minimum payment amount"><input type="number" defaultValue="1" /></AdminField>
          </>}
          {tab === "Crypto Wallets" && <>
            <AdminField label="Litecoin (LTC) Address" wide><input value={form.ltcAddress} onChange={(e) => setForm({ ...form, ltcAddress: e.target.value })} /></AdminField>
            <AdminField label="Bitcoin (BTC) Address" wide><input value={form.btcAddress} onChange={(e) => setForm({ ...form, btcAddress: e.target.value })} /></AdminField>
            <AdminField label="Solana (SOL) Address" wide><input value={form.solAddress} onChange={(e) => setForm({ ...form, solAddress: e.target.value })} /></AdminField>
            <AdminField label="Ethereum (ETH) Address" wide><input value={form.ethAddress} onChange={(e) => setForm({ ...form, ethAddress: e.target.value })} /></AdminField>
          </>}
          {tab === "Discord Webhooks" && <>
            <AdminField label="New order webhook" wide><input placeholder="https://discord.com/api/webhooks/..." /></AdminField>
            <AdminField label="Invoice paid webhook" wide><input placeholder="https://discord.com/api/webhooks/..." /></AdminField>
            <AdminField label="Low stock webhook" wide><input placeholder="https://discord.com/api/webhooks/..." /></AdminField>
            <button type="button" className="secondary-btn"><MessageCircle className="h-4 w-4" /> Test webhook</button>
          </>}
          {tab === "Email SMTP" && <>
            <AdminField label="SMTP host"><input placeholder="smtp.mailgun.org" /></AdminField>
            <AdminField label="From email"><input placeholder="support@zyvory.xyz" /></AdminField>
            <AdminField label="SMTP password" wide><input type="password" placeholder="Stored server-side" /></AdminField>
          </>}
          {tab === "Security" && <>
            <AdminField label="Change admin password"><input type="password" placeholder="New password" /></AdminField>
            <label className="admin-toggle"><span>2FA placeholder</span><input type="checkbox" /></label>
            <AdminField label="API keys" wide><input type="password" value="••••••••••••••••" readOnly /></AdminField>
            <AdminEmptyState icon={ShieldCheck} title="Audit logs ready" text="Suspicious admin activity should be logged server-side." />
          </>}
          {tab === "Branding" && <>
            <AdminField label="Logo upload"><div className="upload-area"><Upload className="h-5 w-5" /><span>Upload transparent Z logo</span></div></AdminField>
            <AdminField label="Favicon upload"><div className="upload-area"><Upload className="h-5 w-5" /><span>Upload favicon</span></div></AdminField>
            <AdminField label="Accent color"><input type="text" defaultValue="#00D9FF" /></AdminField>
            <AdminField label="Hero image" wide><input placeholder="/images/hero-reference-characters.png" /></AdminField>
          </>}
          <div className="admin-form-actions"><button className="primary-btn">Save Settings</button></div>
        </form>
      </AdminPanel>
    </div>
  );
}

function AdminProducts({ data, headers, onChange }) {
  const rawCategories = data.categories || [];
  const catNames = rawCategories.map((c) => c.name || c);
  const products = data.products || [];
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState({ ...defaultProductForm, category: catNames[0] || "" });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const editing = products.find((product) => product.id === editingId);
  const filteredProducts = products
    .filter((product) => product.name.toLowerCase().includes(search.toLowerCase()))
    .filter((product) => categoryFilter === "all" || product.category === categoryFilter)
    .filter((product) => statusFilter === "all" || (product.status || "active") === statusFilter);

  useEffect(() => {
    if (!form.category && catNames[0]) setForm((current) => ({ ...current, category: catNames[0] }));
  }, [rawCategories]);

  const reset = () => {
    setEditingId("");
    setForm({ ...defaultProductForm, category: catNames[0] || "" });
    setImageFile(null);
    setImagePreview("");
    setError("");
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const path = editingId ? `/admin/products/${editingId}` : "/admin/products";
      const method = editingId ? "PUT" : "POST";
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("category", form.category);
      fd.append("price", form.price);
      fd.append("badge", form.badge);
      fd.append("status", form.status);
      fd.append("currency", form.currency);
      fd.append("deliveryType", form.deliveryType);
      fd.append("stockCount", form.stockCount);
      fd.append("shortDescription", form.shortDescription);
      fd.append("description", form.description);
      fd.append("features", form.features);
      fd.append("slug", form.slug);
      fd.append("metaTitle", form.metaTitle);
      fd.append("metaDescription", form.metaDescription);
      if (imageFile) fd.append("image", imageFile);
      else if (form.image) fd.append("image", form.image);
      await api(path, { method, headers, body: fd });
      setMessage(editingId ? "Product updated." : "Product created.");
      reset();
      onChange();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (product) => {
    if (!confirm(`Delete "${product.name}"?`)) return;
    setError("");
    setMessage("");
    try {
      await api(`/admin/products/${product.id}`, { method: "DELETE", headers });
      setMessage(`${product.name} deleted.`);
      if (editingId === product.id) reset();
      onChange();
    } catch (err) {
      setError(err.message);
    }
  };

  const currentPreview = imagePreview || form.image || "";

  return (
    <div className="admin-content-stack">
      <AdminPageHeader section="products" title="Products" subtitle="Create, edit, stock, and organize digital products." action={<button className="primary-btn" onClick={reset}><Plus className="h-4 w-4" /> Add Product</button>} />
      <div className="admin-workspace">
      <div className="admin-panel">
        <div className="admin-panel-head">
          <div>
            <h3>{editing ? "Edit Product" : "Add Product"}</h3>
            <p>Create products, assign categories, upload images, and set stock count.</p>
          </div>
          {editing && <button className="small-btn" onClick={reset}>New Product</button>}
        </div>
        {(message || error) && <AdminNotice message={message || error} tone={error ? "error" : "success"} />}
        <form className="admin-form" onSubmit={submit}>
          <div className="admin-form-section-title">Basic information</div>
          <AdminField label="Product name">
            <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Product name" />
          </AdminField>
          <AdminField label="Category">
            <select required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
              <option value="">Select category</option>
              {catNames.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </AdminField>
          <div className="admin-form-section-title">Pricing & stock</div>
          <AdminField label="Price USD">
            <input type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
          </AdminField>
          <AdminField label="Currency">
            <select value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })}>
              {CURRENCIES.map((c) => <option key={c.code}>{c.code}</option>)}
            </select>
          </AdminField>
          <AdminField label="Badge">
            <input value={form.badge} onChange={(event) => setForm({ ...form, badge: event.target.value })} placeholder="Popular" />
          </AdminField>
          <AdminField label="Status">
            <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              <option>active</option><option>draft</option><option>hidden</option>
            </select>
          </AdminField>
          <AdminField label="Delivery type">
            <select value={form.deliveryType} onChange={(event) => setForm({ ...form, deliveryType: event.target.value })}>
              <option>license key</option><option>file download</option><option>account credentials</option><option>private link</option><option>manual delivery</option>
            </select>
          </AdminField>
          <div className="admin-form-section-title">Media</div>
          <AdminField label="Product Image" wide>
            <div className="flex items-start gap-4">
              <label className="upload-area">
                <Upload className="h-5 w-5 text-blue-300" />
                <span>Click to upload image</span>
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
              {currentPreview && <img src={currentPreview} alt="Preview" className="h-20 w-20 rounded-lg object-cover border border-blue-500/20" />}
            </div>
            <input value={form.image} onChange={(event) => setForm({ ...form, image: event.target.value })} placeholder="Or paste image URL..." className="mt-2" />
          </AdminField>
          <AdminField label="Stock Count">
            <input type="number" min="0" value={form.stockCount} onChange={(event) => setForm({ ...form, stockCount: event.target.value })} placeholder="Number in stock" />
          </AdminField>
          <div className="admin-form-section-title">Description</div>
          <AdminField label="Short description" wide>
            <input value={form.shortDescription} onChange={(event) => setForm({ ...form, shortDescription: event.target.value })} placeholder="Short card description" />
          </AdminField>
          <AdminField label="Full description" wide>
            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Full product page description" />
          </AdminField>
          <AdminField label="Features list" wide help="One feature per line.">
            <textarea value={form.features} onChange={(event) => setForm({ ...form, features: event.target.value })} placeholder={"Instant delivery\nDashboard access\nReplacement support"} />
          </AdminField>
          <div className="admin-form-section-title">SEO / Slug</div>
          <AdminField label="Product slug">
            <input value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} placeholder="chatgpt-plus" />
          </AdminField>
          <AdminField label="Meta title">
            <input value={form.metaTitle} onChange={(event) => setForm({ ...form, metaTitle: event.target.value })} />
          </AdminField>
          <AdminField label="Meta description" wide>
            <input value={form.metaDescription} onChange={(event) => setForm({ ...form, metaDescription: event.target.value })} />
          </AdminField>
          <div className="admin-form-actions">
            <button className="primary-btn">{editing ? "Save Product" : "Create Product"}</button>
            <button className="secondary-btn" type="button" onClick={reset}>Clear</button>
          </div>
        </form>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-head">
          <div>
            <h3>Products</h3>
            <p>{products.length} products across {catNames.length} categories.</p>
          </div>
        </div>
        <div className="admin-toolbar">
          <label><Search className="h-4 w-4" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." /></label>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option value="all">All categories</option>{catNames.map((name) => <option key={name}>{name}</option>)}</select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">All statuses</option><option>active</option><option>draft</option><option>hidden</option></select>
          <select defaultValue="newest"><option value="newest">Newest</option><option value="popular">Popular</option><option value="stock">Stock</option></select>
        </div>
        <div className="admin-list">
          {filteredProducts.map((product) => (
            <div className="admin-product-row" key={product.id}>
              {product.image ? <img src={product.image} alt={product.name} /> : <div className="admin-product-noimg"><Image className="h-6 w-6 text-slate-500" /></div>}
              <div>
                <strong>{product.name}</strong>
                <span>{product.category} &bull; {money(product.price)} &bull; {product.stockCount ?? 0} in stock &bull; {product.badge || "No badge"}</span>
              </div>
              <StatusBadge status={product.status || "active"} />
              <div className="admin-row-actions">
                <button className="small-btn" onClick={() => {
                  setEditingId(product.id);
                  setForm(productToForm(product));
                  setImageFile(null);
                  setImagePreview("");
                  setMessage("");
                  setError("");
                }}>
                  Edit
                </button>
                <button className="small-btn" onClick={() => { setEditingId(""); setForm(productToForm({ ...product, name: `${product.name} Copy`, slug: "" })); }}>Duplicate</button>
                <button className="small-btn">Archive</button>
                <button className="small-btn danger" onClick={() => remove(product)}>Delete</button>
              </div>
            </div>
          ))}
          {products.length === 0 && <AdminEmptyState icon={Package} title="No products yet" text="Create your first digital product to start selling." action={<button className="primary-btn" onClick={reset}>Add Product</button>} />}
        </div>
      </div>
      </div>
    </div>
  );
}

function AdminCategories({ data, headers, onChange }) {
  const categories = data.categories || [];
  const products = data.products || [];
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [catImageFile, setCatImageFile] = useState(null);
  const [catImagePreview, setCatImagePreview] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const resetCat = () => { setEditingId(null); setName(""); setTag(""); setCatImageFile(null); setCatImagePreview(""); setError(""); };

  const handleCatImage = (e) => {
    const file = e.target.files[0];
    if (file) { setCatImageFile(file); setCatImagePreview(URL.createObjectURL(file)); }
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const fd = new FormData();
      fd.append("name", name);
      fd.append("tag", tag);
      if (catImageFile) fd.append("image", catImageFile);
      if (editingId) {
        await api(`/admin/categories/${editingId}`, { method: "PUT", headers, body: fd });
        setMessage("Category updated.");
      } else {
        await api("/admin/categories", { method: "POST", headers, body: fd });
        setMessage("Category created.");
      }
      resetCat();
      onChange();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (cat) => {
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    setError("");
    setMessage("");
    try {
      await api(`/admin/categories/${cat.id}`, { method: "DELETE", headers });
      setMessage("Category deleted.");
      onChange();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="admin-content-stack">
      <AdminPageHeader section="categories" title="Categories" subtitle="Create and organize storefront browse groups with clean icons and sorting." />
      <div className="admin-workspace">
      <div className="admin-panel">
        <div className="admin-panel-head">
          <div>
            <h3>{editingId ? "Edit Category" : "Create Category"}</h3>
            <p>Categories appear in product forms, filters, and storefront browse links.</p>
          </div>
        </div>
        {(message || error) && <AdminNotice message={message || error} tone={error ? "error" : "success"} />}
        <form className="admin-inline-form" onSubmit={submit}>
          <label className="field">
            <span>Category name</span>
            <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. CS2 Prime Accounts" />
          </label>
          <label className="field">
            <span>Filter tag <small style={{color: '#7e8da6', fontWeight: 400}}>(browse category)</small></span>
            <select value={tag} onChange={(event) => setTag(event.target.value)}>
              <option value="">— No tag —</option>
              {browseCategories.map((bc) => <option key={bc.name} value={bc.name}>{bc.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Category image</span>
            <div className="flex items-center gap-3">
              <label className="upload-area small">
                <Upload className="h-4 w-4 text-blue-300" />
                <span>Upload</span>
                <input type="file" accept="image/*" onChange={handleCatImage} className="hidden" />
              </label>
              {catImagePreview && <img src={catImagePreview} alt="Preview" className="h-12 w-12 rounded object-cover border border-blue-500/20" />}
            </div>
          </label>
          <button className="primary-btn">{editingId ? "Save Category" : "Add Category"}</button>
          {editingId && <button type="button" className="secondary-btn" onClick={resetCat}>Cancel</button>}
        </form>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-head">
          <div>
            <h3>Manage Categories</h3>
            <p>{categories.length} active categories.</p>
          </div>
        </div>
        <div className="admin-list">
          {categories.map((cat) => {
            const catName = cat.name || cat;
            const count = products.filter((p) => p.category === catName).length;
            return (
              <div className="admin-category-row" key={cat.id || catName}>
                {cat.image ? <img src={cat.image} alt={catName} className="h-10 w-10 rounded object-cover" /> : <div className="h-10 w-10 rounded bg-cyan-900/30 flex items-center justify-center"><Boxes className="h-5 w-5 text-slate-500" /></div>}
                <div>
                  <strong>{catName}</strong>
                  {cat.tag && <span className="pill" style={{marginLeft: '0.5rem', fontSize: '0.7rem'}}>{cat.tag}</span>}
                  <span>{count} product{count === 1 ? "" : "s"}</span>
                </div>
                <div className="admin-row-actions">
                <button className="small-btn" onClick={() => { setEditingId(cat.id); setName(catName); setTag(cat.tag || ""); setCatImageFile(null); setCatImagePreview(cat.image || ""); setError(""); setMessage(""); }}>Edit</button>
                  <button className="small-btn danger" onClick={() => remove(cat)}>Delete</button>
                </div>
              </div>
            );
          })}
          {categories.length === 0 && <p className="text-slate-400 py-4">No categories yet. Create your first category above.</p>}
        </div>
      </div>
      </div>
    </div>
  );
}

function AdminField({ label, children, wide = false, help = "" }) {
  return (
    <label className={wide ? "field admin-field-wide" : "field"}>
      <span>{label}</span>
      {children}
      {help && <small>{help}</small>}
    </label>
  );
}

function AdminNotice({ message, tone }) {
  return <div className={tone === "error" ? "admin-notice error" : "admin-notice success"}>{message}</div>;
}

function FaqSection() {
  const faq = [
    { icon: "?", tone: "danger", question: "What happens after I purchase?", answer: "Your invoice is created, payment is monitored server-side, and eligible products are delivered automatically after confirmation." },
    { icon: "▰", tone: "blue", question: "What payment methods do you support?", answer: "Litecoin, Bitcoin, Solana, Ethereum, PayPal Friends & Family, and customer balance." },
    { icon: "⚡", tone: "orange", question: "How fast is delivery?", answer: "Crypto orders unlock after the configured confirmation count. License keys, files, credentials, and private links can be delivered instantly." },
    { icon: "🤝", tone: "gold", question: "Need help?", answer: "Open a ticket in our support server and include your email or invoice ID so we can find your order fast." },
    { icon: "↺", tone: "cyan", question: "Refund policy", answer: "Digital products are final once delivered unless stock is invalid, duplicate, or cannot be replaced." },
    { icon: "⏱", tone: "purple", question: "Crypto payment confirmation time", answer: "Times depend on chain congestion and configured confirmation requirements." }
  ];
  return (
    <section className="faq-showcase section-space">
      <div className="container-shell faq-showcase-grid">
        <motion.div className="faq-support-panel" initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5 }}>
          <p className="faq-eyebrow">Frequently Asked Questions</p>
          <h2>Got a question?</h2>
          <span>We've got answers.</span>
          <div className="faq-character-wrap">
            <img src="/images/IMG3.png" alt="Zyvory support characters" />
          </div>
          <div className="faq-support-copy">
            <strong>Our customer support is available 24/7</strong>
            <p>Average answer time: <span>10 minutes</span></p>
          </div>
          <a href="https://discord.gg/Zhd6unzQGm" className="faq-support-button">
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="currentColor">
              <path d={siDiscord.path} />
            </svg>
            Support Server
          </a>
        </motion.div>
        <motion.div className="faq-list-panel" initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5 }}>
          {faq.map((item, index) => (
            <details className="faq-item premium-hover" key={item.question} open={index === 0}>
              <summary>
                <span className={`faq-row-icon ${item.tone}`}>{item.icon}</span>
                <span>{item.question}</span>
                <ChevronDown className="h-4 w-4" />
              </summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function PolicyPage({ type }) {
  const isTerms = type === "terms";
  return (
    <section className="mx-auto max-w-4xl px-4 py-12">
      <SectionHeading eyebrow="Policy" title={isTerms ? "Terms of Service" : "Privacy Policy"} />
      <div className="policy-copy mt-8">
        {isTerms ? (
          <>
            <p>Digital products are delivered electronically. Customers are responsible for confirming product compatibility before purchase.</p>
            <p>Crypto invoices must be paid with the exact amount before expiration. Underpaid, overpaid, failed, or expired invoices require support review.</p>
            <p>Refunds are handled case by case for invalid stock, duplicate delivery, or products that cannot be replaced.</p>
          </>
        ) : (
          <>
            <p>Customer email, invoice records, delivery logs, and support identifiers are stored for order fulfillment and fraud prevention.</p>
            <p>Private keys, seed phrases, wallet secrets, API secrets, and SMTP credentials belong only in server environment variables.</p>
            <p>Payment checks are performed on the backend. Admin access requires authentication and should be served over HTTPS in production.</p>
          </>
        )}
      </div>
    </section>
  );
}

function SupportPage() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <SectionHeading eyebrow="Support" title="Get Help" />
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <a className="support-card" href="https://discord.gg/Zhd6unzQGm">
          <MessageCircle className="h-7 w-7 text-blue-300" />
          <h3>Discord Support</h3>
          <p>Open a ticket with your invoice ID and email address.</p>
          <ExternalLink className="h-5 w-5" />
        </a>
        <a className="support-card" href="mailto:support@zyvory.local">
          <Mail className="h-7 w-7 text-blue-300" />
          <h3>Email Support</h3>
          <p>Use email for delivery issues, replacement checks, and manual orders.</p>
          <ExternalLink className="h-5 w-5" />
        </a>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container-shell footer-grid">
        <div>
          <Link href="/" className="brand-lockup">
            <span className="brand-mark">
              <img src="/images/zyvola-logo.png" alt="Zyvory logo" />
            </span>
            <span>
              <span className="brand-name">Zyvory</span>
              <span className="brand-subtitle">Digital Market</span>
            </span>
          </Link>
          <p className="mt-5 max-w-md text-sm leading-7 text-[#9CB6C9]">
            Premium digital products, crypto invoices, protected delivery records, and a customer dashboard built for serious gaming commerce.
          </p>
        </div>
        <div className="footer-links">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/support">Support</Link>
          <a href="https://discord.gg/Zhd6unzQGm">Discord</a>
        </div>
      </div>
      <div className="container-shell footer-bottom">
        <span>Copyright 2026 Zyvory Digital Market.</span>
        <span>Secure checkout logic. Server-side payment verification.</span>
      </div>
    </footer>
  );
}

function Loading() {
  return <div className="mx-auto max-w-7xl px-4 py-20 text-blue-300">Loading...</div>;
}

function ErrorMessage({ message }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20">
      <div className="error-box flex items-center gap-3">
        <AlertTriangle className="h-5 w-5" />
        {message}
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-20">
      <h1 className="text-4xl font-black text-white">Page not found</h1>
      <Link href="/" className="primary-btn mt-6">
        Back Home
      </Link>
    </section>
  );
}

const rootElement = document.getElementById("root");
const appRoot = window.__zyvoryRoot || createRoot(rootElement);
window.__zyvoryRoot = appRoot;
appRoot.render(<App />);
