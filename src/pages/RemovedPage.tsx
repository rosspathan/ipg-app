import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface RemovedPageProps {
  home?: string;
  admin?: boolean;
  removed?: string;
}

export default function RemovedPage({ home = "/", admin = false, removed }: RemovedPageProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const title = admin ? "Admin page removed" : "This page was removed";
  const message = removed ?? `The route “${pathname}” is no longer available.`;
  const cta = admin ? "Go to Admin Dashboard" : "Go to Home";
  const target = admin ? (home || "/admin") : (home || "/");

  return (
    <main className="min-h-screen grid place-items-center bg-background px-6 py-10">
      <section className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="pt-2">
          <Button onClick={() => navigate(target, { replace: true })}>{cta}</Button>
        </div>
      </section>
    </main>
  );
}
