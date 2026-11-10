import { createBrowserRouter, RouterProvider, NavLink, Outlet } from 'react-router';
import { useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  useIsMobile,
} from '@databricks/appkit-ui/react';
import { ArrowRight, BookOpen, Database, FileText, Home, Menu, MessageSquare, ShieldCheck } from 'lucide-react';
import { CatalogPage } from './pages/catalog/CatalogPage';
import { AskPage } from './pages/ask/AskPage';
import { GlossaryPage } from './pages/glossary/GlossaryPage';
import { PagesPage } from './pages/pages/PagesPage';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive
      ? 'bg-primary text-primary-foreground'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  }`;

const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive
      ? 'bg-primary text-primary-foreground'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  }`;

type NavLinkClassFn = (props: { isActive: boolean }) => string;

function NavLinks({ className, linkClass, onClick }: { className?: string; linkClass: NavLinkClassFn; onClick?: () => void }) {
  return (
    <nav className={className} aria-label="Main navigation">
      <NavLink to="/" end className={linkClass} onClick={onClick}>
        <Home size={16} aria-hidden="true" /> Home
      </NavLink>
      <NavLink to="/ask" className={linkClass} onClick={onClick}>
        <MessageSquare size={16} aria-hidden="true" /> Ask
      </NavLink>
      <NavLink to="/catalog" className={linkClass} onClick={onClick}>
        <Database size={16} aria-hidden="true" /> Catalog
      </NavLink>
      <NavLink to="/glossary" className={linkClass} onClick={onClick}>
        <BookOpen size={16} aria-hidden="true" /> Glossary
      </NavLink>
      <NavLink to="/pages" className={linkClass} onClick={onClick}>
        <FileText size={16} aria-hidden="true" /> Prepare Pages export
      </NavLink>
    </nav>
  );
}

function BrandLogo() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    <img
      src="/capgemini-logo.png"
      alt="Capgemini"
      className="h-6 w-auto shrink-0 pr-4 border-r"
      onError={() => setVisible(false)}
    />
  );
}

function Layout() {
  const isMobile = useIsMobile();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:p-3">Skip to content</a>
      <header className="border-t-4 border-t-primary border-b bg-card px-4 md:px-6 py-3 flex flex-wrap items-center gap-4">
        <BrandLogo />
        <h1 className="text-lg font-semibold text-foreground">Catalog Manager</h1>
        {/* Desktop nav — hidden below md breakpoint */}
        <NavLinks className="hidden md:flex gap-1" linkClass={navLinkClass} />
        {/* Mobile nav — visible below md breakpoint */}
        <div className="ml-auto md:hidden">
          {/* Gate on isMobile so the portaled sheet can't linger on desktop
              (replaces a set-state-in-effect reset). */}
          <Sheet open={mobileNavOpen && isMobile} onOpenChange={setMobileNavOpen}>
            <Button variant="ghost" size="icon" onClick={() => setMobileNavOpen(true)}>
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open navigation</span>
            </Button>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <NavLinks className="flex flex-col gap-1" linkClass={mobileNavLinkClass} onClick={() => setMobileNavOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/ask', element: <AskPage /> },
      { path: '/catalog', element: <CatalogPage /> },
      { path: '/glossary', element: <GlossaryPage /> },
      { path: '/pages', element: <PagesPage /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}

function HomePage() {
  const items = [
    { to: '/ask', icon: MessageSquare, title: 'Ask your data', text: 'Explore accessible data and published business definitions with Genie One. Inspect the SQL behind each answer.' },
    { to: '/catalog', icon: Database, title: 'Catalog', text: 'Browse data, improve table and column descriptions, and set classification tags.' },
    { to: '/glossary', icon: BookOpen, title: 'Glossary', text: 'Create shared business definitions for your team. Terms are not automatically published to Genie.' },
    { to: '/pages', icon: FileText, title: 'Prepare Pages export', text: 'Export glossary terms for human-reviewed import and publication in Databricks Discover.' },
  ];
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="rounded-2xl border border-primary/20 bg-accent p-6 md:p-10">
        <p className="flex items-center gap-2 text-sm font-semibold text-primary mb-4"><ShieldCheck size={18} aria-hidden="true" /> Financial crime workspace</p>
        <h2 className="text-3xl md:text-4xl font-bold mb-3 text-foreground">Understand your data. Share its meaning.</h2>
        <p className="text-lg text-muted-foreground max-w-2xl">Ask a question, explore your catalog, or help your team speak the same business language.</p>
        <NavLink to="/ask" className="inline-flex items-center gap-2 mt-6 rounded-md bg-primary text-primary-foreground px-4 py-2 font-medium">Start with a question <ArrowRight size={16} aria-hidden="true" /></NavLink>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {items.map((i) => (
          <NavLink key={i.to} to={i.to} className="group rounded-xl">
            <Card className="h-full border-t-4 border-t-primary/50 hover:border-primary hover:shadow-md transition-shadow">
              <CardHeader>
                <span className="w-fit rounded-lg bg-accent p-3 text-primary"><i.icon size={22} aria-hidden="true" /></span>
                <CardTitle>{i.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-4"><p>{i.text}</p><p className="flex items-center gap-2 text-primary font-medium">Open {i.title.toLowerCase()} <ArrowRight size={16} aria-hidden="true" /></p></CardContent>
            </Card>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
