import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Download, 
  Smartphone, 
  Share, 
  Plus, 
  Check, 
  ArrowLeft,
  Wifi,
  WifiOff,
  RefreshCw
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    // Online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button 
            onClick={() => navigate('/')}
            className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-lg">Instalar App</h1>
        </div>
      </div>

      <div className="p-4 space-y-6 max-w-md mx-auto">
        {/* Status Card */}
        <Card className="p-4 flex items-center gap-3">
          {isOnline ? (
            <>
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                <Wifi className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="font-medium text-foreground">Conectado</p>
                <p className="text-sm text-muted-foreground">Dados sincronizados</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <WifiOff className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="font-medium text-foreground">Offline</p>
                <p className="text-sm text-muted-foreground">Usando dados salvos</p>
              </div>
            </>
          )}
        </Card>

        {/* Install Status */}
        {isInstalled ? (
          <Card className="p-6 text-center space-y-4 border-accent/30 bg-accent/5">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-accent" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">App Instalado!</h2>
              <p className="text-muted-foreground mt-1">
                SpeakDaily está na sua tela inicial
              </p>
            </div>
            <Button onClick={() => navigate('/')} className="w-full">
              Continuar Praticando
            </Button>
          </Card>
        ) : (
          <>
            {/* App Preview */}
            <Card className="p-6 text-center space-y-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mx-auto shadow-lg">
                <Smartphone className="w-10 h-10 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">SpeakDaily</h2>
                <p className="text-muted-foreground mt-1">
                  Fluência em Inglês com IA
                </p>
              </div>
            </Card>

            {/* Install Instructions */}
            {isIOS ? (
              <Card className="p-5 space-y-4">
                <h3 className="font-semibold text-foreground">
                  Como instalar no iPhone/iPad
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Share className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">1. Toque em Compartilhar</p>
                      <p className="text-sm text-muted-foreground">
                        No Safari, toque no ícone de compartilhar na barra inferior
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Plus className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">2. Adicionar à Tela de Início</p>
                      <p className="text-sm text-muted-foreground">
                        Role para baixo e selecione "Adicionar à Tela de Início"
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">3. Confirmar</p>
                      <p className="text-sm text-muted-foreground">
                        Toque em "Adicionar" para instalar o app
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            ) : deferredPrompt ? (
              <Button 
                onClick={handleInstall} 
                size="lg" 
                className="w-full gap-2"
              >
                <Download className="w-5 h-5" />
                Instalar Agora
              </Button>
            ) : (
              <Card className="p-5 space-y-4">
                <h3 className="font-semibold text-foreground">
                  Como instalar no Android
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary font-bold text-sm">⋮</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">1. Abra o menu</p>
                      <p className="text-sm text-muted-foreground">
                        Toque nos três pontos no canto superior direito
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Download className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">2. Instalar app</p>
                      <p className="text-sm text-muted-foreground">
                        Selecione "Instalar app" ou "Adicionar à tela inicial"
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}

        {/* Features */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground px-1">
            Benefícios do App
          </h3>
          <div className="grid gap-3">
            <Card className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Acesso Rápido</p>
                <p className="text-sm text-muted-foreground">
                  Ícone na tela inicial do seu celular
                </p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                <WifiOff className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="font-medium text-foreground">Funciona Offline</p>
                <p className="text-sm text-muted-foreground">
                  Veja seu progresso mesmo sem internet
                </p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Carregamento Instantâneo</p>
                <p className="text-sm text-muted-foreground">
                  Interface salva localmente para velocidade máxima
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
