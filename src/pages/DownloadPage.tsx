import React, { useState, useEffect } from 'react';
import { LandingLayout } from '../layouts/LandingLayout';
import { Apple, Terminal, Download, ShieldCheck, Check, Copy, AlertCircle, Sparkles, Code2 } from 'lucide-react';

export const DownloadPage: React.FC = () => {
  const [latestTag, setLatestTag] = useState<string>('v0.3.9');
  const [latestVersion, setLatestVersion] = useState<string>('0.3.9');
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'mac' | 'win' | 'source'>('mac');

  useEffect(() => {
    document.title = 'Descargar Lumus Control — App gratuita para macOS y Windows';

    // Detect user OS for pre-selection
    const ua = window.navigator.userAgent.toLowerCase();
    if (ua.includes('win')) {
      setActiveTab('win');
    } else if (ua.includes('mac')) {
      setActiveTab('mac');
    } else if (ua.includes('linux') || ua.includes('x11')) {
      setActiveTab('source');
    }

    fetch('https://api.github.com/repos/dotfn/lumus-control/releases/latest')
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then((data) => {
        if (data && data.tag_name) {
          const tag = data.tag_name;
          setLatestTag(tag);
          setLatestVersion(tag.replace(/^v/, ''));
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching latest release from GitHub:', err);
        setLoading(false);
      });
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const oneLinerCmd = 'bash -c "$(curl -fsSL https://raw.githubusercontent.com/dotfn/lumus-control/main/install.sh)"';
  const brewTapCmd = 'brew tap dotfn/lumus';
  const brewInstallCmd = 'brew install --cask lumus-control';

  const macDmgUrl = `https://github.com/dotfn/lumus-control/releases/download/${latestTag}/lumus-control_${latestVersion}_aarch64.dmg`;
  const winExeUrl = `https://github.com/dotfn/lumus-control/releases/download/${latestTag}/lumus-control_${latestVersion}_x64-setup.exe`;

  return (
    <LandingLayout>
      <div className="max-w-5xl mx-auto px-6 py-16 space-y-12 relative">
        {/* Decorative background glow behind the active card */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] pointer-events-none -z-10 filter blur-[120px] opacity-40 transition-all duration-700"
          style={{
            background: activeTab === 'mac'
              ? 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)'
              : activeTab === 'win'
              ? 'radial-gradient(circle, rgba(14,165,233,0.25) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)',
          }}
        />

        {/* Header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[10px] font-bold tracking-wider uppercase font-mono shadow-sm">
            <Sparkles className="w-3 h-3 text-blue-500 animate-pulse" />
            {loading ? 'Obteniendo última versión...' : `Versión actual: ${latestTag}`}
          </div>
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl tracking-tight text-theme-text transition-colors">
            Descarga Lumus Control
          </h1>
          <p className="text-theme-textSecondary font-medium text-xs sm:text-sm leading-relaxed max-w-lg mx-auto transition-colors">
            Instala la aplicación nativa para controlar tus luces Wi-Fi de forma local, instantánea y con un diseño de primer nivel.
          </p>
        </div>

        {/* Platform Selector Segmented Control */}
        <div className="flex justify-center">
          <div className="bg-theme-input/60 border border-theme-border/80 rounded-2xl p-1 flex gap-1 shadow-inner relative max-w-md w-full">
            <button
              onClick={() => setActiveTab('mac')}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                activeTab === 'mac'
                  ? 'bg-theme-card text-theme-text border border-theme-border/40 shadow-md shadow-black/5'
                  : 'text-theme-textSecondary hover:text-theme-text'
              }`}
            >
              <Apple className="w-4 h-4" />
              <span>macOS</span>
            </button>
            <button
              onClick={() => setActiveTab('win')}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                activeTab === 'win'
                  ? 'bg-theme-card text-theme-text border border-theme-border/40 shadow-md shadow-black/5'
                  : 'text-theme-textSecondary hover:text-theme-text'
              }`}
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M0 0h11.4v11.4H0V0zm12.6 0H24v11.4H12.6V0zM0 12.6h11.4V24H0V12.6zm12.6 0H24V24H12.6V12.6z" />
              </svg>
              <span>Windows</span>
            </button>
            <button
              onClick={() => setActiveTab('source')}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                activeTab === 'source'
                  ? 'bg-theme-card text-theme-text border border-theme-border/40 shadow-md shadow-black/5'
                  : 'text-theme-textSecondary hover:text-theme-text'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>Código Fuente</span>
            </button>
          </div>
        </div>

        {/* Active Tab Main Card */}
        <div className="animate-fade-in">
          {activeTab === 'mac' && (
            <div className="space-y-8">
              {/* macOS Hero Card */}
              <div className="glass-card max-w-3xl mx-auto p-8 border-theme-border relative overflow-hidden flex flex-col md:flex-row items-center gap-8 shadow-2xl">
                <div className="flex-1 space-y-4 text-center md:text-left">
                  <div className="w-14 h-14 rounded-2xl bg-theme-input border border-theme-border flex items-center justify-center text-theme-text shadow-sm mx-auto md:mx-0">
                    <Apple className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-xl text-theme-text">macOS Apple Silicon</h3>
                    <p className="text-[10px] font-bold text-blue-500 font-mono uppercase tracking-wider">
                      Instalador Nativo (.DMG) · M1 / M2 / M3 / M4
                    </p>
                  </div>
                  <p className="text-xs text-theme-textSecondary leading-relaxed">
                    Aplicación nativa compilada y optimizada al 100% para computadoras Mac con chips Apple Silicon. Proporciona un rendimiento insuperable y optimización de energía.
                  </p>
                </div>
                <div className="flex-shrink-0 w-full md:w-auto text-center space-y-3">
                  <a
                    href={macDmgUrl}
                    className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white font-bold rounded-2xl flex items-center justify-center gap-2.5 shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-xs"
                    id="btn-download-mac-hero"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar DMG</span>
                  </a>
                  <div className="text-[10px] text-theme-textSecondary font-semibold">
                    Versión {latestTag} · macOS 11+ · ~10 MB
                  </div>
                </div>
              </div>

              {/* Advanced macOS commands */}
              <div className="space-y-4">
                <h4 className="text-center font-display font-bold text-xs text-theme-textSecondary uppercase tracking-widest">
                  Métodos de Instalación por Terminal
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Script Terminal block */}
                  <div className="glass-card p-6 border-theme-border flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-blue-500" />
                        <h5 className="font-bold text-xs text-theme-text">Instalación Automática One-Liner</h5>
                      </div>
                      <p className="text-[11px] text-theme-textSecondary leading-relaxed">
                        Ejecuta este comando en tu terminal para descargar, instalar y autorizar la ejecución en Gatekeeper de forma automática.
                      </p>
                    </div>
                    {/* Mock Terminal UI */}
                    <div className="bg-[#151517] border border-zinc-800 rounded-xl overflow-hidden font-mono text-[10px] text-zinc-300 shadow-lg">
                      <div className="bg-[#0b0b0c] px-3 py-2 flex items-center justify-between border-b border-zinc-900 select-none">
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-red-500/50" />
                          <span className="w-2 h-2 rounded-full bg-yellow-500/50" />
                          <span className="w-2 h-2 rounded-full bg-green-500/50" />
                        </div>
                        <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">install.sh</span>
                      </div>
                      <div className="p-3 flex items-center justify-between gap-3 select-all">
                        <span className="truncate mr-2"><span className="text-blue-400 select-none">$</span> {oneLinerCmd}</span>
                        <button
                          onClick={() => copyToClipboard(oneLinerCmd, 'oneliner')}
                          className="p-1.5 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 rounded-md transition-all flex-shrink-0"
                          aria-label="Copiar script"
                        >
                          {copiedText === 'oneliner' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Homebrew block */}
                  <div className="glass-card p-6 border-theme-border flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Apple className="w-4 h-4 text-amber-600" />
                        <h5 className="font-bold text-xs text-theme-text">Instalación vía Homebrew Cask</h5>
                      </div>
                      <p className="text-[11px] text-theme-textSecondary leading-relaxed">
                        Instala el cask oficial y mantén la aplicación actualizada de forma nativa mediante el comando `brew upgrade`.
                      </p>
                    </div>
                    {/* Mock Terminal UI */}
                    <div className="bg-[#151517] border border-zinc-800 rounded-xl overflow-hidden font-mono text-[10px] text-zinc-300 shadow-lg space-y-1">
                      <div className="bg-[#0b0b0c] px-3 py-2 flex items-center justify-between border-b border-zinc-900 select-none">
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-red-500/50" />
                          <span className="w-2 h-2 rounded-full bg-yellow-500/50" />
                          <span className="w-2 h-2 rounded-full bg-green-500/50" />
                        </div>
                        <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">Homebrew</span>
                      </div>
                      <div className="p-3 space-y-2">
                        <div className="flex items-center justify-between gap-3 select-all">
                          <span className="truncate mr-2"><span className="text-blue-400 select-none">$</span> {brewTapCmd}</span>
                          <button
                            onClick={() => copyToClipboard(brewTapCmd, 'brewtap')}
                            className="p-1.5 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 rounded-md transition-all flex-shrink-0"
                            aria-label="Copiar tap"
                          >
                            {copiedText === 'brewtap' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <div className="flex items-center justify-between gap-3 select-all">
                          <span className="truncate mr-2"><span className="text-blue-400 select-none">$</span> {brewInstallCmd}</span>
                          <button
                            onClick={() => copyToClipboard(brewInstallCmd, 'brewinst')}
                            className="p-1.5 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 rounded-md transition-all flex-shrink-0"
                            aria-label="Copiar cask"
                          >
                            {copiedText === 'brewinst' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'win' && (
            <div className="space-y-8">
              {/* Windows Hero Card */}
              <div className="glass-card max-w-3xl mx-auto p-8 border-theme-border relative overflow-hidden flex flex-col md:flex-row items-center gap-8 shadow-2xl">
                <div className="flex-1 space-y-4 text-center md:text-left">
                  <div className="w-14 h-14 rounded-2xl bg-theme-input border border-theme-border flex items-center justify-center text-blue-500 shadow-sm mx-auto md:mx-0">
                    <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
                      <path d="M0 0h11.4v11.4H0V0zm12.6 0H24v11.4H12.6V0zM0 12.6h11.4V24H0V12.6zm12.6 0H24V24H12.6V12.6z" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-xl text-theme-text">Windows 10 / 11</h3>
                    <p className="text-[10px] font-bold text-blue-500 font-mono uppercase tracking-wider">
                      Instalador Nivel Sistema (.EXE) · x64
                    </p>
                  </div>
                  <p className="text-xs text-theme-textSecondary leading-relaxed">
                    Instalador autoejecutable nativo (NSIS) de alto rendimiento para computadoras de 64 bits. Cero dependencias externas o configuraciones en la nube.
                  </p>
                </div>
                <div className="flex-shrink-0 w-full md:w-auto text-center space-y-3">
                  <a
                    href={winExeUrl}
                    className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white font-bold rounded-2xl flex items-center justify-center gap-2.5 shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-xs"
                    id="btn-download-win-hero"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar Instalador</span>
                  </a>
                  <div className="text-[10px] text-theme-textSecondary font-semibold">
                    Versión {latestTag} · Windows 10/11 x64 · ~6 MB
                  </div>
                </div>
              </div>

              {/* Windows Help / SmartScreen Warning Tip */}
              <div className="glass-card max-w-3xl mx-auto p-6 border-amber-500/10 bg-amber-500/5 rounded-2xl flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 flex-shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="space-y-1.5 text-left">
                  <h5 className="font-bold text-xs text-theme-text">Nota de Seguridad (Windows SmartScreen)</h5>
                  <p className="text-[11px] text-theme-textSecondary leading-relaxed">
                    Dado que Lumus Control es un proyecto Open Source de descarga gratuita, las compilaciones automatizadas se firman de forma ad-hoc (sin un costoso certificado comercial de Microsoft). 
                    Por ello, Windows SmartScreen podría mostrar una pantalla azul de aviso al ejecutar el archivo por primera vez.
                  </p>
                  <p className="text-[11px] text-theme-textSecondary leading-relaxed font-semibold">
                    Para instalar de forma segura: Haz clic en <span className="underline">"Más información"</span> y luego en <span className="underline">"Ejecutar de todas formas"</span>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'source' && (
            <div className="space-y-8">
              {/* Build from Source Card */}
              <div className="glass-card max-w-3xl mx-auto p-8 border-theme-border space-y-6 shadow-2xl text-left">
                <div className="space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-theme-input border border-theme-border flex items-center justify-center text-emerald-500 shadow-sm">
                    <Code2 className="w-7 h-7" />
                  </div>
                  <h3 className="font-extrabold text-xl text-theme-text">Compilar desde Origen</h3>
                  <p className="text-xs text-theme-textSecondary leading-relaxed">
                    Lumus Control está construido en Tauri y Rust. Si tienes una arquitectura diferente (como Intel Mac o Linux) o simplemente deseas compilar la aplicación tú mismo con total transparencia, puedes hacerlo de forma nativa.
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-theme-textSecondary uppercase tracking-wider block">
                    Comandos de Compilación
                  </span>
                  {/* Mock Terminal UI */}
                  <div className="bg-[#151517] border border-zinc-800 rounded-xl overflow-hidden font-mono text-[10px] text-zinc-300 shadow-lg">
                    <div className="bg-[#0b0b0c] px-3 py-2 flex items-center justify-between border-b border-zinc-900 select-none">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-500/50" />
                        <span className="w-2 h-2 rounded-full bg-yellow-500/50" />
                        <span className="w-2 h-2 rounded-full bg-green-500/50" />
                      </div>
                      <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">compilar.sh</span>
                    </div>
                    <div className="p-4 space-y-2 select-all">
                      <div><span className="text-zinc-500"># Clonar repositorio</span></div>
                      <div><span className="text-blue-400">$</span> git clone https://github.com/dotfn/lumus-control.git</div>
                      <div><span className="text-blue-400">$</span> cd lumus-control</div>
                      <div className="pt-2"><span className="text-zinc-500"># Instalar dependencias del frontend</span></div>
                      <div><span className="text-blue-400">$</span> pnpm install</div>
                      <div className="pt-2"><span className="text-zinc-500"># Compilar app Tauri optimizada de producción</span></div>
                      <div><span className="text-blue-400">$</span> pnpm tauri build</div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-[10px] text-theme-textSecondary font-semibold">
                  Requiere Node.js v20+, pnpm v9+ y Rust (rustc / cargo) instalados en el sistema de desarrollo.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Security & Verification Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Security Banner Card */}
          <div className="glass-card p-6 border-theme-border flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 flex-shrink-0 shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1 text-left">
              <h4 className="font-bold text-xs text-theme-text">Código Abierto Verificado</h4>
              <p className="text-[11px] text-theme-textSecondary leading-relaxed">
                Nuestros instaladores se compilan de forma automatizada mediante flujos de trabajo transparentes en GitHub Actions, asegurando que el ejecutable corresponde exactamente con el código público.
              </p>
            </div>
          </div>

          {/* Local network Card */}
          <div className="glass-card p-6 border-theme-border flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 flex-shrink-0 shadow-sm">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1 text-left">
              <h4 className="font-bold text-xs text-theme-text">Sin Nube, Sin Cuentas</h4>
              <p className="text-[11px] text-theme-textSecondary leading-relaxed">
                Lumus Control no requiere telemetría ni conexión a internet tras su descarga. Se conecta a tus lámparas a nivel de red interna usando paquetes UDP directos para total privacidad y velocidad.
              </p>
            </div>
          </div>
        </div>
      </div>
    </LandingLayout>
  );
};
