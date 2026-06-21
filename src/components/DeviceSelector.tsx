import React, { useState } from 'react';
import { Plus, Edit2, Check, Radio } from 'lucide-react';
import { WizDevice } from '../types';

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

  const isValidIpv4 = (ip: string) => {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    return parts.every((p) => {
      const n = Number(p);
      return !Number.isNaN(n) && n >= 0 && n <= 255 && String(n) === p;
    });
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanIp = manualIp.trim();
    if (isValidIpv4(cleanIp)) {
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
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#9a968c] font-display flex items-center gap-1.5">
          <Radio className={`w-3.5 h-3.5 ${isScanning ? 'animate-pulse text-amber-400' : 'text-slate-400'}`} />
          Dispositivos en red
        </h2>
        <button
          onClick={onScan}
          disabled={isScanning}
          className="px-3 py-1 text-xs font-medium bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 flex items-center gap-1"
        >
          {isScanning ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
        {devices.length === 0 ? (
          <p className="text-xs text-[#9a968c] leading-relaxed">
            Presiona "Buscar" para escanear tu red local en busca de lámparas WiZ.
          </p>
        ) : (
          devices.map((device) => {
            const isSelected = device.ip === selectedIp;
            const isEditing = device.ip === editingIp;

            return (
              <div
                key={device.ip}
                className={`group flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${
                  isSelected
                    ? 'border-amber-400/30 bg-amber-400/5'
                    : 'border-white/5 bg-white/[0.02] hover:bg-white/5'
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
                        className="flex-1 bg-white/5 border border-white/10 rounded-md px-2 py-0.5 text-xs text-white outline-none focus:border-amber-400/40"
                        onKeyDown={(e) => e.key === 'Enter' && saveName(device.ip)}
                        autoFocus
                      />
                      <button
                        onClick={() => saveName(device.ip)}
                        className="p-1 hover:bg-white/10 rounded text-green-400"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <span className="font-semibold text-xs text-[#f5f2ea] truncate">
                        {device.name || 'Lámpara WiZ'}
                      </span>
                      <span className="font-mono text-[10px] text-[#9a968c]">
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
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/10 rounded-lg text-[#9a968c] hover:text-white transition-all"
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
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-amber-400/40 transition-colors"
        />
        <button
          type="submit"
          className="px-3 py-2 bg-white/10 border border-white/10 rounded-xl hover:bg-white/15 transition-colors flex items-center justify-center"
        >
          <Plus className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
