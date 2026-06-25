import React, { useState } from 'react';
import { LandingLayout } from '../layouts/LandingLayout';
import { ArrowRight, Zap, Shield, Sparkles, Clock, Download, ChevronRight, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

export const LandingPage: React.FC = () => {
  // Set page-specific document title for SEO
  React.useEffect(() => {
    document.title = 'Lumus Control — Control local de luces inteligentes para macOS';
  }, []);

  // Simple interactive state for the Hero mockup
  const [lampOn, setLampOn] = useState(true);
  const [brightness, setBrightness] = useState(80);
  const [activeColor, setActiveColor] = useState('#ffb454'); // Kelvin equivalent warm glow

  const presets = [
    { label: 'Cálido', hex: '#ffb454', desc: 'Lectura y descanso' },
    { label: 'Estudio', hex: '#63b3ed', desc: 'Foco y concentración' },
    { label: 'Ocaso', hex: '#f687b3', desc: 'Luz tenue relajante' },
  ];

  return (
    <LandingLayout>
      {/* Hero Section */}
      <section className="relative pt-20 pb-24 px-6 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 overflow-hidden">
        {/* Left Column: Text */}
        <div className="flex-1 space-y-8 text-center lg:text-left z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs font-semibold tracking-wide animate-fade-in uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Control Local y Privado</span>
          </div>

          <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-tight text-theme-text transition-colors duration-300">
            Control de luces inteligentes con <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">diseño de otro nivel</span>
          </h1>

          <p className="text-base sm:text-lg text-theme-textSecondary font-medium max-w-2xl mx-auto lg:mx-0 leading-relaxed transition-colors duration-300">
            Controla tus lámparas Wi-Fi locales desde tu escritorio de forma instantánea. Sin registrar cuentas, sin nubes lentas y con un diseño premium inspirado en macOS.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            <Link
              to="/download"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 bg-gradient-to-r from-blue-500 to-indigo-500 hover:opacity-95 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/25 active:scale-95 transition-all text-sm"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Gratis</span>
            </Link>
            <Link
              to="/demo"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 bg-theme-input hover:bg-theme-border border border-theme-border text-theme-text font-bold rounded-2xl active:scale-95 transition-all text-sm"
            >
              <Play className="w-4 h-4 text-blue-500" />
              <span>Probar Demo Online</span>
            </Link>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-theme-textSecondary font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> macOS Nativo (compilable en Windows/Linux)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> 100% de código abierto
            </span>
          </div>

        </div>

        {/* Right Column: Interactive Mockup Card */}
        <div className="flex-1 w-full max-w-lg z-10 animate-breathe">
          <div className="relative glass-card overflow-hidden shadow-2xl border-theme-border">
            {/* Simulated Window Control Bars */}
            <div className="flex items-center gap-1.5 pb-4 border-b border-theme-border">
              <span className="w-3 h-3 rounded-full bg-red-500/40" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/40" />
              <span className="w-3 h-3 rounded-full bg-green-500/40" />
              <span className="ml-2 font-mono text-[9px] text-theme-textSecondary">Lámpara Virtual</span>
            </div>

            {/* Glowing Lamp Representation */}
            <div className="py-8 flex flex-col items-center justify-center relative">
              {/* Dynamic Glow Layer */}
              <div
                className="absolute w-44 h-44 rounded-full filter blur-[40px] pointer-events-none transition-all duration-500 -z-10"
                style={{
                  backgroundColor: activeColor,
                  opacity: lampOn ? (brightness / 100) * 0.45 : 0,
                }}
              />

              <div
                className={`w-20 h-20 rounded-full border-2 border-theme-border flex items-center justify-center transition-all duration-300 shadow-inner ${
                  lampOn ? 'bg-white/95 scale-105' : 'bg-zinc-800/20'
                }`}
                style={{
                  boxShadow: lampOn ? `0 0 40px 10px ${activeColor}80` : 'none',
                  borderColor: lampOn ? activeColor : 'var(--border-color)',
                }}
              >
                <Sparkles
                  className={`w-8 h-8 transition-colors duration-300 ${
                    lampOn ? 'text-yellow-400 animate-spin-slow' : 'text-zinc-600'
                  }`}
                  style={{ color: lampOn ? activeColor : undefined }}
                />
              </div>

              <div className="mt-4 text-center">
                <span className="font-semibold text-xs text-theme-text block">Lámpara del Living Room</span>
                <span className="text-[10px] font-semibold text-theme-textSecondary uppercase font-mono tracking-wider mt-0.5 inline-block">
                  {lampOn ? `Encendida · Brillo ${brightness}%` : 'Apagada'}
                </span>
              </div>
            </div>

            {/* Control Inputs */}
            <div className="space-y-4 pt-4 border-t border-theme-border">
              {/* Power Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-theme-textSecondary">Estado de Energía</span>
                <button
                  onClick={() => setLampOn(!lampOn)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                    lampOn
                      ? 'bg-blue-500/15 text-blue-500 border border-blue-500/30'
                      : 'bg-theme-input text-theme-textSecondary border border-theme-border'
                  }`}
                >
                  {lampOn ? 'Encendida' : 'Apagada'}
                </button>
              </div>

              {/* Slider (Disabled if off) */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-theme-textSecondary">
                  <span>Intensidad</span>
                  <span>{brightness}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={brightness}
                  disabled={!lampOn}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>

              {/* Preset Selector */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-theme-textSecondary block">Preajustes Rápidos</span>
                <div className="grid grid-cols-3 gap-2">
                  {presets.map((preset) => {
                    const isActive = activeColor === preset.hex && lampOn;
                    return (
                      <button
                        key={preset.hex}
                        disabled={!lampOn}
                        onClick={() => setActiveColor(preset.hex)}
                        className={`p-2 rounded-xl text-left border text-xs transition-all active:scale-95 ${
                          isActive
                            ? 'bg-theme-input border-blue-500/40 text-theme-text shadow-sm'
                            : 'bg-theme-input/40 border-theme-border text-theme-textSecondary'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: preset.hex }} />
                          <span className="font-bold text-[10px]">{preset.label}</span>
                        </div>
                        <span className="text-[8px] block opacity-80 mt-0.5 truncate">{preset.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-20 px-6 max-w-5xl mx-auto">
        <div className="text-center space-y-3 mb-16">
          <h2 className="font-display font-extrabold text-3xl tracking-tight text-theme-text transition-colors">
            Listo en menos de un minuto
          </h2>
          <p className="text-theme-textSecondary text-sm font-medium max-w-md mx-auto transition-colors">
            Sin crear cuentas, sin configurar servidores. Solo descargá y controlá.
          </p>
        </div>

        <div className="relative">
          {/* Connector line (desktop only) */}
          <div className="hidden md:block absolute top-10 left-[calc(16.66%+1rem)] right-[calc(16.66%+1rem)] h-px bg-gradient-to-r from-transparent via-theme-border to-transparent" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center gap-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <Download className="w-8 h-8 text-blue-500" />
                </div>
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg shadow-blue-500/30">1</span>
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-sm text-theme-text">Descargá la app</h3>
                <p className="text-xs text-theme-textSecondary leading-relaxed max-w-[200px] mx-auto">
                  Instalá Lumus Control en tu Mac vía Homebrew o con el instalador DMG. Gratis y open source.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center gap-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <Zap className="w-8 h-8 text-purple-500" />
                </div>
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-purple-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg shadow-purple-500/30">2</span>
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-sm text-theme-text">Detectá tus lámparas</h3>
                <p className="text-xs text-theme-textSecondary leading-relaxed max-w-[200px] mx-auto">
                  Lumus escanea tu red local automáticamente y encuentra tus lámparas WiZ en segundos.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center gap-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-emerald-500" />
                </div>
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg shadow-emerald-500/30">3</span>
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-sm text-theme-text">Controlá al instante</h3>
                <p className="text-xs text-theme-textSecondary leading-relaxed max-w-[200px] mx-auto">
                  Ajustá brillo, temperatura y escenas directamente desde tu escritorio. Sin app móvil, sin nube.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="py-20 px-6 bg-theme-sidebar/10 border-y border-theme-border transition-colors duration-300">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="font-display font-extrabold text-3xl tracking-tight text-theme-text transition-colors">
              Diseñado para velocidad, privacidad y disfrute
            </h2>
            <p className="text-theme-textSecondary max-w-xl mx-auto font-medium text-sm transition-colors">
              Olvídate de servidores caídos, retardos molestos y configuraciones complejas en la nube.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="glass-card flex flex-col justify-between h-64 p-6 hover:-translate-y-1 transition-all duration-300">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-theme-text">Cero Nube. Cero Lag.</h3>
                <p className="text-xs text-theme-textSecondary leading-relaxed">
                  Las órdenes se envían directamente desde tu equipo a las lámparas a través de tu red Wi-Fi local. Sin intermediarios, respuesta instantánea.
                </p>
              </div>
              <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider flex items-center gap-1 mt-4">
                Velocidad Real <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>

            {/* Feature 2 */}
            <div className="glass-card flex flex-col justify-between h-64 p-6 hover:-translate-y-1 transition-all duration-300">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-theme-text">Privacidad por Defecto</h3>
                <p className="text-xs text-theme-textSecondary leading-relaxed">
                  No necesitas crear cuentas ni compartir contraseñas. Tus datos permanecen en tu red local. Lumus Control no recopila telemetría de tus dispositivos.
                </p>
              </div>
              <span className="text-[10px] text-purple-500 font-bold uppercase tracking-wider flex items-center gap-1 mt-4">
                Seguro y Privado <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>

            {/* Feature 3 */}
            <div className="glass-card flex flex-col justify-between h-64 p-6 hover:-translate-y-1 transition-all duration-300">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-theme-text">Ritmo Circadiano</h3>
                <p className="text-xs text-theme-textSecondary leading-relaxed">
                  Adapta la temperatura y el brillo de la luz de forma automática dependiendo de la hora del día, mejorando la productividad y el descanso.
                </p>
              </div>
              <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider flex items-center gap-1 mt-4">
                Salud Visual <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>

            {/* Feature 4 */}
            <div className="glass-card flex flex-col justify-between h-64 p-6 hover:-translate-y-1 transition-all duration-300">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-theme-text">Temporizador Suave</h3>
                <p className="text-xs text-theme-textSecondary leading-relaxed">
                  Configura un temporizador para apagar las luces gradualmente en lugar de un apagado brusco. Ideal para conciliar el sueño plácidamente.
                </p>
              </div>
              <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider flex items-center gap-1 mt-4">
                Confort Lumínico <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Callout Section */}
      <section className="py-24 px-6 max-w-5xl mx-auto text-center space-y-8 z-10 relative">
        <h2 className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight text-theme-text transition-colors">
          ¿Listo para probarlo tú mismo?
        </h2>
        <p className="text-theme-textSecondary max-w-2xl mx-auto text-sm sm:text-base leading-relaxed transition-colors">
          Hemos creado una réplica simulada interactiva que se ejecuta directamente en el navegador. Cambia el brillo, activa escenas y experimenta la fluidez de la interfaz sin instalar nada.
        </p>
        <div>
          <Link
            to="/demo"
            className="inline-flex items-center gap-2 px-8 py-4 bg-theme-text hover:opacity-90 active:scale-95 text-theme-bg font-bold rounded-2xl shadow-lg transition-all text-sm"
          >
            <span>Lanzar Demo en el Navegador</span>
            <ArrowRight className="w-4 h-4 animate-bounce" />
          </Link>
        </div>
      </section>
    </LandingLayout>
  );
};
