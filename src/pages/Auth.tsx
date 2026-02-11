import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageCircle, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { z } from 'zod';

const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string().min(6, 'A senha deve ter pelo menos 6 caracteres');

type AuthMode = 'login' | 'signup' | 'forgot';

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const { signIn, signUp, resetPassword, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Validate email
    try { emailSchema.parse(email); } catch {
      setError('Por favor, insira um email válido');
      return;
    }

    if (mode === 'forgot') {
      setLoading(true);
      const { error } = await resetPassword(email);
      if (error) {
        setError(error.message);
      } else {
        setSuccessMessage('Email de recuperação enviado! Verifique sua caixa de entrada.');
      }
      setLoading(false);
      return;
    }

    // Validate password for login/signup
    try { passwordSchema.parse(password); } catch {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);

    if (mode === 'login') {
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

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setSuccessMessage(null);
  };

  const titles: Record<AuthMode, { heading: string; sub: string }> = {
    login: { heading: 'Bem-vindo de volta!', sub: 'Entre para continuar seu progresso' },
    signup: { heading: 'Crie sua conta', sub: 'Comece a destravar sua fala em inglês' },
    forgot: { heading: 'Recuperar conta', sub: 'Enviaremos um link para redefinir sua senha' },
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center mb-8 shadow-glow">
          <MessageCircle className="w-8 h-8 text-primary-foreground" />
        </div>

        <h1 className="text-2xl font-bold mb-2 text-center">{titles[mode].heading}</h1>
        <p className="text-muted-foreground mb-8 text-center">{titles[mode].sub}</p>

        <Card variant="default" padding="lg" className="w-full max-w-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Seu nome</Label>
                <Input id="displayName" type="text" placeholder="Como devemos te chamar?" value={displayName} onChange={(e) => setDisplayName(e.target.value)} disabled={loading} />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} />
            </div>

            {mode !== 'forgot' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  {mode === 'login' && (
                    <button type="button" onClick={() => switchMode('forgot')} className="text-xs text-primary hover:underline">
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} />
              </div>
            )}

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

            <Button type="submit" variant="hero" size="xl" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : mode === 'forgot' ? (
                <>Enviar link<ArrowRight className="w-5 h-5" /></>
              ) : (
                <>{mode === 'login' ? 'Entrar' : 'Criar conta'}<ArrowRight className="w-5 h-5" /></>
              )}
            </Button>
          </form>
        </Card>

        {mode === 'forgot' ? (
          <button onClick={() => switchMode('login')} className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Voltar ao login
          </button>
        ) : (
          <button
            onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
            className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {mode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
          </button>
        )}
      </div>
    </div>
  );
}
