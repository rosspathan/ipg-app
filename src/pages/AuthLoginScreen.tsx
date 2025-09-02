import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Loader2 } from "lucide-react";

const AuthLoginScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, loading } = useAuthUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const from = location.state?.from?.pathname || "/app/home";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message);
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-primary px-6">
      <div className="flex flex-col items-center space-y-8 max-w-md w-full">
        <div className="flex flex-col items-center space-y-4">
          <img 
            src="/lovable-uploads/a9cfc5de-7126-4662-923b-cc0348077e3d.png" 
            alt="I-SMART Logo" 
            className="w-24 h-24 rounded-2xl shadow-card object-contain"
          />
          <h1 className="text-3xl font-bold text-primary-foreground text-center">
            Welcome Back
          </h1>
          <p className="text-primary-foreground/80 text-center">
            Sign in to your I-SMART account
          </p>
        </div>

        <Card className="w-full bg-card/90 backdrop-blur">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your email and password to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="mt-4 space-y-2">
              <Button 
                variant="ghost" 
                className="w-full"
                onClick={() => navigate("/auth/register")}
                disabled={isLoading}
              >
                Don't have an account? Sign Up
              </Button>
              
              <Button 
                variant="ghost" 
                className="w-full text-xs"
                onClick={() => navigate("/admin/login")}
                disabled={isLoading}
              >
                Admin Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthLoginScreen;