import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { z } from 'zod';

const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string().min(6, 'A senha deve ter pelo menos 6 caracteres');

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const validateForm = () => {
    try {
      emailSchema.parse(email);
    } catch {
      setError('Por favor, insira um email válido');
      return false;
    }

    try {
      passwordSchema.parse(password);
    } catch {
      setError('A senha deve ter pelo menos 6 caracteres');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!validateForm()) return;

    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Email ou senha incorretos');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Por favor, confirme seu email antes de fazer login');
        } else {
          setError(error.message);
        }
      }
    } else {
      const { error } = await signUp(email, password, displayName);
      if (error) {
        if (error.message.includes('User already registered')) {
          setError('Este email já está cadastrado. Tente fazer login.');
        } else {
          setError(error.message);
        }
      } else {
        setSuccessMessage('Conta criada! Verifique seu email para confirmar o cadastro.');
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center mb-8 shadow-glow">
          <MessageCircle className="w-8 h-8 text-primary-foreground" />
        </div>

        <h1 className="text-2xl font-bold mb-2 text-center">
          {isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta'}
        </h1>
        <p className="text-muted-foreground mb-8 text-center">
          {isLogin 
            ? 'Entre para continuar seu progresso' 
            : 'Comece a destravar sua fala em inglês'}
        </p>

        <Card variant="default" padding="lg" className="w-full max-w-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Seu nome</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Como devemos te chamar?"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {successMessage && (
              <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                <p className="text-sm text-accent">{successMessage}</p>
              </div>
            )}

            <Button
              type="submit"
              variant="hero"
              size="xl"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Entrar' : 'Criar conta'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
          </form>
        </Card>

        <button
          onClick={() => {
            setIsLogin(!isLogin);
            setError(null);
            setSuccessMessage(null);
          }}
          className={cn(
            "mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
          )}
        >
          {isLogin 
            ? 'Não tem conta? Cadastre-se' 
            : 'Já tem conta? Faça login'}
        </button>
      </div>
    </div>
  );
}
