import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BadgeDollarSign,
  BarChart3,
  Boxes,
  Car,
  ChevronDown,
  ChevronLeft,
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
  RefreshCw,
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
  Target,
  HelpCircle,
  Clock,
  Info,
  Eye,
  FileText,
  Sparkles
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
const WISHLIST_KEY = "zyvory-wishlist";
const RECENT_KEY = "zyvory-recent-products";
const COOKIE_CONSENT_KEY = "zyvory-cookie-consent";
const DISCORD_URL = "https://discord.gg/PKWwqG8uYB";
const SITE_NAME = "Zyvora";
const SITE_TAGLINE = "Premium Digital Marketplace";
const SITE_DESCRIPTION = "Buy digital products, gaming accounts, and tools with instant crypto and PayPal delivery. Secure invoices, automatic delivery, and 24/7 support.";

// ── SEO helpers ──
function setMeta(name, content, attr = "name") {
  if (typeof document === "undefined" || !content) return;
  let tag = document.querySelector(`meta[${attr}="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function setLink(rel, href) {
  if (typeof document === "undefined" || !href) return;
  let tag = document.querySelector(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", rel);
    document.head.appendChild(tag);
  }
  tag.setAttribute("href", href);
}

function useDocumentTitle(title, description) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const full = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — ${SITE_TAGLINE}`;
    document.title = full;
    const desc = description || SITE_DESCRIPTION;
    setMeta("description", desc);
    setMeta("og:title", full, "property");
    setMeta("og:description", desc, "property");
    setMeta("og:type", "website", "property");
    setMeta("og:site_name", SITE_NAME, "property");
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", full);
    setMeta("twitter:description", desc);
    if (typeof window !== "undefined") {
      setLink("canonical", window.location.origin + window.location.pathname);
      setMeta("og:url", window.location.href, "property");
    }
  }, [title, description]);
}

function useScrollToTop(deps = []) {
  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "instant" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

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
    ["/categories", "Categories"],
    ["/track", "Track"],
    ["/faq", "FAQ"],
    ["/support", "Support"]
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
            <a href={DISCORD_URL} className="discord-nav-link" aria-label="Join Discord">
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
              <a href={DISCORD_URL} className="mobile-link">
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
      <CookieConsentBanner />
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
  if (pathname === "/track") return <TrackOrderPage />;
  if (pathname === "/faq") return <FaqPage />;
  if (pathname === "/refund" || pathname === "/refunds") return <RefundPage />;
  if (pathname === "/cookies" || pathname === "/cookie-policy") return <CookiesPage />;
  if (pathname === "/categories") return <CategoriesPage />;
  if (pathname.startsWith("/browse/")) return <BrowseCategoryPage category={pathname.split("/")[2]} />;
  return <NotFound />;
}

function HomePage() {
  useDocumentTitle("", "Premium digital products, gaming accounts, license keys, and tools with instant crypto and PayPal delivery.");
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
            <a href={DISCORD_URL} className="secondary-btn discord-hero-btn" aria-label="Join Discord">
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
  useDocumentTitle("Products", "Browse all digital products: gaming accounts, license keys, tools, scripts, and more with instant delivery.");
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

  const catData = categories
    .map((c) => {
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
    })
    .filter((c) => c.items.length > 0);

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
  useDocumentTitle(product?.name || "Product", product?.shortDescription || product?.description?.slice(0, 160));
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
  useDocumentTitle("Cart", "Review items in your cart before checkout.");
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
  useDocumentTitle("Checkout", "Secure checkout with crypto, PayPal, or wallet balance. Instant delivery after payment confirmation.");
  const cart = useCart();
  const route = useRouteContext();
  const [form, setForm] = useState({ email: "", discord: "", couponCode: "", paymentMethod: "LTC", agreedToTerms: false, newsletter: false });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [discordLink, setDiscordLink] = useState("");
  const [couponMsg, setCouponMsg] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  useEffect(() => {
    api("/settings/public").then((s) => setDiscordLink(s.discordInvite || "")).catch(() => {});
  }, []);
  const applyCoupon = async () => {
    if (!form.couponCode.trim()) return;
    setCouponMsg(""); setCouponDiscount(0);
    try {
      const result = await api("/coupons/validate", { method: "POST", body: JSON.stringify({ code: form.couponCode, subtotal: cart.total }) });
      setCouponDiscount(result.discount);
      setCouponMsg(`Coupon applied! -€${result.discount.toFixed(2)}`);
    } catch (err) {
      setCouponMsg(err.message);
      setCouponDiscount(0);
    }
  };
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
            {couponDiscount > 0 && <div className="co-row" style={{color:"#22c55e"}}><span>Discount</span><span>-<Money value={couponDiscount} /></span></div>}
            <div className="co-row co-row-total"><span>Total</span><span><Money value={Math.max(0, cart.total - couponDiscount)} /></span></div>
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
              <input value={form.couponCode} onChange={(e) => { setForm({ ...form, couponCode: e.target.value }); setCouponMsg(""); setCouponDiscount(0); }} placeholder="Coupon Code" className="co-coupon-input" />
              <button type="button" className="co-coupon-btn" onClick={applyCoupon}>Apply <span className="co-arrow">→</span></button>
            </div>
            {couponMsg && <p className={`text-sm mt-2 ${couponDiscount > 0 ? "text-green-400" : "text-red-400"}`}>{couponMsg}</p>}
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
  useDocumentTitle(`Invoice ${invoiceId}`, "Pay your order securely. Payment is monitored on-chain in real time.");
  const [invoice, setInvoice] = useState(null);
  const [discordLink, setDiscordLink] = useState("");
  const [prices, setPrices] = useState(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState("");
  const [recheckBusy, setRecheckBusy] = useState(false);
  const [recheckResult, setRecheckResult] = useState(null);
  const autoRecheckedRef = useRef(false);
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
  // Auto-trigger a single recheck on first load for pending crypto invoices.
  // Most customers refresh / revisit after sending — no need to click the button.
  useEffect(() => {
    if (!invoice || autoRecheckedRef.current) return;
    if (invoice.status !== "pending") return;
    if (!invoice.depositAddress || !invoice.selectedCoin) return;
    if (invoice.selectedCoin === "PAYPAL_FF") return;
    autoRecheckedRef.current = true;
    // Fire-and-forget; the existing 10s invoice poll will pick up the new state.
    api(`/invoices/${invoiceId}/recheck`, { method: "POST", body: "{}" })
      .then(() => api(`/invoices/${invoiceId}`).then((inv) => { if (inv) setInvoice(inv); }))
      .catch(() => {});
  }, [invoice, invoiceId]);
  const checkPaymentNow = async () => {
    if (recheckBusy) return;
    setRecheckBusy(true);
    setRecheckResult(null);
    try {
      const r = await api(`/invoices/${invoiceId}/recheck`, { method: "POST", body: "{}" });
      setRecheckResult(r);
      // Refresh invoice so UI reflects new status/confirmation immediately
      const fresh = await api(`/invoices/${invoiceId}`);
      if (fresh) setInvoice(fresh);
    } catch (err) {
      setRecheckResult({ error: err.message || "Recheck failed" });
    } finally {
      setRecheckBusy(false);
      // Clear result after 8s so the UI doesn't get stale
      setTimeout(() => setRecheckResult(null), 8000);
    }
  };
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
      {!paid && !expired && invoice.selectedCoin === "PAYPAL_FF" && invoice.depositAddress && (
        <div className="inv-pay-card">
          <div className="inv-pay-header">
            <div className="inv-pay-coin">
              <span className="co-pay-icon" style={{ background: "#003087" }}>P</span>
              <div>
                <p className="inv-pay-coin-label">PayPal Friends &amp; Family</p>
                <p className="inv-pay-coin-addr">Manual verification required</p>
              </div>
            </div>
            <p className="inv-pay-amount-top">€{Number(invoice.totalUsd).toFixed(2)}</p>
          </div>
          <div className="inv-exact-amount">
            <p className="inv-exact-label">SEND TO THIS PAYPAL</p>
            <div className="inv-exact-row">
              <span className="inv-exact-value">{invoice.depositAddress}</span>
              <button className="inv-copy-btn" onClick={() => copyText(invoice.depositAddress, "addr")} title="Copy PayPal email">
                {copied === "addr" ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="inv-exact-amount" style={{marginTop:"0.75rem"}}>
            <p className="inv-exact-label">AMOUNT TO SEND</p>
            <div className="inv-exact-row">
              <span className="inv-exact-value">€{Number(invoice.totalUsd).toFixed(2)} EUR</span>
              <button className="inv-copy-btn" onClick={() => copyText(String(invoice.totalUsd), "amount")} title="Copy amount">
                {copied === "amount" ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="inv-how-to-pay">
            <p className="inv-how-label">HOW TO PAY</p>
            <div className="inv-step"><span className="inv-step-num">1</span><span>Open PayPal and send €{Number(invoice.totalUsd).toFixed(2)} to {invoice.depositAddress}</span></div>
            <div className="inv-step"><span className="inv-step-num">2</span><span>Select <strong>Friends &amp; Family</strong> (not Goods &amp; Services)</span></div>
            <div className="inv-step"><span className="inv-step-num">3</span><span>Include your invoice ID <strong>{invoice.id}</strong> in the payment note</span></div>
            <div className="inv-step"><span className="inv-step-num">4</span><span>Open a support ticket with your payment screenshot for manual verification</span></div>
          </div>
          <div className="inv-waiting">
            <span className="inv-waiting-dot"></span>
            PayPal payments require manual verification. Open a ticket after sending.
          </div>
        </div>
      )}
      {!paid && !expired && invoice.selectedCoin !== "PAYPAL_FF" && invoice.depositAddress && (
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
            {invoice.totalUsd && invoice.expectedCryptoAmount && (
              <p style={{margin:"0 0 0.5rem",fontSize:"0.72rem",color:"#8b949e"}}>Rate: 1 {invoice.selectedCoin} ≈ €{(invoice.totalUsd / invoice.expectedCryptoAmount).toFixed(2)}</p>
            )}
            <div className="inv-exact-row">
              <span className="inv-exact-value">{invoice.expectedCryptoAmount} {invoice.selectedCoin}</span>
              <button className="inv-copy-btn" onClick={() => copyText(String(invoice.expectedCryptoAmount), "amount")} title="Copy amount">
                {copied === "amount" ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {(() => {
            const EXCHANGE_FEES = { BTC: 0.0001, LTC: 0.0001, ETH: 0.001, SOL: 0.000005 };
            const fee = EXCHANGE_FEES[invoice.selectedCoin];
            if (!fee || !invoice.expectedCryptoAmount) return null;
            const exchangeSafe = (Number(invoice.expectedCryptoAmount) + fee).toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
            return (
              <div className="inv-exchange-note">
                <div className="inv-exchange-note-header">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Paying from Binance, Kraken or Coinbase?</span>
                </div>
                <p className="inv-exchange-note-text">
                  These exchanges deduct the network fee <strong>from the amount you send</strong>,
                  so the address receives less than expected. Enter this amount on the exchange
                  instead, so we receive the full expected amount:
                </p>
                <div className="inv-exact-row" style={{marginTop:".5rem"}}>
                  <span className="inv-exact-value" style={{color:"#fbbf24"}}>{exchangeSafe} {invoice.selectedCoin}</span>
                  <button className="inv-copy-btn" onClick={() => copyText(exchangeSafe, "exchAmt")} title="Copy exchange-safe amount">
                    {copied === "exchAmt" ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <p className="inv-exchange-note-text" style={{marginTop:".4rem",fontSize:".7rem",opacity:.75}}>
                  Includes a ~{fee} {invoice.selectedCoin} network-fee buffer.
                  If you pay from a self-custody wallet (Electrum, Trust, Exodus, MetaMask, Phantom),
                  send the original exact amount above instead.
                </p>
              </div>
            );
          })()}
          <div className="inv-how-to-pay">
            <p className="inv-how-label">HOW TO PAY</p>
            <div className="inv-step"><span className="inv-step-num">1</span><span>Send {invoice.expectedCryptoAmount} {invoice.selectedCoin} to the address above</span></div>
            <div className="inv-step"><span className="inv-step-num">2</span><span>Payment will be detected automatically after network confirmation</span></div>
            <div className="inv-step"><span className="inv-step-num">3</span><span>Send only {invoice.selectedCoin} to this address. Other cryptocurrencies will be lost.</span></div>
          </div>
          <button
            type="button"
            className="inv-check-now-btn"
            onClick={checkPaymentNow}
            disabled={recheckBusy}
          >
            {recheckBusy ? (
              <><span className="inv-check-spinner" /> Checking blockchain...</>
            ) : (
              <><RefreshCw className="h-4 w-4" /> Already sent? Check payment now</>
            )}
          </button>
          {recheckResult && (
            <div className={`inv-check-result inv-check-${recheckResult.error ? "error" : recheckResult.status || "pending"}`}>
              {recheckResult.error ? (
                <>⚠ {recheckResult.error}</>
              ) : recheckResult.status === "paid" ? (
                <>✓ Payment confirmed! Order is being delivered.</>
              ) : recheckResult.status === "detected" ? (
                <>◎ Transaction detected — {recheckResult.confirmations}/{recheckResult.requiredConfirmations} confirmations. We'll auto-deliver once confirmed.</>
              ) : recheckResult.txsAtAddress > 0 ? (
                <>{recheckResult.txsAtAddress} transaction{recheckResult.txsAtAddress > 1 ? "s" : ""} at this address, but none match the expected amount yet. If you just sent, wait 1–2 min for the network to broadcast.</>
              ) : (
                <>No payment detected yet. If you just sent, please wait 1–2 min for the network to broadcast.{recheckResult.cached && " (cached)"}</>
              )}
            </div>
          )}
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

function OrderDetailView({ order, invoice, customerEmail, onBack }) {
  const [copiedKey, setCopiedKey] = useState(null);
  const items = typeof order.items === "string" ? JSON.parse(order.items) : (order.items || []);
  const deliveryItems = typeof order.deliveryItems === "string" ? JSON.parse(order.deliveryItems) : (order.deliveryItems || []);
  const date = new Date(order.createdAt);
  const dateStr = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const timeStr = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const total = invoice?.totalUsd || order.totalUsd || 0;
  const isDelivered = order.status === "completed";
  const copyVal = (val, key) => { navigator.clipboard?.writeText(val); setCopiedKey(key); setTimeout(() => setCopiedKey(null), 2000); };
  const allDelivered = deliveryItems.flatMap(d => (d.delivered || []).map(v => `${d.name}: ${v}`));
  const copyAll = () => { navigator.clipboard?.writeText(allDelivered.join("\n")); setCopiedKey("all"); setTimeout(() => setCopiedKey(null), 2000); };
  const downloadAll = () => {
    const blob = new Blob([allDelivered.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `order-${order.id}.txt`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="od-wrap">
      <button className="od-back" onClick={onBack}><ChevronLeft className="h-4 w-4" /> Back to Orders</button>

      <div className="od-header">
        <div>
          <h1 className="od-title">Order {order.id}</h1>
          <p className="od-subtitle">Placed on {dateStr} at {timeStr}</p>
        </div>
        {invoice && <button className="od-download-invoice" onClick={() => window.open(`/invoice/${invoice.id}`, "_blank")}><Download className="h-4 w-4" /> Download Invoice</button>}
      </div>

      <div className="od-status-banner" style={{ borderColor: isDelivered ? "rgba(34,197,94,0.25)" : "rgba(250,204,21,0.25)", background: isDelivered ? "rgba(34,197,94,0.06)" : "rgba(250,204,21,0.06)" }}>
        <div style={{display:"flex",alignItems:"center",gap:".6rem"}}>
          <CheckCircle2 className="h-6 w-6" style={{color: isDelivered ? "#4ade80" : "#facc15"}} />
          <div>
            <strong style={{color: isDelivered ? "#4ade80" : "#facc15"}}>Order Status: {isDelivered ? "Delivered" : order.status}</strong>
            <p style={{color:"#8b949e",fontSize:".85rem",margin:0}}>{isDelivered ? "Your order has been successfully delivered" : "Your order is being processed"}</p>
          </div>
        </div>
        <strong style={{color:"#f0f6ff",fontSize:"1.3rem"}}>€{Number(total).toFixed(2)}</strong>
      </div>

      <div className="od-grid">
        <div className="od-col">
          <div className="od-card">
            <h3><Package className="h-4 w-4" /> Order Items</h3>
            {items.map((item, i) => (
              <div key={i} className="od-item">
                <div>
                  <strong>{item.name}</strong>
                  <p>{item.name}</p>
                  <span className="od-qty">Qty: {item.quantity}</span>
                </div>
                <strong>€{Number(item.price * item.quantity).toFixed(2)}</strong>
              </div>
            ))}
            <div className="od-totals">
              <div><span>Subtotal</span><span>€{Number(total).toFixed(2)}</span></div>
              <div className="od-total-row"><span>Total</span><span>€{Number(total).toFixed(2)}</span></div>
              {invoice?.expectedCryptoAmount && <div><span>Amount Paid</span><span>€{Number(invoice.totalUsd).toFixed(2)}</span></div>}
            </div>
          </div>

          {deliveryItems.length > 0 && (
            <div className="od-card">
              <div className="od-card-head">
                <h3><CheckCircle2 className="h-4 w-4 text-green-400" /> Delivered Items</h3>
                <div style={{display:"flex",gap:".4rem"}}>
                  <button className="od-action-btn" onClick={copyAll}><Copy className="h-3.5 w-3.5" /> {copiedKey === "all" ? "Copied!" : "Copy All"}</button>
                  <button className="od-action-btn" onClick={downloadAll}><Download className="h-3.5 w-3.5" /> Download All</button>
                </div>
              </div>
              {deliveryItems.map((di, i) => (
                <div key={i} className="od-delivery-item">
                  <div className="od-delivery-head"><KeyRound className="h-4 w-4 text-indigo-400" /> <strong>{di.deliveryType || "License Key"}</strong></div>
                  {(di.delivered || []).map((val, j) => (
                    <div key={j} className="od-delivery-value">
                      <code>{val}</code>
                      <button className="od-copy-btn" onClick={() => copyVal(val, `${i}-${j}`)}>{copiedKey === `${i}-${j}` ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />} {copiedKey === `${i}-${j}` ? "Copied" : "Copy"}</button>
                    </div>
                  ))}
                  <p className="od-delivery-meta">Delivered on {dateStr} at {timeStr} - {di.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="od-col">
          <div className="od-card">
            <h3><Wallet className="h-4 w-4" /> Payment Information</h3>
            <div className="od-info-list">
              <div><span>Payment Method</span><strong>{invoice?.selectedCoin || "Balance"}</strong></div>
              {invoice?.expectedCryptoAmount && <div><span>Amount Paid</span><strong>€{Number(invoice.totalUsd).toFixed(2)}</strong></div>}
              {invoice?.transactionId && <div><span>Transaction ID</span><code style={{fontSize:".8rem",color:"#58a6ff"}}>{invoice.transactionId}</code></div>}
              {invoice?.depositAddress && <div><span>Crypto Address</span><code style={{fontSize:".78rem",color:"#58a6ff",wordBreak:"break-all"}}>{invoice.depositAddress}</code></div>}
              {invoice?.expectedCryptoAmount && <div><span>Crypto Amount</span><strong>{invoice.expectedCryptoAmount}</strong></div>}
            </div>
          </div>

          <div className="od-card">
            <h3><UserCircle className="h-4 w-4" /> Customer Information</h3>
            <div className="od-info-list">
              <div><span>Email</span><strong>{customerEmail}</strong></div>
              <div><span>Customer Since</span><strong>{dateStr}</strong></div>
            </div>
          </div>

          <div className="od-card">
            <h3><Timer className="h-4 w-4" /> Order Timeline</h3>
            <div className="od-timeline">
              <div className="od-timeline-item">
                <span className="od-timeline-dot green"></span>
                <div><strong>Order Placed</strong><p>{dateStr} at {timeStr}</p></div>
              </div>
              {isDelivered && (
                <div className="od-timeline-item">
                  <span className="od-timeline-dot green"></span>
                  <div><strong>Order Delivered</strong><p>{dateStr} at {timeStr}</p></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardPage() {
  useDocumentTitle("Dashboard", "View your orders, downloads, balance, and reviews.");
  const route = useRouteContext();
  const LOGO = "https://res.cloudinary.com/db4mpxc2k/image/upload/v1778619521/Zyvolalogo_yecrow.png";
  const [step, setStep] = useState("email"); // email | code | dashboard
  const [email, setEmail] = useState(new URLSearchParams(route.search).get("email") || "");
  const [code, setCode] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("home");
  const [selectedOrder, setSelectedOrder] = useState(null);
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
  const [dashSearch, setDashSearch] = useState("");
  const searchLower = dashSearch.trim().toLowerCase();
  const matchesSearch = (order) => {
    if (!searchLower) return true;
    if (order.id?.toLowerCase().includes(searchLower)) return true;
    if (order.invoiceId?.toLowerCase().includes(searchLower)) return true;
    const items = typeof order.items === "string" ? (() => { try { return JSON.parse(order.items); } catch { return []; } })() : (order.items || []);
    return items.some((i) => (i.name || i.productName || "").toLowerCase().includes(searchLower));
  };
  const recentOrders = paidOrders.filter(matchesSearch).slice(-5).reverse();

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
            <input
              value={dashSearch}
              onChange={(e) => setDashSearch(e.target.value)}
              placeholder="Search your orders by ID or product..."
            />
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
                <>
                  {!selectedOrder ? (
                    <div className="cd-orders-table">
                      <div className="cd-table-header">
                        <span>ORDER</span><span>PRODUCTS</span><span>DATE</span><span>AMOUNT</span><span>STATUS</span>
                      </div>
                      {[...paidOrders].reverse().map(order => {
                        const inv = (data.invoices || []).find(i => i.id === order.invoiceId);
                        const items = typeof order.items === "string" ? JSON.parse(order.items) : (order.items || []);
                        const date = new Date(order.createdAt);
                        const daysAgo = Math.floor((Date.now() - date.getTime()) / 86400000);
                        const agoText = daysAgo === 0 ? "today" : daysAgo === 1 ? "1d ago" : `${daysAgo}d ago`;
                        return (
                          <div className="cd-table-row" key={order.id} onClick={() => setSelectedOrder(order)} style={{cursor:"pointer"}}>
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
                    <OrderDetailView order={selectedOrder} invoice={(data.invoices || []).find(i => i.id === selectedOrder.invoiceId)} customerEmail={email} onBack={() => setSelectedOrder(null)} />
                  )}
                </>
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
                <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="cd-create-ticket-btn">
                  <Plus className="h-4 w-4" /> Create ticket
                </a>
              </div>
              <div className="cd-empty">
                <MessageCircle className="h-10 w-10 text-slate-500" />
                <h3>No support tickets</h3>
                <p>You haven't created any support tickets yet.</p>
                <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="cd-create-ticket-btn" style={{marginTop:"1rem"}}>
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
  const [login, setLogin] = useState({ email: "", password: "" });
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
            : section === "customers"
              ? "/admin/customers"
              : section === "coupons"
                ? "/admin/coupons"
                : section === "reviews"
                  ? "/admin/reviews"
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
    return <AdminOrders data={data} headers={headers} onChange={onChange} />;
  }
  if (section === "settings") {
    return <AdminSettings data={data} headers={headers} onChange={onChange} />;
  }
  if (section === "customers") {
    return <AdminCustomers data={data} headers={headers} onChange={onChange} />;
  }
  if (section === "coupons") {
    return <AdminCoupons data={data} headers={headers} onChange={onChange} />;
  }
  if (section === "reviews") {
    return <AdminReviews data={data} headers={headers} onChange={onChange} />;
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

function AdminOrders({ data, headers, onChange }) {
  const orders = Array.isArray(data) ? data : [];
  const [viewOrder, setViewOrder] = useState(null);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const filtered = search ? orders.filter(o => (o.id + (o.customerEmail || "")).toLowerCase().includes(search.toLowerCase())) : orders;
  const stats = [
    ["Total", orders.length, ShoppingCart],
    ["Completed", orders.filter(o => o.status === "completed").length, CheckCircle2],
    ["Pending", orders.filter(o => o.status === "pending").length, Timer],
    ["Failed", orders.filter(o => ["failed", "refunded"].includes(o.status)).length, AlertTriangle]
  ];
  const resendDelivery = async (order) => {
    try {
      await api(`/admin/orders/${order.id}/resend`, { method: "POST", body: "{}", headers });
      setMessage(`Delivery email resent for ${order.id}`);
    } catch (err) { setMessage(err.message); }
  };
  return (
    <div className="admin-content-stack">
      <AdminPageHeader section="orders" title="Orders" subtitle="Track purchases, delivery status, and customer activity." />
      <div className="admin-stat-grid compact">
        {stats.map(([label, value, Icon]) => <AdminStatCard key={label} icon={Icon} label={label} value={value} text="" />)}
      </div>
      {message && <AdminNotice message={message} tone="success" />}

      {viewOrder && (
        <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setViewOrder(null); }}>
          <div className="admin-modal" style={{maxWidth:"620px"}}>
            <div className="admin-modal-header">
              <h2>Order Details</h2>
              <button className="admin-modal-close" onClick={() => setViewOrder(null)}>×</button>
            </div>
            <div className="admin-modal-body" style={{display:"grid",gap:".75rem"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem",fontSize:".85rem"}}>
                <div><span style={{color:"#6b7280"}}>Order ID</span><br/><strong style={{color:"#f0f6ff"}}>{viewOrder.id}</strong></div>
                <div><span style={{color:"#6b7280"}}>Customer</span><br/><strong style={{color:"#f0f6ff"}}>{viewOrder.customerEmail}</strong></div>
                <div><span style={{color:"#6b7280"}}>Total</span><br/><strong style={{color:"#f0f6ff"}}>{money(viewOrder.totalUsd || 0)}</strong></div>
                <div><span style={{color:"#6b7280"}}>Status</span><br/><StatusBadge status={viewOrder.status} /></div>
                <div style={{gridColumn:"1/-1"}}><span style={{color:"#6b7280"}}>Created</span><br/><strong style={{color:"#f0f6ff"}}>{formatAdminDate(viewOrder.createdAt)}</strong></div>
              </div>
              <div style={{borderTop:"1px solid rgba(255,255,255,0.06)",paddingTop:".75rem"}}>
                <p style={{color:"#6b7280",fontSize:".75rem",fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",marginBottom:".5rem"}}>Delivery Items</p>
                {(viewOrder.deliveryItems || []).map((item, i) => (
                  <div key={i} style={{border:"1px solid rgba(255,255,255,0.06)",borderRadius:"10px",background:"rgba(255,255,255,0.02)",padding:".7rem",marginBottom:".4rem"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:".35rem"}}><strong style={{color:"#f0f6ff",fontSize:".85rem"}}>{item.name}</strong><span style={{color:"#6b7280",fontSize:".75rem"}}>{item.deliveryType || "auto"}</span></div>
                    {(item.delivered || []).map((val, j) => (
                      <div key={j} style={{display:"flex",alignItems:"center",gap:".4rem",background:"#0d1117",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"6px",padding:".4rem .6rem",marginBottom:".25rem"}}>
                        <code style={{flex:1,fontSize:".8rem",wordBreak:"break-all",color:"#58a6ff"}}>{val}</code>
                        <button className="small-btn" onClick={() => { navigator.clipboard?.writeText(val); setMessage("Copied!"); }}><Copy className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                ))}
                {!(viewOrder.deliveryItems || []).length && <p style={{color:"#484f58",fontSize:".85rem"}}>No delivery items recorded.</p>}
              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="small-btn" onClick={() => resendDelivery(viewOrder)}><Mail className="h-3.5 w-3.5" /> Resend Email</button>
              <button className="small-btn" onClick={() => setViewOrder(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <AdminPanel title="Order Ledger" text="" icon={ShoppingCart} action={
        <div style={{display:"flex",alignItems:"center",gap:".5rem"}}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders..." style={{padding:".4rem .65rem",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"8px",background:"#161b22",color:"#f0f6ff",fontSize:".82rem",width:"200px"}} />
        </div>
      }>
        <div className="admin-table order-table">
          <div className="admin-table-head"><span>Order ID</span><span>Customer</span><span>Product</span><span>Total</span><span>Status</span><span>Date</span><span>Actions</span></div>
          {filtered.map((order) => (
            <div className="admin-table-row" key={order.id}>
              <strong>{order.id.slice(0, 18)}</strong>
              <span>{order.customerEmail || "Unknown"}</span>
              <span>{order.deliveryItems?.[0]?.name || "Digital product"}{order.deliveryItems?.length > 1 ? ` +${order.deliveryItems.length - 1}` : ""}</span>
              <strong>{money(order.totalUsd || order.total || 0)}</strong>
              <StatusBadge status={order.status || "pending"} />
              <span>{formatAdminDate(order.createdAt)}</span>
              <div className="admin-row-actions">
                <button className="small-btn" onClick={() => setViewOrder(order)}>View</button>
                <button className="small-btn" onClick={() => resendDelivery(order)}><Mail className="h-3 w-3" /></button>
              </div>
            </div>
          ))}
          {!filtered.length && <AdminEmptyState icon={ShoppingCart} title="No orders found" text={search ? "No matching orders." : "Orders will appear here when customers complete checkout."} />}
        </div>
      </AdminPanel>
    </div>
  );
}

function AdminCustomers({ data, headers, onChange }) {
  const customers = Array.isArray(data) ? data : [];
  const [editCustomer, setEditCustomer] = useState(null);
  const [balanceInput, setBalanceInput] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const filtered = search ? customers.filter(c => (c.email || "").toLowerCase().includes(search.toLowerCase())) : customers;
  const saveBalance = async () => {
    try {
      await api(`/admin/customers/${encodeURIComponent(editCustomer.email)}/balance`, { method: "PUT", body: JSON.stringify({ balance: Number(balanceInput) }), headers });
      setMessage(`Balance updated for ${editCustomer.email}`);
      setEditCustomer(null);
      onChange();
    } catch (err) { setMessage(err.message); }
  };
  return (
    <div className="admin-content-stack">
      <AdminPageHeader section="customers" title="Customers" subtitle="View accounts and manage store credit." />
      <div className="admin-stat-grid compact">
        <AdminStatCard icon={UserCircle} label="Total" value={customers.length} text="" />
        <AdminStatCard icon={Wallet} label="Credit Outstanding" value={money(customers.reduce((s, c) => s + Number(c.balance || 0), 0))} text="" />
      </div>
      {message && <AdminNotice message={message} tone="success" />}

      {editCustomer && (
        <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setEditCustomer(null); }}>
          <div className="admin-modal" style={{maxWidth:"400px"}}>
            <div className="admin-modal-header">
              <h2>Edit Balance</h2>
              <button className="admin-modal-close" onClick={() => setEditCustomer(null)}>×</button>
            </div>
            <div className="admin-modal-body">
              <p style={{color:"#8b949e",fontSize:".85rem",marginBottom:".75rem"}}>{editCustomer.email}</p>
              <label className="field"><span>Store Credit Balance (€)</span><input type="number" step="0.01" value={balanceInput} onChange={(e) => setBalanceInput(e.target.value)} /></label>
            </div>
            <div className="admin-modal-footer">
              <button className="small-btn" onClick={() => setEditCustomer(null)}>Cancel</button>
              <button className="primary-btn" onClick={saveBalance}>Save Balance</button>
            </div>
          </div>
        </div>
      )}

      <AdminPanel title="Customers" text="" icon={UserCircle} action={
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by email..." style={{padding:".4rem .65rem",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"8px",background:"#161b22",color:"#f0f6ff",fontSize:".82rem",width:"200px"}} />
      }>
        <div className="admin-table">
          <div className="admin-table-head" style={{gridTemplateColumns:"1.5fr 90px 120px 120px auto"}}><span>Email</span><span>Balance</span><span>Last Order</span><span>Joined</span><span>Actions</span></div>
          {filtered.map((c) => (
            <div className="admin-table-row" key={c.email || c.id} style={{gridTemplateColumns:"1.5fr 90px 120px 120px auto"}}>
              <strong>{c.email}</strong>
              <span style={{color:"#4ade80",fontWeight:700}}>{money(Number(c.balance || 0))}</span>
              <span>{formatAdminDate(c.last_order_at)}</span>
              <span>{formatAdminDate(c.created_at)}</span>
              <div className="admin-row-actions">
                <button className="small-btn" onClick={() => { setEditCustomer(c); setBalanceInput(String(c.balance || 0)); }}><Wallet className="h-3 w-3" /> Edit</button>
              </div>
            </div>
          ))}
          {!filtered.length && <AdminEmptyState icon={UserCircle} title="No customers found" text={search ? "No matching customers." : "Customers appear after their first checkout."} />}
        </div>
      </AdminPanel>
    </div>
  );
}

function AdminCoupons({ data, headers, onChange }) {
  const coupons = Array.isArray(data) ? data : [];
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ code: "", type: "percent", value: "", expiresAt: "2026-12-31" });
  const [editId, setEditId] = useState(null);
  const [message, setMessage] = useState("");
  const openNew = () => { setEditId(null); setForm({ code: "", type: "percent", value: "", expiresAt: "2026-12-31" }); setShowModal(true); };
  const openEdit = (c) => { setEditId(c.id); setForm({ code: c.code, type: c.type, value: String(c.value), expiresAt: c.expires_at ? c.expires_at.slice(0, 10) : "2026-12-31" }); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditId(null); };
  const submitCoupon = async () => {
    try {
      if (editId) {
        await api(`/admin/coupons/${editId}`, { method: "PUT", body: JSON.stringify({ ...form, value: Number(form.value), active: true, expiresAt: form.expiresAt + " 23:59:59" }), headers });
        setMessage("Coupon updated!");
      } else {
        await api("/admin/coupons", { method: "POST", body: JSON.stringify({ ...form, value: Number(form.value), active: true, expiresAt: form.expiresAt + " 23:59:59" }), headers });
        setMessage("Coupon created!");
      }
      closeModal();
      onChange();
    } catch (err) { setMessage(err.message); }
  };
  const toggleActive = async (coupon) => {
    try {
      await api(`/admin/coupons/${coupon.id}`, { method: "PUT", body: JSON.stringify({ active: !coupon.active }), headers });
      onChange();
    } catch (err) { setMessage(err.message); }
  };
  const remove = async (id) => {
    if (!confirm("Delete this coupon?")) return;
    try { await api(`/admin/coupons/${id}`, { method: "DELETE", headers }); onChange(); } catch (err) { setMessage(err.message); }
  };
  return (
    <div className="admin-content-stack">
      <AdminPageHeader section="coupons" title="Coupons" subtitle="Create and manage discount codes." />
      <div className="admin-stat-grid compact">
        <AdminStatCard icon={BadgeDollarSign} label="Total" value={coupons.length} text="" />
        <AdminStatCard icon={CheckCircle2} label="Active" value={coupons.filter(c => c.active).length} text="" />
      </div>
      {message && <AdminNotice message={message} tone="success" />}

      {showModal && (
        <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="admin-modal" style={{maxWidth:"480px"}}>
            <div className="admin-modal-header">
              <h2>{editId ? "Edit Coupon" : "New Coupon"}</h2>
              <button className="admin-modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-form">
                <label className="field"><span>Code</span><input value={form.code} onChange={(e) => setForm({...form, code: e.target.value.toUpperCase()})} placeholder="SUMMER20" /></label>
                <label className="field"><span>Type</span><select value={form.type} onChange={(e) => setForm({...form, type: e.target.value})}><option value="percent">Percentage (%)</option><option value="fixed">Fixed (€)</option></select></label>
                <label className="field"><span>Value</span><input type="number" value={form.value} onChange={(e) => setForm({...form, value: e.target.value})} placeholder="10" /></label>
                <label className="field"><span>Expires</span><input type="date" value={form.expiresAt} onChange={(e) => setForm({...form, expiresAt: e.target.value})} /></label>
              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="small-btn" onClick={closeModal}>Cancel</button>
              <button className="primary-btn" onClick={submitCoupon}>{editId ? "Update" : "Create"} Coupon</button>
            </div>
          </div>
        </div>
      )}

      <AdminPanel title="Coupons" text="" icon={BadgeDollarSign} action={
        <button className="primary-btn" onClick={openNew}><Plus className="h-4 w-4" /> New Coupon</button>
      }>
        <div className="admin-table">
          <div className="admin-table-head" style={{gridTemplateColumns:"1fr 90px 80px 80px 120px auto"}}><span>Code</span><span>Type</span><span>Value</span><span>Status</span><span>Expires</span><span>Actions</span></div>
          {coupons.map((c) => (
            <div className="admin-table-row" key={c.id} style={{gridTemplateColumns:"1fr 90px 80px 80px 120px auto"}}>
              <strong>{c.code}</strong>
              <span>{c.type === "percent" ? "%" : "Fixed"}</span>
              <span>{c.type === "percent" ? `${c.value}%` : `€${c.value}`}</span>
              <StatusBadge status={c.active ? "active" : "expired"} />
              <span>{formatAdminDate(c.expires_at)}</span>
              <div className="admin-row-actions">
                <button className="small-btn" onClick={() => openEdit(c)}>Edit</button>
                <button className="small-btn" onClick={() => toggleActive(c)}>{c.active ? "Disable" : "Enable"}</button>
                <button className="small-btn danger" onClick={() => remove(c.id)}><Trash2 className="h-3 w-3" /></button>
              </div>
            </div>
          ))}
          {!coupons.length && <AdminEmptyState icon={BadgeDollarSign} title="No coupons yet" text="Create your first discount code." />}
        </div>
      </AdminPanel>
    </div>
  );
}

function AdminReviews({ data, headers, onChange }) {
  const reviews = Array.isArray(data) ? data : [];
  const [filter, setFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [viewReview, setViewReview] = useState(null);
  const filtered = filter === "all" ? reviews : reviews.filter((r) => r.status === filter);
  const setStatus = async (id, status) => {
    try {
      await api(`/admin/reviews/${id}/status`, { method: "PUT", body: JSON.stringify({ status }), headers });
      setMessage(`Review ${status}`);
      setViewReview(null);
      onChange();
    } catch (err) { setMessage(err.message); }
  };
  const remove = async (id) => {
    if (!confirm("Delete this review?")) return;
    try { await api(`/admin/reviews/${id}`, { method: "DELETE", headers }); setViewReview(null); onChange(); } catch (err) { setMessage(err.message); }
  };
  return (
    <div className="admin-content-stack">
      <AdminPageHeader section="reviews" title="Reviews" subtitle="Moderate customer feedback." />
      <div className="admin-stat-grid compact">
        <AdminStatCard icon={Star} label="Total" value={reviews.length} text="" />
        <AdminStatCard icon={CheckCircle2} label="Approved" value={reviews.filter(r => r.status === "approved").length} text="" />
        <AdminStatCard icon={Timer} label="Pending" value={reviews.filter(r => r.status === "pending").length} text="" />
      </div>
      {message && <AdminNotice message={message} tone="success" />}

      {viewReview && (
        <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setViewReview(null); }}>
          <div className="admin-modal" style={{maxWidth:"500px"}}>
            <div className="admin-modal-header">
              <h2>Review Details</h2>
              <button className="admin-modal-close" onClick={() => setViewReview(null)}>×</button>
            </div>
            <div className="admin-modal-body" style={{display:"grid",gap:".75rem"}}>
              <div><span style={{color:"#6b7280",fontSize:".82rem"}}>Product</span><br/><strong style={{color:"#f0f6ff"}}>{viewReview.productName || "Unknown"}</strong></div>
              <div style={{display:"flex",alignItems:"center",gap:".5rem"}}><span style={{color:"#6b7280",fontSize:".82rem"}}>Rating:</span> <Stars rating={viewReview.rating} /></div>
              <div style={{border:"1px solid rgba(255,255,255,0.06)",borderRadius:"10px",background:"rgba(255,255,255,0.02)",padding:".75rem"}}><p style={{color:"#c9d1d9",fontSize:".88rem",lineHeight:1.6,margin:0}}>{viewReview.text}</p></div>
              <div style={{display:"flex",gap:"1rem",fontSize:".82rem"}}>
                <div><span style={{color:"#6b7280"}}>Status:</span> <StatusBadge status={viewReview.status} /></div>
                <div><span style={{color:"#6b7280"}}>Date:</span> <span style={{color:"#c9d1d9"}}>{formatAdminDate(viewReview.createdAt)}</span></div>
              </div>
            </div>
            <div className="admin-modal-footer">
              {viewReview.status !== "approved" && <button className="primary-btn" onClick={() => setStatus(viewReview.id, "approved")}>Approve</button>}
              {viewReview.status !== "rejected" && <button className="small-btn" onClick={() => setStatus(viewReview.id, "rejected")}>Reject</button>}
              <button className="small-btn danger" onClick={() => remove(viewReview.id)}><Trash2 className="h-3 w-3" /> Delete</button>
            </div>
          </div>
        </div>
      )}

      <AdminPanel title="Reviews" text="" icon={Star} action={
        <div className="admin-filter-tabs">
          {["all", "pending", "approved", "rejected"].map((f) => <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>{f}</button>)}
        </div>
      }>
        <div className="admin-table">
          <div className="admin-table-head" style={{gridTemplateColumns:"1fr 80px 1.5fr 80px 110px auto"}}><span>Product</span><span>Rating</span><span>Review</span><span>Status</span><span>Date</span><span>Actions</span></div>
          {filtered.map((r) => (
            <div className="admin-table-row" key={r.id} style={{gridTemplateColumns:"1fr 80px 1.5fr 80px 110px auto"}}>
              <strong>{r.productName || "Unknown"}</strong>
              <span><Stars rating={r.rating} /></span>
              <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"#8b949e"}}>{r.text}</span>
              <StatusBadge status={r.status} />
              <span>{formatAdminDate(r.createdAt)}</span>
              <div className="admin-row-actions">
                <button className="small-btn" onClick={() => setViewReview(r)}>View</button>
                {r.status !== "approved" && <button className="small-btn" onClick={() => setStatus(r.id, "approved")}>Approve</button>}
                {r.status !== "rejected" && <button className="small-btn" onClick={() => setStatus(r.id, "rejected")}>Reject</button>}
              </div>
            </div>
          ))}
          {!filtered.length && <AdminEmptyState icon={Star} title="No reviews found" text="Customer reviews will appear here after purchases." />}
        </div>
      </AdminPanel>
    </div>
  );
}

function AdminInvoices({ data, headers, onChange }) {
  const source = Array.isArray(data) ? data : [];
  const [filter, setFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [viewInv, setViewInv] = useState(null);
  const [search, setSearch] = useState("");
  const byStatus = filter === "all" ? source : source.filter((inv) => inv.status === filter);
  const filtered = search ? byStatus.filter(inv => (inv.id + (inv.customerEmail || "")).toLowerCase().includes(search.toLowerCase())) : byStatus;
  const [recheckResult, setRecheckResult] = useState(null);
  const [recheckBusy, setRecheckBusy] = useState(null);
  const markPaid = async (id) => {
    try {
      await api(`/admin/invoices/${id}/mark-paid`, { method: "POST", body: "{}", headers });
      setMessage(`Invoice ${id} marked as paid!`);
      setViewInv(null);
      onChange();
    } catch (err) { setMessage(err.message); }
  };
  const recheck = async (id) => {
    setRecheckBusy(id);
    setRecheckResult(null);
    try {
      const r = await api(`/admin/invoices/${id}/recheck`, { method: "POST", body: "{}", headers });
      setRecheckResult(r);
      if (r.action === "marked_paid_and_delivered") {
        setMessage(`Invoice ${id} matched on-chain and delivered!`);
        onChange();
      } else if (r.action === "tx_linked_awaiting_confirmations") {
        setMessage(`Tx linked — awaiting ${r.requiredConfirmations} confirmations (currently ${r.match?.confirmations || 0}).`);
        onChange();
      } else {
        setMessage(`No match. ${r.hint || ""}`);
      }
    } catch (err) { setMessage(err.message); }
    finally { setRecheckBusy(null); }
  };
  const counts = ["pending", "detected", "confirming", "paid", "expired", "underpaid"].map((s) => [s, source.filter((inv) => inv.status === s).length]);
  return (
    <div className="admin-content-stack">
      <AdminPageHeader section="invoices" title="Invoices" subtitle="Monitor crypto invoices and payment confirmations." />
      <div className="admin-stat-grid compact">
        {counts.map(([status, count]) => <AdminStatCard key={status} icon={Wallet} label={status} value={count} text="" />)}
      </div>
      {message && <AdminNotice message={message} tone="success" />}

      {viewInv && (
        <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setViewInv(null); }}>
          <div className="admin-modal" style={{maxWidth:"580px"}}>
            <div className="admin-modal-header">
              <h2>Invoice Details</h2>
              <button className="admin-modal-close" onClick={() => setViewInv(null)}>×</button>
            </div>
            <div className="admin-modal-body" style={{display:"grid",gap:".6rem",fontSize:".85rem"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem"}}>
                <div><span style={{color:"#6b7280"}}>Invoice ID</span><br/><strong style={{color:"#f0f6ff",fontSize:".82rem",wordBreak:"break-all"}}>{viewInv.id}</strong></div>
                <div><span style={{color:"#6b7280"}}>Customer</span><br/><strong style={{color:"#f0f6ff"}}>{viewInv.customerEmail || "Unknown"}</strong></div>
                <div><span style={{color:"#6b7280"}}>Coin</span><br/><strong style={{color:"#f0f6ff"}}>{viewInv.selectedCoin || "LTC"}</strong></div>
                <div><span style={{color:"#6b7280"}}>Status</span><br/><StatusBadge status={viewInv.status} /></div>
                <div><span style={{color:"#6b7280"}}>Expected Amount</span><br/><code style={{color:"#58a6ff",fontSize:".82rem"}}>{viewInv.expectedCryptoAmount || "0"}</code></div>
                <div><span style={{color:"#6b7280"}}>Paid Amount</span><br/><code style={{color:"#4ade80",fontSize:".82rem"}}>{viewInv.paidAmount || "0"}</code></div>
                <div><span style={{color:"#6b7280"}}>Confirmations</span><br/><strong style={{color:"#f0f6ff"}}>{viewInv.confirmations ?? viewInv.confirmationCount ?? 0}</strong></div>
                <div><span style={{color:"#6b7280"}}>Expires</span><br/><strong style={{color:"#f0f6ff"}}>{formatAdminDate(viewInv.expiresAt)}</strong></div>
              </div>
              <div style={{borderTop:"1px solid rgba(255,255,255,0.06)",paddingTop:".6rem"}}>
                <p style={{color:"#6b7280",fontSize:".75rem",fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",marginBottom:".35rem"}}>Deposit Address</p>
                <div style={{display:"flex",alignItems:"center",gap:".4rem",background:"#161b22",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"8px",padding:".5rem .7rem"}}>
                  <code style={{flex:1,fontSize:".8rem",wordBreak:"break-all",color:"#58a6ff"}}>{viewInv.depositAddress || "—"}</code>
                  <button className="small-btn" onClick={() => { navigator.clipboard?.writeText(viewInv.depositAddress || ""); setMessage("Copied!"); }}><Copy className="h-3 w-3" /></button>
                </div>
              </div>
              {(viewInv.txid || viewInv.transactionId) && (
                <div>
                  <p style={{color:"#6b7280",fontSize:".75rem",fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",marginBottom:".35rem"}}>Transaction ID</p>
                  <div style={{display:"flex",alignItems:"center",gap:".4rem",background:"#161b22",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"8px",padding:".5rem .7rem"}}>
                    <code style={{flex:1,fontSize:".8rem",wordBreak:"break-all",color:"#58a6ff"}}>{viewInv.txid || viewInv.transactionId}</code>
                    <button className="small-btn" onClick={() => { navigator.clipboard?.writeText(viewInv.txid || viewInv.transactionId || ""); setMessage("Copied!"); }}><Copy className="h-3 w-3" /></button>
                  </div>
                </div>
              )}
            </div>
            {recheckResult && recheckResult.invoiceId === viewInv.id && (
              <div style={{margin:"0 1.25rem .8rem", padding:".75rem .85rem", border:"1px solid rgba(99,102,241,0.2)", borderRadius:"10px", background:"rgba(11,18,32,0.6)", fontSize:".78rem"}}>
                <strong style={{color:"#a5b4fc", display:"block", marginBottom:".4rem"}}>On-chain recheck</strong>
                <div style={{color:"#9CB6C9", lineHeight:1.55}}>
                  <div><span style={{color:"#6b7280"}}>Txs at address:</span> <strong style={{color:"#fff"}}>{recheckResult.txsAtAddress}</strong></div>
                  <div><span style={{color:"#6b7280"}}>Match:</span> <strong style={{color: recheckResult.matchFound ? "#4ade80" : "#f59e0b"}}>{recheckResult.matchFound ? `${recheckResult.matchKind} (${recheckResult.match.amount} / ${recheckResult.match.confirmations} confs)` : "none"}</strong></div>
                  <div><span style={{color:"#6b7280"}}>Action:</span> <strong style={{color:"#fff"}}>{recheckResult.action}</strong></div>
                  {recheckResult.hint && <div style={{marginTop:".35rem", color:"#fbbf24", fontSize:".75rem"}}>{recheckResult.hint}</div>}
                  {recheckResult.txs && recheckResult.txs.length > 0 && (
                    <details style={{marginTop:".5rem"}}>
                      <summary style={{cursor:"pointer", color:"#7dd3fc", fontWeight:600}}>{recheckResult.txs.length} txs found at this address — show all</summary>
                      <div style={{marginTop:".4rem", display:"grid", gap:".3rem"}}>
                        {recheckResult.txs.map((t) => (
                          <div key={t.txHash} style={{fontFamily:"monospace", fontSize:".72rem", color:"#9CB6C9", padding:".35rem .5rem", background:"rgba(2,7,17,0.6)", borderRadius:"6px"}}>
                            <div>{t.amount} (confs: {t.confirmations})</div>
                            <div style={{wordBreak:"break-all", color:"#6d7d99"}}>{t.txHash}</div>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            )}
            <div className="admin-modal-footer">
              {viewInv.status !== "paid" && (
                <button className="small-btn" onClick={() => recheck(viewInv.id)} disabled={recheckBusy === viewInv.id}>
                  {recheckBusy === viewInv.id ? "Checking..." : "Recheck on-chain"}
                </button>
              )}
              {viewInv.status !== "paid" && <button className="primary-btn" onClick={() => markPaid(viewInv.id)}>Mark Paid</button>}
              <button className="small-btn" onClick={() => setViewInv(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <AdminPanel title="Invoices" text="" icon={Wallet} action={
        <div style={{display:"flex",alignItems:"center",gap:".5rem",flexWrap:"wrap"}}>
          <div className="admin-filter-tabs">
            {["all", "pending", "detected", "confirming", "paid", "expired"].map((f) => <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>{f}</button>)}
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{padding:".4rem .65rem",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"8px",background:"#161b22",color:"#f0f6ff",fontSize:".82rem",width:"160px"}} />
        </div>
      }>
        <div className="admin-table">
          <div className="admin-table-head" style={{gridTemplateColumns:"110px 1.2fr 60px 100px 80px 80px auto",minWidth:"700px"}}><span>Invoice</span><span>Customer</span><span>Coin</span><span>Expected</span><span>Status</span><span>Date</span><span>Actions</span></div>
          {filtered.map((inv) => (
            <div className="admin-table-row" key={inv.id} style={{gridTemplateColumns:"110px 1.2fr 60px 100px 80px 80px auto",minWidth:"700px"}}>
              <strong style={{fontSize:".78rem"}}>{inv.id.slice(0, 14)}...</strong>
              <span>{inv.customerEmail || "Unknown"}</span>
              <span>{inv.selectedCoin || "LTC"}</span>
              <code>{String(inv.expectedCryptoAmount ?? "0").slice(0, 12)}</code>
              <StatusBadge status={inv.status} />
              <span>{formatAdminDate(inv.expiresAt)}</span>
              <div className="admin-row-actions">
                <button className="small-btn" onClick={() => setViewInv(inv)}>View</button>
                {inv.status !== "paid" && <button className="small-btn" onClick={() => markPaid(inv.id)}>Pay</button>}
              </div>
            </div>
          ))}
          {!filtered.length && <AdminEmptyState icon={Wallet} title="No invoices found" text="Invoices appear after checkout starts." />}
        </div>
      </AdminPanel>
    </div>
  );
}

function AdminSettings({ data, headers, onChange }) {
  const [tab, setTab] = useState("General");
  const wallets = data.walletAddresses || {};
  const [form, setForm] = useState({
    storeName: data.storeName || "Zyvory Market",
    domain: data.domain || "zyvory.xyz",
    defaultCurrency: data.defaultCurrency || "EUR",
    timezone: data.timezone || "Africa/Lagos",
    discordInvite: data.discordInvite || "",
    paypalEmail: data.paypalEmail || "",
    ltcAddress: wallets.LTC || "",
    btcAddress: wallets.BTC || "",
    solAddress: wallets.SOL || "",
    ethAddress: wallets.ETH || "",
    enabledCoins: data.enabledCoins || ["LTC", "BTC", "SOL", "ETH"],
    invoiceExpirationMins: data.invoiceExpirationMins || 60,
    discordWebhookUrl: data.discordWebhookUrl || "",
    accentColor: data.accentColor || "#00D9FF"
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const toggleCoin = (coin) => {
    setForm(f => ({ ...f, enabledCoins: f.enabledCoins.includes(coin) ? f.enabledCoins.filter(c => c !== coin) : [...f.enabledCoins, coin] }));
  };
  const save = async (e) => {
    e.preventDefault();
    setMessage(""); setError("");
    try {
      await api("/admin/settings", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          storeName: form.storeName,
          domain: form.domain,
          defaultCurrency: form.defaultCurrency,
          timezone: form.timezone,
          discordInvite: form.discordInvite,
          paypalEmail: form.paypalEmail,
          enabledCoins: form.enabledCoins,
          invoiceExpirationMins: Number(form.invoiceExpirationMins),
          discordWebhookUrl: form.discordWebhookUrl,
          accentColor: form.accentColor,
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
  const tabs = ["General", "Payments", "Crypto Wallets", "Notifications"];
  return (
    <div className="admin-content-stack">
      <AdminPageHeader section="settings" title="Settings" subtitle="Configure storefront, payments, wallets, and notifications." />
      {(message || error) && <AdminNotice message={message || error} tone={error ? "error" : "success"} />}
      <AdminPanel title="Store Settings" text="Wallet addresses and API keys are saved in the database. SMTP/Resend credentials are set via server environment variables." icon={Settings}>
        <div className="settings-tabs">{tabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</div>
        <form className="admin-form settings-form" onSubmit={save}>
          {tab === "General" && <>
            <AdminField label="Store name" help="Displayed in checkout, dashboard, and emails."><input value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} /></AdminField>
            <AdminField label="Domain"><input value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} /></AdminField>
            <AdminField label="Support Discord URL"><input value={form.discordInvite} onChange={(e) => setForm({ ...form, discordInvite: e.target.value })} /></AdminField>
            <AdminField label="Default currency"><select value={form.defaultCurrency} onChange={(e) => setForm({ ...form, defaultCurrency: e.target.value })}>{CURRENCIES.map((c) => <option key={c.code}>{c.code}</option>)}</select></AdminField>
            <AdminField label="Timezone"><input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} /></AdminField>
            <AdminField label="Accent color"><input value={form.accentColor} onChange={(e) => setForm({ ...form, accentColor: e.target.value })} /></AdminField>
          </>}
          {tab === "Payments" && <>
            <p style={{fontSize:"0.8rem",color:"#8b949e",margin:"0 0 0.75rem"}}>Toggle which payment methods are available at checkout.</p>
            {["LTC", "BTC", "SOL", "ETH"].map((coin) => <label className="admin-toggle" key={coin}><span>{coin}</span><input type="checkbox" checked={form.enabledCoins.includes(coin)} onChange={() => toggleCoin(coin)} /></label>)}
            <AdminField label="PayPal email (Friends & Family)" help="Leave empty to disable PayPal."><input value={form.paypalEmail} onChange={(e) => setForm({ ...form, paypalEmail: e.target.value })} placeholder="paypal@example.com" /></AdminField>
            <AdminField label="Invoice expiration (minutes)"><input type="number" value={form.invoiceExpirationMins} onChange={(e) => setForm({ ...form, invoiceExpirationMins: e.target.value })} /></AdminField>
          </>}
          {tab === "Crypto Wallets" && <>
            <p style={{fontSize:"0.8rem",color:"#8b949e",margin:"0 0 0.75rem"}}>Fallback addresses used when address pools are empty. Pools are configured via server env vars.</p>
            <AdminField label="Litecoin (LTC) Address" wide><input value={form.ltcAddress} onChange={(e) => setForm({ ...form, ltcAddress: e.target.value })} /></AdminField>
            <AdminField label="Bitcoin (BTC) Address" wide><input value={form.btcAddress} onChange={(e) => setForm({ ...form, btcAddress: e.target.value })} /></AdminField>
            <AdminField label="Solana (SOL) Address" wide><input value={form.solAddress} onChange={(e) => setForm({ ...form, solAddress: e.target.value })} /></AdminField>
            <AdminField label="Ethereum (ETH) Address" wide><input value={form.ethAddress} onChange={(e) => setForm({ ...form, ethAddress: e.target.value })} /></AdminField>
          </>}
          {tab === "Notifications" && <>
            <AdminField label="Discord webhook URL" wide help="Receives new order and payment confirmation notifications."><input value={form.discordWebhookUrl} onChange={(e) => setForm({ ...form, discordWebhookUrl: e.target.value })} placeholder="https://discord.com/api/webhooks/..." /></AdminField>
            <p style={{fontSize:"0.8rem",color:"#8b949e",margin:"0.5rem 0"}}>Email delivery (SMTP / Resend) is configured via server environment variables for security. See <code>.env.example</code>.</p>
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
      setShowForm(false);
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

  const [showForm, setShowForm] = useState(false);
  const openNew = () => { reset(); setShowForm(true); };
  const openEdit = (product) => {
    setEditingId(product.id);
    setForm(productToForm(product));
    setImageFile(null);
    setImagePreview("");
    setMessage("");
    setError("");
    setShowForm(true);
  };
  const openDuplicate = (product) => { setEditingId(""); setForm(productToForm({ ...product, name: `${product.name} Copy`, slug: "" })); setShowForm(true); };

  return (
    <div className="admin-content-stack">
      <AdminPageHeader section="products" title="Products" subtitle="Create, edit, stock, and organize digital products." action={<button className="primary-btn" onClick={openNew}><Plus className="h-4 w-4" /> Add Product</button>} />

      {(message || error) && <AdminNotice message={message || error} tone={error ? "error" : "success"} />}

      {showForm && (
        <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="admin-modal" style={{maxWidth:"640px"}}>
            <div className="admin-modal-header">
              <h2>{editing ? "Edit Product" : "New Product"}</h2>
              <button className="admin-modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={submit}>
              <div className="admin-modal-body">
                <div className="admin-form">
                  <div className="admin-form-section-title">Basic information</div>
                  <AdminField label="Product name">
                    <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Product name" />
                  </AdminField>
                  <AdminField label="Category">
                    <select required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                      <option value="">Select category</option>
                      {catNames.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </AdminField>
                  <div className="admin-form-section-title">Pricing & stock</div>
                  <AdminField label="Price">
                    <input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                  </AdminField>
                  <AdminField label="Currency">
                    <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                      {CURRENCIES.map((c) => <option key={c.code}>{c.code}</option>)}
                    </select>
                  </AdminField>
                  <AdminField label="Stock Count">
                    <input type="number" min="0" value={form.stockCount} onChange={(e) => setForm({ ...form, stockCount: e.target.value })} />
                  </AdminField>
                  <AdminField label="Status">
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      <option>active</option><option>draft</option><option>hidden</option>
                    </select>
                  </AdminField>
                  <AdminField label="Badge">
                    <input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="Popular" />
                  </AdminField>
                  <AdminField label="Delivery type">
                    <select value={form.deliveryType} onChange={(e) => setForm({ ...form, deliveryType: e.target.value })}>
                      <option>license key</option><option>file download</option><option>account credentials</option><option>private link</option><option>manual delivery</option>
                    </select>
                  </AdminField>
                  <div className="admin-form-section-title">Media</div>
                  <AdminField label="Product Image" wide>
                    <div style={{display:"flex",alignItems:"center",gap:".75rem"}}>
                      <label className="upload-area">
                        <Upload className="h-4 w-4" />
                        <span>Upload</span>
                        <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                      </label>
                      {currentPreview && <img src={currentPreview} alt="Preview" style={{width:"56px",height:"56px",borderRadius:"8px",objectFit:"cover",border:"1px solid rgba(255,255,255,0.08)"}} />}
                    </div>
                    <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="Or paste image URL..." style={{marginTop:".5rem"}} />
                  </AdminField>
                  <div className="admin-form-section-title">Description</div>
                  <AdminField label="Short description" wide>
                    <input value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} placeholder="Short card description" />
                  </AdminField>
                  <AdminField label="Full description" wide>
                    <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Full product page description" />
                  </AdminField>
                  <AdminField label="Features" wide help="One feature per line.">
                    <textarea value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} placeholder={"Instant delivery\nDashboard access"} />
                  </AdminField>
                  <div className="admin-form-section-title">SEO</div>
                  <AdminField label="Slug">
                    <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="chatgpt-plus" />
                  </AdminField>
                  <AdminField label="Meta title">
                    <input value={form.metaTitle} onChange={(e) => setForm({ ...form, metaTitle: e.target.value })} />
                  </AdminField>
                  <AdminField label="Meta description" wide>
                    <input value={form.metaDescription} onChange={(e) => setForm({ ...form, metaDescription: e.target.value })} />
                  </AdminField>
                </div>
              </div>
              <div className="admin-modal-footer">
                <button type="button" className="small-btn" onClick={() => setShowForm(false)}>Cancel</button>
                <button className="primary-btn">{editing ? "Save Product" : "Create Product"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AdminPanel title="Products" text={`${products.length} products`} icon={Package} action={
        <div style={{display:"flex",alignItems:"center",gap:".5rem",flexWrap:"wrap"}}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." style={{padding:".4rem .65rem",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"8px",background:"#161b22",color:"#f0f6ff",fontSize:".82rem",width:"160px"}} />
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{padding:".4rem .5rem",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"8px",background:"#161b22",color:"#c9d1d9",fontSize:".82rem"}}><option value="all">All categories</option>{catNames.map((n) => <option key={n}>{n}</option>)}</select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{padding:".4rem .5rem",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"8px",background:"#161b22",color:"#c9d1d9",fontSize:".82rem"}}><option value="all">All</option><option>active</option><option>draft</option><option>hidden</option></select>
        </div>
      }>
        <div className="admin-list">
          {filteredProducts.map((product) => (
            <div className="admin-product-row" key={product.id}>
              {product.image ? <img src={product.image} alt={product.name} /> : <div className="admin-product-noimg"><Package className="h-5 w-5" style={{color:"#484f58"}} /></div>}
              <div>
                <strong>{product.name}</strong>
                <span>{product.category} · {money(product.price)} · {product.stockCount ?? 0} stock</span>
              </div>
              <StatusBadge status={product.status || "active"} />
              <div className="admin-row-actions">
                <button className="small-btn" onClick={() => openEdit(product)}>Edit</button>
                <button className="small-btn" onClick={() => openDuplicate(product)}>Dupe</button>
                <button className="small-btn danger" onClick={() => remove(product)}><Trash2 className="h-3 w-3" /></button>
              </div>
            </div>
          ))}
          {products.length === 0 && <AdminEmptyState icon={Package} title="No products yet" text="Create your first digital product." action={<button className="primary-btn" onClick={openNew}>Add Product</button>} />}
        </div>
      </AdminPanel>
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
  const [showModal, setShowModal] = useState(false);

  const resetCat = () => { setEditingId(null); setName(""); setTag(""); setCatImageFile(null); setCatImagePreview(""); setError(""); };
  const openNew = () => { resetCat(); setShowModal(true); };
  const openEdit = (cat) => { setEditingId(cat.id); setName(cat.name || cat); setTag(cat.tag || ""); setCatImageFile(null); setCatImagePreview(cat.image || ""); setError(""); setMessage(""); setShowModal(true); };
  const closeModal = () => { setShowModal(false); resetCat(); };

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
      closeModal();
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
      <AdminPageHeader section="categories" title="Categories" subtitle="Organize storefront browse groups." action={<button className="primary-btn" onClick={openNew}><Plus className="h-4 w-4" /> New Category</button>} />

      {(message || error) && <AdminNotice message={message || error} tone={error ? "error" : "success"} />}

      {showModal && (
        <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="admin-modal" style={{maxWidth:"460px"}}>
            <div className="admin-modal-header">
              <h2>{editingId ? "Edit Category" : "New Category"}</h2>
              <button className="admin-modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={submit}>
              <div className="admin-modal-body" style={{display:"grid",gap:".75rem"}}>
                <label className="field">
                  <span>Category name</span>
                  <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CS2 Prime Accounts" />
                </label>
                <label className="field">
                  <span>Filter tag</span>
                  <select value={tag} onChange={(e) => setTag(e.target.value)}>
                    <option value="">— No tag —</option>
                    {browseCategories.map((bc) => <option key={bc.name} value={bc.name}>{bc.name}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>Category image</span>
                  <div style={{display:"flex",alignItems:"center",gap:".75rem"}}>
                    <label className="upload-area small">
                      <Upload className="h-4 w-4" />
                      <span>Upload</span>
                      <input type="file" accept="image/*" onChange={handleCatImage} className="hidden" />
                    </label>
                    {catImagePreview && <img src={catImagePreview} alt="Preview" style={{width:"40px",height:"40px",borderRadius:"6px",objectFit:"cover",border:"1px solid rgba(255,255,255,0.08)"}} />}
                  </div>
                </label>
              </div>
              <div className="admin-modal-footer">
                <button type="button" className="small-btn" onClick={closeModal}>Cancel</button>
                <button className="primary-btn">{editingId ? "Save" : "Create"} Category</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AdminPanel title="Categories" text={`${categories.length} categories`} icon={Boxes}>
        <div className="admin-list">
          {categories.map((cat) => {
            const catName = cat.name || cat;
            const count = products.filter((p) => p.category === catName).length;
            return (
              <div className="admin-category-row" key={cat.id || catName}>
                {cat.image ? <img src={cat.image} alt={catName} style={{width:"36px",height:"36px",borderRadius:"6px",objectFit:"cover"}} /> : <div style={{width:"36px",height:"36px",borderRadius:"6px",background:"#161b22",display:"flex",alignItems:"center",justifyContent:"center"}}><Boxes className="h-4 w-4" style={{color:"#484f58"}} /></div>}
                <div>
                  <strong>{catName}</strong>
                  <span>{count} product{count === 1 ? "" : "s"}{cat.tag ? ` · ${cat.tag}` : ""}</span>
                </div>
                <div className="admin-row-actions">
                  <button className="small-btn" onClick={() => openEdit(cat)}>Edit</button>
                  <button className="small-btn danger" onClick={() => remove(cat)}><Trash2 className="h-3 w-3" /></button>
                </div>
              </div>
            );
          })}
          {categories.length === 0 && <AdminEmptyState icon={Boxes} title="No categories" text="Create your first category." action={<button className="primary-btn" onClick={openNew}>Add Category</button>} />}
        </div>
      </AdminPanel>
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
          <a href={DISCORD_URL} className="faq-support-button">
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

// ── Reusable premium page hero shared across new pages ──
function PageHero({ eyebrow, title, lede, icon: Icon, children }) {
  return (
    <section className="page-hero">
      <div className="page-hero-bg" aria-hidden="true" />
      <div className="page-hero-glow" aria-hidden="true" />
      <div className="container-shell page-hero-inner">
        {Icon && (
          <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="page-hero-icon">
            <Icon className="h-8 w-8" />
          </motion.div>
        )}
        {eyebrow && <p className="page-hero-eyebrow">{eyebrow}</p>}
        <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="page-hero-title">{title}</motion.h1>
        {lede && <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }} className="page-hero-lede">{lede}</motion.p>}
        {children && <div className="page-hero-children">{children}</div>}
      </div>
    </section>
  );
}

function PolicyPage({ type }) {
  const isTerms = type === "terms";
  useDocumentTitle(isTerms ? "Terms of Service" : "Privacy Policy");
  return (
    <div>
      <PageHero eyebrow="Policy" title={isTerms ? "Terms of Service" : "Privacy Policy"} lede={isTerms ? "The rules of using the Zyvora marketplace." : "How we collect, use, and protect your data."} icon={FileText} />
      <section className="mx-auto max-w-4xl px-4 py-12">
        <div className="policy-copy">
          {isTerms ? (
            <>
              <p>Digital products are delivered electronically. Customers are responsible for confirming product compatibility before purchase.</p>
              <p>Crypto invoices must be paid with the exact amount before expiration. Underpaid, overpaid, failed, or expired invoices require support review.</p>
              <p>Refunds are handled case by case for invalid stock, duplicate delivery, or products that cannot be replaced.</p>
            </>
          ) : (
            <>
              <p>Private keys, seed phrases, wallet secrets, API secrets, and SMTP credentials belong only in server environment variables.</p>
              <p>Payment checks are performed on the backend. Admin access requires authentication and should be served over HTTPS in production.</p>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function SupportPage() {
  useDocumentTitle("Support — Get Help", "Get help from Zyvora support. Discord tickets, order tracking, FAQ, and dashboard access.");
  const cards = [
    { icon: MessageCircle, title: "Discord Support", desc: "Open a ticket with your invoice ID and email. Replies typically in under 10 minutes.", href: DISCORD_URL, external: true, badge: "Fastest" },
    { icon: Package, title: "Track Order", desc: "Look up the status of any order using your Order ID or checkout email.", href: "/track" },
    { icon: UserCircle, title: "Customer Dashboard", desc: "Sign in with your email to view all orders, downloads, balance, and reviews.", href: "/dashboard" },
    { icon: HelpCircle, title: "FAQ", desc: "Common questions about payments, delivery, replacements, and account security.", href: "/faq" },
    { icon: ShieldCheck, title: "Refund Policy", desc: "How replacements, refunds, and disputes are handled for digital goods.", href: "/refund" },
    { icon: FileText, title: "Terms & Privacy", desc: "Read our Terms of Service and Privacy Policy.", href: "/terms" }
  ];
  return (
    <div>
      <PageHero eyebrow="Support" title="How can we help?" lede="Pick the channel that fits your question. Our team is online 24/7 on Discord." />
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            const Wrap = card.external ? "a" : Link;
            const extra = card.external ? { target: "_blank", rel: "noopener noreferrer" } : {};
            return (
              <Wrap key={card.title} className="support-card" href={card.href} {...extra}>
                <ExternalLink className="support-card-arrow h-4 w-4" />
                <span className="support-card-icon"><Icon className="h-6 w-6" /></span>
                <h3>{card.title}</h3>
                <p>{card.desc}</p>
                {card.badge && <span className="support-card-badge">{card.badge}</span>}
              </Wrap>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function TrackOrderPage() {
  useDocumentTitle("Track Order", "Look up the status of any order using your Order ID and email.");
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const lookup = async (e) => {
    e.preventDefault();
    setError(""); setResult(null);
    if (!orderId.trim() && !email.trim()) { setError("Enter your Order ID or Email."); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (orderId.trim()) params.set("orderId", orderId.trim());
      if (email.trim()) params.set("email", email.trim());
      const res = await api(`/track?${params.toString()}`);
      if (!res?.found) { setError("No order found with those details. Check your spelling or sign in to your dashboard."); return; }
      setResult(res);
    } catch (err) {
      setError(err.message || "Lookup failed. Please try again.");
    } finally { setLoading(false); }
  };

  const statusMeta = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "completed" || s === "paid" || s === "delivered") return { color: "#22c55e", icon: CheckCircle2, label: "Completed" };
    if (s === "awaiting_payment" || s === "pending" || s === "unpaid") return { color: "#f59e0b", icon: Clock, label: "Awaiting payment" };
    if (s === "expired" || s === "failed" || s === "cancelled") return { color: "#ef4444", icon: AlertTriangle, label: status };
    return { color: "#60a5fa", icon: Package, label: status || "Processing" };
  };

  const order = result?.order;
  const invoice = result?.invoice;
  const meta = statusMeta(order?.status || invoice?.status);
  const StatusIcon = meta.icon;

  return (
    <div>
      <PageHero eyebrow="Order Lookup" title="Track Your Order" lede="Enter the Order ID we sent in your delivery email, or the email used at checkout." />
      <section className="mx-auto max-w-5xl px-4 py-12 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <form className="panel-glass p-6 md:p-8 grid gap-4" onSubmit={lookup}>
          <div className="flex items-center gap-3 mb-2">
            <span className="track-input-icon"><Search className="h-5 w-5" /></span>
            <div>
              <h3 className="text-lg font-bold text-white">Order Lookup</h3>
              <p className="text-xs text-[#9CB6C9]">We never share or expose customer data.</p>
            </div>
          </div>
          <label className="field">
            <span>Order ID</span>
            <input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="ORD-XXXX or full UUID" autoComplete="off" />
          </label>
          <div className="track-divider"><span>or</span></div>
          <label className="field">
            <span>Email used at checkout</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" autoComplete="email" />
          </label>
          <button className="primary-btn" disabled={loading}>{loading ? "Looking up..." : <><Search className="h-4 w-4" /> Track Order</>}</button>
          {error && <div className="error-box flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> {error}</div>}
          <div className="track-hint">
            <Lock className="h-3.5 w-3.5" />
            Need more details? <Link href="/dashboard">Sign in to dashboard</Link> or <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer">contact support</a>.
          </div>
        </form>

        <div className="track-result-pane">
          {!result && (
            <div className="panel-glass p-8 text-center track-empty">
              <div className="track-empty-icon"><Package className="h-8 w-8" /></div>
              <h3>Your order details will appear here</h3>
              <p>Once we find your order, you'll see its status, amount, and how to access it.</p>
              <div className="track-empty-features">
                <span><ShieldCheck className="h-4 w-4" /> Privacy-safe</span>
                <span><Zap className="h-4 w-4" /> Live status</span>
                <span><Clock className="h-4 w-4" /> 24/7 lookup</span>
              </div>
            </div>
          )}
          {result && (
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="panel-glass p-6 md:p-7 track-result">
              <div className="track-result-header">
                <span className="track-result-status" style={{ color: meta.color, background: `${meta.color}1a`, borderColor: `${meta.color}40` }}>
                  <StatusIcon className="h-4 w-4" /> {meta.label}
                </span>
                <strong>Order Found</strong>
              </div>
              <dl className="track-result-grid">
                <div><dt>Order ID</dt><dd className="font-mono">{order?.id || invoice?.id}</dd></div>
                {order?.invoiceId && <div><dt>Invoice ID</dt><dd className="font-mono">{order.invoiceId}</dd></div>}
                <div><dt>Total</dt><dd>{money(order?.totalUsd || invoice?.totalUsd || 0)}</dd></div>
                {invoice?.selectedCoin && <div><dt>Paid in</dt><dd>{invoice.selectedCoin}</dd></div>}
                {order?.itemCount != null && <div><dt>Items</dt><dd>{order.itemCount}</dd></div>}
                <div><dt>Created</dt><dd>{new Date(order?.createdAt || invoice?.createdAt).toLocaleString()}</dd></div>
              </dl>
              <div className="track-result-actions">
                <Link href={`/dashboard?email=${encodeURIComponent(email)}`} className="primary-btn"><UserCircle className="h-4 w-4" /> Open in Dashboard</Link>
                {invoice?.id && <Link href={`/invoice/${invoice.id}`} className="secondary-btn"><FileText className="h-4 w-4" /> View Invoice</Link>}
              </div>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}

function FaqPage() {
  useDocumentTitle("FAQ", "Frequently asked questions about payments, delivery, refunds and support.");
  return (
    <div>
      <PageHero eyebrow="Help" title="Frequently Asked Questions" lede="Quick answers to the most common questions about payments, delivery, refunds, and account safety." icon={HelpCircle} />
      <FaqSection />
    </div>
  );
}

function RefundPage() {
  useDocumentTitle("Refund Policy", "Our policy on refunds, replacements, and disputes for digital products.");
  const sections = [
    { icon: ShieldCheck, color: "#22c55e", title: "Replacements available for", items: ["Invalid stock or expired accounts", "Duplicate delivery of the same item", "Accounts that cannot be accessed on first login", "License keys that fail to activate", "Files that are corrupted or incomplete"] },
    { icon: MessageCircle, color: "#60a5fa", title: "How to request a replacement", items: ["Open a Discord support ticket with your Order ID and email", "Include a short video or screenshot showing the issue", "Most replacements are processed within 30 minutes", "If we cannot replace, store credit is added to your balance"] },
    { icon: AlertTriangle, color: "#f59e0b", title: "Not covered", items: ["Bans caused by user actions or misuse", "Products incompatible with your setup if specs were listed", "Buyer's remorse or wrong-item purchases", "Items used outside their intended scope"] },
    { icon: Lock, color: "#ef4444", title: "Chargebacks & disputes", items: ["Always contact support first — we resolve almost all issues in minutes", "Filing a chargeback results in a permanent ban from the store and Discord", "Confirmed crypto payments cannot be reversed; we replace faulty items instead"] }
  ];
  return (
    <div>
      <PageHero eyebrow="Policy" title="Refund & Replacement Policy" lede="Digital products are final once delivered. Here's how we handle issues fairly and quickly." icon={ShieldCheck} />
      <section className="mx-auto max-w-5xl px-4 py-12 grid gap-5">
        <div className="policy-callout">
          <Info className="h-5 w-5" />
          <div><strong>Digital goods are non-returnable.</strong> We do not refund for buyer's remorse, wrong purchases, or items that work as described. We <em>do</em> replace anything faulty — see below.</div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((sec) => {
            const Icon = sec.icon;
            return (
              <div key={sec.title} className="policy-card">
                <div className="policy-card-head">
                  <span className="policy-card-icon" style={{ background: `${sec.color}1a`, color: sec.color, borderColor: `${sec.color}40` }}><Icon className="h-5 w-5" /></span>
                  <h3>{sec.title}</h3>
                </div>
                <ul>
                  {sec.items.map((it) => (<li key={it}><CheckCircle2 className="h-4 w-4" style={{ color: sec.color }} />{it}</li>))}
                </ul>
              </div>
            );
          })}
        </div>
        <div className="policy-cta">
          <div><strong>Have an issue with an order?</strong><span>Our support team is online 24/7 on Discord — average reply under 10 minutes.</span></div>
          <a className="primary-btn" href={DISCORD_URL} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" /> Open Support Ticket</a>
        </div>
      </section>
    </div>
  );
}

function CookiesPage() {
  useDocumentTitle("Cookie Policy", "How we use cookies and similar technologies on Zyvora.");
  const groups = [
    { color: "#22c55e", icon: ShieldCheck, title: "Strictly necessary", desc: "These keep your cart, login session, and currency preference. The site does not function without them.", items: [
      ["zyvory-cart", "Items in your cart"],
      ["zyvory-admin-token", "Admin session (only set for admins)"],
      ["zyvory-wishlist", "Items you saved for later"],
      ["zyvory-recent-products", "Your recently viewed products"],
      ["zyvory-cookie-consent", "Remembers you've accepted this notice"]
    ]},
    { color: "#60a5fa", icon: Eye, title: "Analytics", desc: "We do not currently use third-party analytics, advertising, or tracking cookies.", items: [] },
    { color: "#a78bfa", icon: Settings, title: "Your choices", desc: "You can clear cookies any time from your browser settings. Clearing them will empty your cart and sign you out of the dashboard.", items: [] }
  ];
  return (
    <div>
      <PageHero eyebrow="Policy" title="Cookie Policy" lede="How we use cookies and local storage on Zyvora. Plain language, no fine print." icon={ShieldCheck} />
      <section className="mx-auto max-w-5xl px-4 py-12 grid gap-5">
        {groups.map((g) => {
          const Icon = g.icon;
          return (
            <div key={g.title} className="policy-card">
              <div className="policy-card-head">
                <span className="policy-card-icon" style={{ background: `${g.color}1a`, color: g.color, borderColor: `${g.color}40` }}><Icon className="h-5 w-5" /></span>
                <div>
                  <h3>{g.title}</h3>
                  <p className="policy-card-sub">{g.desc}</p>
                </div>
              </div>
              {g.items.length > 0 && (
                <div className="cookie-key-list">
                  {g.items.map(([key, label]) => (
                    <div className="cookie-key-row" key={key}>
                      <code>{key}</code>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}

function CategoriesPage() {
  useDocumentTitle("Categories", "Browse digital products by category — accounts, games, tools, methods, and more.");
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  useEffect(() => {
    api("/categories").then(setCategories).catch(() => setCategories([]));
    api("/products").then(setProducts).catch(() => setProducts([]));
  }, []);
  const totalProducts = products.length;
  const totalCategories = browseCategories.length;
  const visible = browseCategories.filter((b) => !search.trim() || b.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <PageHero eyebrow="Browse" title="All Categories" lede="Pick a category to explore everything we stock — from gaming accounts to scripts and tools.">
        <div className="page-hero-stats">
          <div><strong>{totalCategories}</strong><span>Categories</span></div>
          <div><strong>{totalProducts}+</strong><span>Products</span></div>
          <div><strong>24/7</strong><span>Support</span></div>
        </div>
      </PageHero>
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="categories-toolbar">
          <label className="categories-search">
            <Search className="h-4 w-4" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search categories..." />
          </label>
          <Link href="/products" className="secondary-btn"><Package className="h-4 w-4" /> All Products</Link>
        </div>
        <div className="zy-category-grid mt-6">
          {visible.map((item, idx) => {
            const Icon = item.icon || categoryIcons[item.category] || Boxes;
            const c = item.color || "#6366f1";
            const count = products.filter((p) => {
              const cat = categories.find((cc) => cc.name === p.category);
              return cat?.tag === item.name;
            }).length;
            return (
              <motion.div key={item.name} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: Math.min(idx * 0.03, 0.4) }} whileHover={{ y: -6 }}>
                <Link href={`/products?filter=${encodeURIComponent(item.name)}`} className="zy-category-card" style={{"--cat-color": c}}>
                  <span className={item.brand ? "category-logo brand-logo" : "category-logo"} style={{color: c, filter: `drop-shadow(0 0 12px ${c}40)`}}>
                    {item.brand ? <BrandIcon icon={item.brand} /> : <Icon className="h-11 w-11" strokeWidth={2.15} />}
                  </span>
                  <span>{item.name}</span>
                  <span className="zy-cat-count">{count} item{count === 1 ? "" : "s"}</span>
                </Link>
              </motion.div>
            );
          })}
          {visible.length === 0 && (
            <div className="col-span-full text-center py-12 text-[#9CB6C9]">No categories match "{search}".</div>
          )}
        </div>
      </section>
    </div>
  );
}

function BrowseCategoryPage({ category }) {
  const decoded = decodeURIComponent(category || "");
  useDocumentTitle(decoded, `Browse all ${decoded} products with instant delivery on ${SITE_NAME}.`);
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.location.replace(`/products?filter=${encodeURIComponent(decoded)}`);
    }
  }, [decoded]);
  return <Loading />;
}

function CookieConsentBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try { if (!localStorage.getItem(COOKIE_CONSENT_KEY)) setShow(true); } catch {}
  }, []);
  const accept = () => {
    try { localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({ accepted: true, at: Date.now() })); } catch {}
    setShow(false);
  };
  if (!show) return null;
  return (
    <div className="cookie-banner" role="dialog" aria-label="Cookie notice">
      <div className="cookie-banner-inner">
        <span className="cookie-banner-icon"><ShieldCheck className="h-5 w-5" /></span>
        <div className="cookie-text">
          <strong>We use essential cookies</strong>
          <span>Only to keep your cart, session and preferences. No tracking, no ads. <Link href="/cookies">Learn more</Link>.</span>
        </div>
        <div className="cookie-actions">
          <button className="small-btn" onClick={accept}>Decline</button>
          <button className="primary-btn" onClick={accept}><CheckCircle2 className="h-4 w-4" /> Accept</button>
        </div>
      </div>
    </div>
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
              <span className="brand-name">{SITE_NAME}</span>
              <span className="brand-subtitle">Digital Market</span>
            </span>
          </Link>
          <p className="mt-5 max-w-md text-sm leading-7 text-[#9CB6C9]">
            Premium digital products, crypto invoices, protected delivery records, and a customer dashboard built for serious gaming commerce.
          </p>
        </div>
        <div className="footer-columns">
          <div className="footer-col">
            <h4>Shop</h4>
            <Link href="/products">All Products</Link>
            <Link href="/categories">Categories</Link>
            <Link href="/cart">Cart</Link>
            <Link href="/dashboard">My Dashboard</Link>
          </div>
          <div className="footer-col">
            <h4>Support</h4>
            <Link href="/track">Track Order</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/support">Contact</Link>
            <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer">Discord</a>
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/refund">Refund Policy</Link>
            <Link href="/cookies">Cookies</Link>
          </div>
        </div>
      </div>
      <div className="container-shell footer-bottom">
        <span>© {new Date().getFullYear()} {SITE_NAME}. All rights reserved.</span>
        <span>Secure checkout. Server-side payment verification.</span>
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
  useDocumentTitle("Page not found");
  return (
    <section className="mx-auto max-w-3xl px-4 py-20 text-center">
      <div className="text-7xl font-black bg-clip-text" style={{background:"linear-gradient(135deg,#60a5fa,#a78bfa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>404</div>
      <h1 className="mt-4 text-3xl font-black text-white">Page not found</h1>
      <p className="mt-3 text-[#9CB6C9]">The page you're looking for doesn't exist or has been moved.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="primary-btn"><ChevronLeft className="h-4 w-4" /> Back Home</Link>
        <Link href="/products" className="secondary-btn"><Package className="h-4 w-4" /> Browse Products</Link>
        <Link href="/track" className="secondary-btn"><Search className="h-4 w-4" /> Track Order</Link>
        <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="secondary-btn"><MessageCircle className="h-4 w-4" /> Support</a>
      </div>
      <div className="mt-12">
        <p className="text-xs uppercase tracking-wider text-[#5e6f86] mb-4">Popular sections</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href="/categories" className="nav-link">Categories</Link>
          <Link href="/faq" className="nav-link">FAQ</Link>
          <Link href="/dashboard" className="nav-link">Dashboard</Link>
          <Link href="/cart" className="nav-link">Cart</Link>
          <Link href="/support" className="nav-link">Support</Link>
        </div>
      </div>
    </section>
  );
}

const rootElement = document.getElementById("root");
const appRoot = window.__zyvoryRoot || createRoot(rootElement);
window.__zyvoryRoot = appRoot;
appRoot.render(<App />);
