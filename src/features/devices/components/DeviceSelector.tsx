import React, { useState } from 'react';
import { Plus, Edit2, Check, Radio } from 'lucide-react';
import { WizDevice } from '../../../types';

interface DeviceSelectorProps {
  selectedIp: string | null;
  onSelect: (ip: string) => void;
  devices: WizDevice[];
  onScan: () => Promise<void>;
  isScanning: boolean;
  onUpdateDeviceName: (ip: string, name: string) => void;
}

export const DeviceSelector: React.FC<DeviceSelectorProps> = ({
  selectedIp,
  onSelect,
  devices,
  onScan,
  isScanning,
  onUpdateDeviceName,
}) => {
  const [manualIp, setManualIp] = useState('');
  const [editingIp, setEditingIp] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');

  const isValidIp = (ip: string) => {
    // IPv4
    const parts4 = ip.split('.');
    if (parts4.length === 4) {
      return parts4.every((p) => {
        const n = Number(p);
        return !Number.isNaN(n) && n >= 0 && n <= 255 && String(n) === p;
      });
    }
    // IPv6 (basic validation: at least one colon, valid hex segments)
    if (ip.includes(':')) {
      const hasBracketStart = ip.startsWith('[');
      const hasBracketEnd = ip.endsWith(']');
      if ((hasBracketStart || hasBracketEnd) && !(hasBracketStart && hasBracketEnd)) return false;
      const clean = ip.replace(/^\[|\]$/g, '');
      const parts6 = clean.split(':');
      if (parts6.length < 2 || parts6.length > 8) return false;
      const emptyCount = parts6.filter((p) => p === '').length;
      if (emptyCount > 1) return false;
      if (emptyCount === 1 && clean !== '::' && !clean.includes('::')) return false;
      return parts6.every((p) => {
        if (p === '') return true;
        return /^[0-9a-fA-F]{1,4}$/.test(p);
      });
    }
    return false;
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanIp = manualIp.trim();
    if (isValidIp(cleanIp)) {
      onSelect(cleanIp);
      setManualIp('');
    }
  };

  const startEditing = (ip: string, currentName?: string) => {
    setEditingIp(ip);
    setTempName(currentName || '');
  };

  const saveName = (ip: string) => {
    onUpdateDeviceName(ip, tempName.trim());
    setEditingIp(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-theme-textSecondary font-display flex items-center gap-1.5 transition-colors duration-300">
          <Radio className={`w-3.5 h-3.5 ${isScanning ? 'animate-pulse text-theme-accent' : 'text-theme-textSecondary opacity-60'}`} />
          Dispositivos en red
        </h2>
        <button
          onClick={onScan}
          disabled={isScanning}
          className="px-3 py-1 text-xs font-medium bg-theme-input border border-theme-border rounded-lg hover:bg-theme-border text-theme-text transition-colors disabled:opacity-50 flex items-center gap-1"
        >
          {isScanning ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
        {devices.length === 0 ? (
          <p className="text-xs text-theme-textSecondary leading-relaxed transition-colors duration-300">
            Presiona "Buscar" para escanear tu red local en busca de lámparas WiZ.
          </p>
        ) : (
          devices.map((device) => {
            const isSelected = device.ip === selectedIp;
            const isEditing = device.ip === editingIp;

            return (
              <div
                key={device.ip}
                className={`group flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${
                  isSelected
                    ? 'border-blue-500/30 bg-blue-500/10'
                    : 'border-theme-border bg-theme-input hover:bg-theme-border'
                }`}
              >
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => !isEditing && onSelect(device.ip)}
                >
                  {isEditing ? (
                    <div className="flex items-center gap-2 pr-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        placeholder="Ej. Escritorio"
                        className="flex-1 bg-theme-input border border-theme-border rounded-md px-2 py-0.5 text-xs text-theme-text outline-none focus:border-theme-accent/40"
                        onKeyDown={(e) => e.key === 'Enter' && saveName(device.ip)}
                        autoFocus
                      />
                      <button
                        onClick={() => saveName(device.ip)}
                        className="p-1 hover:bg-theme-border rounded text-theme-green"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <span className="font-semibold text-xs text-theme-text truncate transition-colors duration-300">
                        {device.name || 'Lámpara WiZ'}
                      </span>
                      <span className="font-mono text-[10px] text-theme-textSecondary transition-colors duration-300">
                        {device.ip} {device.state?.state !== undefined && `· ${device.state.state ? 'Encendida' : 'Apagada'}`}
                      </span>
                    </div>
                  )}
                </div>

                {!isEditing && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditing(device.ip, device.name);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-theme-border rounded-lg text-theme-textSecondary hover:text-theme-text transition-all"
                    title="Editar nombre"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleManualAdd} className="flex gap-2">
        <input
          type="text"
          value={manualIp}
          onChange={(e) => setManualIp(e.target.value)}
          placeholder="Añadir IP manualmente..."
          className="flex-1 bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-mono text-theme-text outline-none focus:border-theme-accent/40 transition-colors"
        />
        <button
          type="submit"
          className="px-3 py-2 bg-theme-input border border-theme-border rounded-xl hover:bg-theme-border text-theme-text transition-colors flex items-center justify-center"
        >
          <Plus className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
