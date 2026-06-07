import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, User, Loader2 } from "lucide-react";
import logoUrl from "@assets/image_1773940561975.png";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const login = useAuth((state) => state.login);
  const isLoading = useAuth((state) => state.isLoading);
  const user = useAuth((state) => state.user);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const success = await login(username.trim(), password.trim());
    if (success) {
      setLocation("/");
    } else {
      setError("Usuario o contraseña incorrectos");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-4 flex flex-col items-center text-center">
          <div className="w-44 h-44 mb-2">
            <img src={logoUrl} alt="Logo EEA" className="w-full h-full object-contain" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">Sistema de Gestión</CardTitle>
          <CardDescription>
            Higiene Ocupacional y Medio Ambiente
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder="Ingrese su usuario"
                  className="pl-9"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={isLoading}
                  data-testid="input-username"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Ingrese su contraseña"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  data-testid="input-password"
                />
              </div>
            </div>
            {error && (
              <div className="text-sm text-red-600 font-medium text-center bg-red-50 border border-red-200 p-3 rounded-md">
                {error}
              </div>
            )}
            <div className="text-xs text-center text-gray-400 mt-2 space-y-0.5">
              <p className="font-medium text-gray-500">Credenciales:</p>
              <p>Admin: <span className="font-mono bg-gray-100 px-1 rounded">admin</span> / <span className="font-mono bg-gray-100 px-1 rounded">admin123</span></p>
              <p>Operador: <span className="font-mono bg-gray-100 px-1 rounded">operador</span> / <span className="font-mono bg-gray-100 px-1 rounded">op123</span></p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-login">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ingresando...
                </>
              ) : (
                "Ingresar"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
