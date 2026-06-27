import React from 'react';
import { LandingLayout } from '../layouts/LandingLayout';
import { ArrowRight, Zap, Shield, Sparkles, Clock, Download, ChevronRight, Play, Laptop } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DeviceSimulatorShowcase } from '../features/showcase/components/DeviceSimulatorShowcase';

const finishes = [
  {
    id: 'citrus',
    label: 'Citrus',
    swatchHex: '#dddc8c',
    gradient: 'linear-gradient(184deg, rgb(29, 29, 31) 0%, rgb(223, 231, 79) 33%, rgb(94, 156, 42) 66%, rgb(10, 134, 26) 95%)',
    activeColor: 'rgb(223, 231, 79)',
  },
  {
    id: 'indigo',
    label: 'Indigo',
    swatchHex: '#596680',
    gradient: 'linear-gradient(184deg, rgb(29, 29, 31) 20%, rgb(168, 211, 251) 43%, rgb(0, 18, 249) 76%, rgb(37, 53, 224) 95%)',
    activeColor: 'rgb(168, 211, 251)',
  },
  {
    id: 'blush',
    label: 'Blush',
    swatchHex: '#e8d0d0',
    gradient: 'linear-gradient(184deg, rgb(29, 29, 31) 20%, rgb(243, 196, 246) 43%, rgb(245, 0, 180) 76%, rgb(204, 41, 188) 95%)',
    activeColor: 'rgb(243, 196, 246)',
  },
] as const;

export const LandingPage: React.FC = () => {
  // Set page-specific document title for SEO
  React.useEffect(() => {
    document.title = 'Lumus Control — Control local de luces inteligentes para macOS y Windows';
  }, []);

  return (
    <LandingLayout>
      {/* Hero Section — Poster scale text and breathing space */}
      <section className="relative pt-24 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center gap-12 overflow-hidden text-center">
        <div className="space-y-6 max-w-4xl z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-theme-accent/10 border border-theme-accent/20 text-theme-accent text-[10px] font-bold uppercase tracking-wider animate-fade-in mx-auto">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Control Local y Privado</span>
          </div>

          <h1 className="font-display font-bold text-5xl sm:text-7xl lg:text-8xl tracking-apple-display leading-[1.04] text-theme-text transition-colors duration-300">
            Luz pura.
            <br />
            Control local.
          </h1>

          <p className="text-base sm:text-xl text-theme-textSecondary font-light tracking-apple-subheading max-w-2xl mx-auto leading-relaxed transition-colors duration-300">
            Controla tus lámparas inteligentes Wi-Fi desde tu escritorio. Sin nubes lentas, sin registrar cuentas y con una respuesta instantánea de latencia cero.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              to="/download"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-theme-accent hover:opacity-90 active:scale-95 text-white font-bold rounded-full shadow-none transition-colors text-sm tracking-apple-body"
            >
              <Download className="w-4 h-4" />
              <span>Descargar la App</span>
            </Link>
            <Link
              to="/demo"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-theme-input hover:bg-theme-border border border-theme-border text-theme-text font-bold rounded-full active:scale-95 transition-colors text-sm tracking-apple-body"
            >
              <Play className="w-4 h-4 text-theme-accent" />
              <span>Probar Demo Online</span>
            </Link>
          </div>

          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-[10px] text-theme-textSecondary/80 font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> macOS & Windows Nativos
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-theme-accent" /> 100% Código Abierto
            </span>
          </div>
        </div>
      </section>

      <DeviceSimulatorShowcase finishes={finishes} />

      {/* How it Works Section — Gallery minimal steps */}
      <section className="py-24 px-6 border-t border-theme-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center space-y-3 mb-20">
            <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-apple-heading text-theme-text transition-colors">
              Listo en menos de un minuto
            </h2>
            <p className="text-theme-textSecondary text-sm sm:text-base font-light max-w-md mx-auto transition-colors">
              Sin configuraciones complejas en la nube. Descarga la aplicación y recupera el control.
            </p>
          </div>

          <div className="relative">
            {/* Horizontal line for desktop */}
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-px bg-theme-border" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-6">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center gap-4.5">
                <div className="relative">
                  <div className="w-24 h-24 rounded-[28px] bg-theme-card border border-theme-border flex items-center justify-center text-theme-accent shadow-none">
                    <Download className="w-8 h-8" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-theme-text text-theme-bg text-[10px] font-bold flex items-center justify-center shadow-none">
                    1
                  </span>
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-bold text-sm text-theme-text">Instala la App</h3>
                  <p className="text-xs text-theme-textSecondary leading-relaxed max-w-[220px] mx-auto font-medium">
                    Ejecuta Lumus Control nativamente en macOS o Windows. Sin registros ni cuentas obligatorias.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center gap-4.5">
                <div className="relative">
                  <div className="w-24 h-24 rounded-[28px] bg-theme-card border border-theme-border flex items-center justify-center text-theme-text shadow-none">
                    <Zap className="w-8 h-8" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-theme-text text-theme-bg text-[10px] font-bold flex items-center justify-center shadow-none">
                    2
                  </span>
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-bold text-sm text-theme-text">Escanea tu Red</h3>
                  <p className="text-xs text-theme-textSecondary leading-relaxed max-w-[220px] mx-auto font-medium">
                    La aplicación escanea tu red Wi-Fi local automáticamente y detecta tus lámparas WiZ al instante.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center gap-4.5">
                <div className="relative">
                  <div className="w-24 h-24 rounded-[28px] bg-theme-card border border-theme-border flex items-center justify-center text-theme-text shadow-none">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-theme-text text-theme-bg text-[10px] font-bold flex items-center justify-center shadow-none">
                    3
                  </span>
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-bold text-sm text-theme-text">Controla Directamente</h3>
                  <p className="text-xs text-theme-textSecondary leading-relaxed max-w-[220px] mx-auto font-medium">
                    Ajusta brillo, temperaturas o sincroniza el ciclo solar sin depender de internet o servidores caídos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid — Apple Light Card Grid Design */}
      <section id="features" className="py-24 px-6 bg-theme-sidebar/20 border-y border-theme-border transition-colors duration-300">
        <div className="max-w-7xl mx-auto space-y-20">
          <div className="text-center space-y-4">
            <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-apple-heading text-theme-text transition-colors">
              Velocidad, privacidad y confort visual
            </h2>
            <p className="text-theme-textSecondary max-w-xl mx-auto text-sm sm:text-base font-light transition-colors">
              Prescinde de servidores caídos, retrasos en la respuesta y complejidades innecesarias.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 — White Card */}
            <div className="glass-card flex flex-col justify-between h-[280px] p-7 ">
              <div className="space-y-4.5">
                <div className="w-10 h-10 rounded-full bg-theme-accent/10 border border-theme-accent/20 flex items-center justify-center text-theme-accent">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-theme-text">Cero Nube. Cero Lag.</h3>
                <p className="text-xs text-theme-textSecondary leading-relaxed font-medium">
                  Las órdenes se envían localmente desde tu equipo a las lámparas a través de tu Wi-Fi. Sin intermediarios, latencia nula.
                </p>
              </div>
              <span className="text-[10px] text-theme-accent font-bold uppercase tracking-wider flex items-center gap-1 mt-4">
                Velocidad Real <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>

            {/* Feature 2 — White Card */}
            <div className="glass-card flex flex-col justify-between h-[280px] p-7 ">
              <div className="space-y-4.5">
                <div className="w-10 h-10 rounded-full bg-theme-text/10 border border-theme-text/20 flex items-center justify-center text-theme-text">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-theme-text">Privado por Defecto</h3>
                <p className="text-xs text-theme-textSecondary leading-relaxed font-medium">
                  Tus datos nunca salen de tu red. No recopilamos telemetría ni registramos cuentas. Lumus Control te da soberanía sobre tus dispositivos.
                </p>
              </div>
              <span className="text-[10px] text-theme-text font-bold uppercase tracking-wider flex items-center gap-1 mt-4">
                Soberanía Digital <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>

            {/* Feature 3 — White Card */}
            <div className="glass-card flex flex-col justify-between h-[280px] p-7 ">
              <div className="space-y-4.5">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-theme-text">Ritmo Circadiano</h3>
                <p className="text-xs text-theme-textSecondary leading-relaxed font-medium">
                  Modula la temperatura y el brillo de la luz simulando el ciclo solar natural del día. Mejora tu concentración y tu descanso.
                </p>
              </div>
              <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider flex items-center gap-1 mt-4">
                Ciclo Biológico <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>

            {/* Feature 4 — White Card */}
            <div className="glass-card flex flex-col justify-between h-[280px] p-7 ">
              <div className="space-y-4.5">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-theme-text">Temporizador Suave</h3>
                <p className="text-xs text-theme-textSecondary leading-relaxed font-medium">
                  Programa apagados graduales para no quedarte a oscuras de golpe. Excelente para la rutina nocturna antes de ir a dormir.
                </p>
              </div>
              <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider flex items-center gap-1 mt-4">
                Apagado Progresivo <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Callout Section */}
      <section className="py-24 px-6 max-w-5xl mx-auto text-center space-y-8 z-10 relative">
        <div className="w-12 h-12 rounded-full bg-theme-accent/10 border border-theme-accent/20 flex items-center justify-center text-theme-accent mx-auto">
          <Laptop className="w-5 h-5" />
        </div>
        <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-apple-heading text-theme-text transition-colors">
          ¿Listo para experimentarlo?
        </h2>
        <p className="text-theme-textSecondary max-w-xl mx-auto text-sm sm:text-base font-light leading-relaxed transition-colors">
          Prueba la simulación interactiva completa de Lumus Control directamente en el navegador. Cambia colores, intensidades y experimenta el minimalismo antes de instalar.
        </p>
        <div>
          <Link
            to="/demo"
            className="inline-flex items-center gap-2 px-8 py-4 bg-theme-text hover:opacity-90 active:scale-95 text-theme-bg font-bold rounded-full shadow-none transition-colors text-sm tracking-apple-body"
          >
            <span>Lanzar Demo en el Navegador</span>
            <ArrowRight className="w-4 h-4 animate-bounce" />
          </Link>
        </div>
      </section>
    </LandingLayout>
  );
};
