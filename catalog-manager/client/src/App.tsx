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
import { Menu } from 'lucide-react';
import { CatalogPage } from './pages/catalog/CatalogPage';
import { AskPage } from './pages/ask/AskPage';
import { GlossaryPage } from './pages/glossary/GlossaryPage';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
    isActive
      ? 'bg-primary text-primary-foreground'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  }`;

const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive
      ? 'bg-primary text-primary-foreground'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  }`;

type NavLinkClassFn = (props: { isActive: boolean }) => string;

function NavLinks({ className, linkClass, onClick }: { className?: string; linkClass: NavLinkClassFn; onClick?: () => void }) {
  return (
    <nav className={className}>
      <NavLink to="/" end className={linkClass} onClick={onClick}>
        Home
      </NavLink>
      <NavLink to="/ask" className={linkClass} onClick={onClick}>
        Ask
      </NavLink>
      <NavLink to="/catalog" className={linkClass} onClick={onClick}>
        Catalog
      </NavLink>
      <NavLink to="/glossary" className={linkClass} onClick={onClick}>
        Glossary
      </NavLink>
    </nav>
  );
}

function Layout() {
  const isMobile = useIsMobile();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b px-4 md:px-6 py-3 flex items-center gap-4">
        <h1 className="text-lg font-semibold text-foreground">catalog-manager</h1>
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

      <main className="flex-1 p-4 md:p-6">
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
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}

function HomePage() {
  const items = [
    { to: '/ask', title: 'Ask your data', text: 'Ask questions in natural language and see the SQL behind each answer.' },
    { to: '/catalog', title: 'Catalog', text: 'Edit table and column descriptions and set data classification.' },
    { to: '/glossary', title: 'Glossary', text: 'Define business terms that Genie uses to interpret questions.' },
  ];
  return (
    <div className="max-w-3xl mx-auto space-y-6 mt-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2 text-foreground">Financial crime data workspace</h2>
        <p className="text-lg text-muted-foreground">Self-service insight and metadata for business owners</p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {items.map((i) => (
          <NavLink key={i.to} to={i.to}>
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>{i.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{i.text}</CardContent>
            </Card>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
