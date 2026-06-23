import React, { useState } from 'react';
import { LandingLayout } from '../layouts/LandingLayout';
import { Apple, Terminal, Download, ShieldCheck, Check, Copy, AlertCircle } from 'lucide-react';

export const DownloadPage: React.FC = () => {
  React.useEffect(() => {
    document.title = 'Descargar Lumus Control — App gratuita para macOS';
  }, []);

  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const oneLinerCmd = 'bash -c "$(curl -fsSL https://raw.githubusercontent.com/dotfn/lumus-control/main/install.sh)"';
  const brewTapCmd = 'brew tap dotfn/lumus';
  const brewInstallCmd = 'brew install --cask lumus-control';

  return (
    <LandingLayout>
      <div className="max-w-6xl mx-auto px-6 py-20 space-y-16">
        {/* Header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <h1 className="font-display font-extrabold text-4xl tracking-tight text-theme-text transition-colors">
            Descarga Lumus Control
          </h1>
          <p className="text-theme-textSecondary font-medium text-sm sm:text-base leading-relaxed transition-colors">
            Elige tu método preferido e instala la aplicación nativa para macOS para comenzar a controlar tus lámparas en tu red local.
          </p>
        </div>

        {/* Installation Options */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Option 1: Automated Script */}
          <div className="glass-card flex flex-col justify-between p-8 border-theme-border relative overflow-hidden group">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-theme-input border border-theme-border flex items-center justify-center text-blue-500">
                  <Terminal className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-theme-text">Script de Instalación (Recomendado)</h3>
                  <span className="text-[10px] font-semibold text-theme-textSecondary font-mono uppercase tracking-wider">
                    One-Liner · Automático e Inteligente
                  </span>
                </div>
              </div>

              <p className="text-xs text-theme-textSecondary leading-relaxed">
                Este script detecta automáticamente la arquitectura de tu Mac (Apple Silicon o Intel), descarga la versión correspondiente desde GitHub, la mueve a la carpeta de aplicaciones y elimina los atributos de Gatekeeper para evitar bloqueos del sistema.
              </p>

              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-bold text-theme-textSecondary uppercase tracking-wider block">
                  Copiar y pegar en la Terminal
                </span>
                <div className="bg-theme-input border border-theme-border rounded-xl p-4 flex items-center justify-between font-mono text-[10px] text-theme-text select-all">
                  <span className="truncate mr-4">{oneLinerCmd}</span>
                  <button
                    onClick={() => copyToClipboard(oneLinerCmd, 'oneliner')}
                    className="p-2 hover:bg-theme-border rounded-lg text-theme-textSecondary hover:text-theme-text transition-all flex-shrink-0"
                    aria-label="Copiar comando de instalación"
                  >
                    {copiedText === 'oneliner' ? <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-theme-border text-[10px] text-theme-textSecondary font-semibold">
              No requiere permisos de administrador (`sudo`).
            </div>
          </div>

          {/* Option 2: Homebrew */}
          <div className="glass-card flex flex-col justify-between p-8 border-theme-border relative overflow-hidden group">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-theme-input border border-theme-border flex items-center justify-center text-amber-600">
                  <Apple className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-theme-text">Instalación vía Homebrew</h3>
                  <span className="text-[10px] font-semibold text-theme-textSecondary font-mono uppercase tracking-wider">
                    Cask Oficial · dotfn/homebrew-lumus
                  </span>
                </div>
              </div>

              <p className="text-xs text-theme-textSecondary leading-relaxed">
                Si utilizas Homebrew para gestionar tus aplicaciones de macOS, puedes agregar nuestro tap oficial e instalar la aplicación de forma nativa directamente desde tu terminal.
              </p>

              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-theme-textSecondary uppercase tracking-wider block">
                    1. Agregar el Tap
                  </span>
                  <div className="bg-theme-input border border-theme-border rounded-xl p-3 flex items-center justify-between font-mono text-[10px] text-theme-text select-all">
                    <span className="truncate mr-4">{brewTapCmd}</span>
                    <button
                      onClick={() => copyToClipboard(brewTapCmd, 'brewtap')}
                      className="p-2 hover:bg-theme-border rounded-lg text-theme-textSecondary hover:text-theme-text transition-all flex-shrink-0"
                      aria-label="Copiar comando de tap de Homebrew"
                    >
                      {copiedText === 'brewtap' ? <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-theme-textSecondary uppercase tracking-wider block">
                    2. Instalar el Cask
                  </span>
                  <div className="bg-theme-input border border-theme-border rounded-xl p-3 flex items-center justify-between font-mono text-[10px] text-theme-text select-all">
                    <span className="truncate mr-4">{brewInstallCmd}</span>
                    <button
                      onClick={() => copyToClipboard(brewInstallCmd, 'brewinst')}
                      className="p-2 hover:bg-theme-border rounded-lg text-theme-textSecondary hover:text-theme-text transition-all flex-shrink-0"
                      aria-label="Copiar comando de instalación Homebrew"
                    >
                      {copiedText === 'brewinst' ? <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-theme-border text-[10px] text-theme-textSecondary font-semibold">
              Mantiene la aplicación actualizada fácilmente mediante `brew upgrade`.
            </div>
          </div>
        </div>

        {/* Manual Release Downloads */}
        <div className="glass-card p-8 border-theme-border">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <h3 className="font-bold text-base text-theme-text flex items-center gap-2">
                Descarga Manual (.DMG)
              </h3>
              <p className="text-xs text-theme-textSecondary max-w-xl font-medium leading-relaxed">
                Si prefieres arrastrar el instalador clásico a la carpeta de Aplicaciones, puedes descargar el archivo `.dmg` correspondiente a tu arquitectura directamente desde nuestra pestaña de Releases en GitHub.
              </p>
            </div>
            <a
              href="https://github.com/dotfn/lumus-control/releases"
              target="_blank"
              rel="noreferrer"
              className="px-6 py-3 bg-theme-input hover:bg-theme-border border border-theme-border text-theme-text hover:text-theme-text font-bold text-xs rounded-xl flex items-center gap-2 transition-all flex-shrink-0 active:scale-95"
            >
              <Download className="w-4 h-4 text-blue-500" />
              <span>Ver Releases en GitHub</span>
            </a>
          </div>
        </div>

        {/* Multi-platform Warning */}
        <div className="bg-theme-input border border-theme-border rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 flex-shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-theme-text">¿Quieres usarlo en Windows o Linux?</h4>
            <p className="text-xs text-theme-textSecondary font-medium leading-relaxed">
              Actualmente, las compilaciones automáticas y scripts oficiales se centran en macOS. Sin embargo, dado que Lumus Control está construido en Tauri y Rust, es totalmente compatible con Windows y Linux. Puedes clonar el código fuente desde el{' '}
              <a
                href="https://github.com/dotfn/lumus-control"
                target="_blank"
                rel="noreferrer"
                className="text-blue-500 hover:underline font-semibold"
              >
                repositorio de GitHub
              </a>{' '}
              y compilarlo localmente ejecutando `pnpm tauri build`.
            </p>
          </div>
        </div>

        {/* Security Banner */}
        <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 flex-shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-theme-text">Descarga Segura y Verificada</h4>
            <p className="text-xs text-theme-textSecondary font-medium leading-relaxed">
              Lumus Control es 100% de código abierto. Compilamos las aplicaciones directamente desde los flujos de trabajo de GitHub Actions, garantizando que el binario que descargas corresponde exactamente con el código público en{' '}
              <a
                href="https://github.com/dotfn/lumus-control"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-500 hover:underline font-semibold"
              >
                github.com/dotfn/lumus-control
              </a>.
            </p>
          </div>
        </div>
      </div>
    </LandingLayout>
  );
};
