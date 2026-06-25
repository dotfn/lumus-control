import React, { useState, useRef } from 'react';
import { Plus, Edit2, Check, X, Radio, Loader2, Lightbulb, Globe, Network, Eye, EyeOff, ChevronDown, ChevronUp, Home, Trash2, ChevronRight } from 'lucide-react';
import { LightDevice } from '../../../types';
import { DeviceGroup } from '../store/deviceStore';

interface DeviceSelectorProps {
  selectedIp: string | null;
  onSelect: (ip: string) => void;
  devices: LightDevice[];
  onScan: () => Promise<void>;
  isScanning: boolean;
  onUpdateDeviceName: (ip: string, name: string) => void;
  excludedIps: string[];
  onExcludeDevice: (ip: string) => void;
  onIncludeDevice: (ip: string) => void;
  deviceNames: Record<string, string>;
  groups: DeviceGroup[];
  selectedGroupId: string | null;
  onCreateGroup: (name: string, deviceIps: string[]) => void;
  onUpdateGroup: (id: string, name: string, deviceIps: string[]) => void;
  onDeleteGroup: (id: string) => void;
  onSelectGroup: (id: string | null) => void;
}

export const DeviceSelector: React.FC<DeviceSelectorProps> = ({
  selectedIp,
  onSelect,
  devices,
  onScan,
  isScanning,
  onUpdateDeviceName,
  excludedIps,
  onExcludeDevice,
  onIncludeDevice,
  deviceNames,
  groups,
  selectedGroupId,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  onSelectGroup,
}) => {
  const [manualIp, setManualIp] = useState('');
  const [editingIp, setEditingIp] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const [showExcluded, setShowExcluded] = useState(false);
  const manualIpInputId = 'manual-ip-input';
  const editInputRef = useRef<HTMLInputElement>(null);

  // Group creation & editing states
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [selectedGroupIps, setSelectedGroupIps] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const isValidIp = (ip: string) => {
    // IPv4
    const parts4 = ip.split('.');
    if (parts4.length === 4) {
      return parts4.every((p) => {
        const n = Number(p);
        return !Number.isNaN(n) && n >= 0 && n <= 255 && String(n) === p;
      });
    }
    // IPv6
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
    // Focus handled via ref after render
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const saveName = (ip: string) => {
    onUpdateDeviceName(ip, tempName.trim());
    setEditingIp(null);
  };

  const cancelEditing = () => {
    setEditingIp(null);
    setTempName('');
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, ip: string) => {
    if (e.key === 'Enter') saveName(ip);
    if (e.key === 'Escape') cancelEditing();
  };

  // Group helpers
  const toggleGroupIpSelection = (ip: string) => {
    setSelectedGroupIps((prev) =>
      prev.includes(ip) ? prev.filter((item) => item !== ip) : [...prev, ip]
    );
  };

  const handleStartCreateGroup = () => {
    setGroupNameInput('');
    setSelectedGroupIps([]);
    setEditingGroupId(null);
    setIsCreatingGroup(true);
  };

  const handleStartEditGroup = (group: DeviceGroup) => {
    setGroupNameInput(group.name);
    setSelectedGroupIps(group.deviceIps);
    setEditingGroupId(group.id);
    setIsCreatingGroup(false);
  };

  const handleCancelGroupForm = () => {
    setIsCreatingGroup(false);
    setEditingGroupId(null);
    setGroupNameInput('');
    setSelectedGroupIps([]);
  };

  const handleSaveGroup = () => {
    if (!groupNameInput.trim()) return;
    if (editingGroupId) {
      onUpdateGroup(editingGroupId, groupNameInput.trim(), selectedGroupIps);
    } else {
      onCreateGroup(groupNameInput.trim(), selectedGroupIps);
    }
    handleCancelGroupForm();
  };

  const toggleGroupExpanded = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: prev[groupId] === false ? true : false,
    }));
  };

  const isGroupExpanded = (groupId: string) => {
    return expandedGroups[groupId] !== false;
  };

  // Dynamically estimate lightbulb colors and dropshadows based on active state parameters
  const getDeviceIconStyle = (device: LightDevice) => {
    const state = device.state;
    if (!state || !state.state) {
      return { className: 'text-theme-textSecondary opacity-40', style: {} };
    }

    if (state.r !== undefined && state.g !== undefined && state.b !== undefined) {
      return {
        className: '',
        style: {
          color: `rgb(${state.r}, ${state.g}, ${state.b})`,
          filter: `drop-shadow(0 0 6px rgba(${state.r}, ${state.g}, ${state.b}, 0.65))`,
        },
      };
    }

    if (state.temp !== undefined) {
      const isWarm = state.temp < 4000;
      return {
        className: '',
        style: {
          color: isWarm ? 'rgb(251, 191, 36)' : 'rgb(147, 197, 253)',
          filter: `drop-shadow(0 0 6px ${isWarm ? 'rgba(251, 191, 36, 0.65)' : 'rgba(147, 197, 253, 0.65)'
            })`,
        },
      };
    }

    return {
      className: 'text-amber-400',
      style: { filter: 'drop-shadow(0 0 6px rgba(251, 191, 36, 0.65))' },
    };
  };

  const ipsInGroups = groups.flatMap((g) => g.deviceIps);
  const individualDevices = devices.filter(
    (d) => !excludedIps.includes(d.ip) && !ipsInGroups.includes(d.ip)
  );

  return (
    <div className="space-y-4">
      {/* Header section */}
      <div className="flex items-center justify-between gap-2 border-b border-theme-border pb-3 transition-colors duration-300">
        <h2 className="text-[10px] font-bold uppercase tracking-wider text-theme-textSecondary font-display flex items-center gap-1.5 transition-colors duration-300 whitespace-nowrap flex-shrink-0">
          <Radio
            className={`w-3.5 h-3.5 ${isScanning
                ? 'animate-pulse text-theme-accent'
                : 'text-theme-textSecondary opacity-60'
              }`}
          />
          Dispositivos en red
        </h2>
        <button
          onClick={onScan}
          disabled={isScanning}
          className={`w-20 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all flex items-center justify-center flex-shrink-0 active:scale-95 disabled:opacity-75 ${isScanning
              ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
              : 'bg-theme-input hover:bg-theme-border border-theme-border text-theme-text'
            }`}
        >
          {isScanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Buscar'}
        </button>
      </div>

      {/* Formulario de Habitación (Crear / Editar) */}
      {(isCreatingGroup || editingGroupId) && (
        <div className="p-3 bg-theme-input border border-theme-border rounded-2xl space-y-3 transition-all">
          <div className="flex items-center justify-between border-b border-theme-border pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-theme-accent">
              {editingGroupId ? 'Editar Habitación' : 'Nueva Habitación'}
            </span>
            <button
              type="button"
              onClick={handleCancelGroupForm}
              className="p-1 hover:bg-theme-border rounded-lg text-theme-textSecondary transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-bold uppercase tracking-wider text-theme-textSecondary/80">Nombre</label>
            <input
              type="text"
              value={groupNameInput}
              onChange={(e) => setGroupNameInput(e.target.value)}
              placeholder="Ej. Living, Dormitorio..."
              className="w-full bg-theme-bg border border-theme-border rounded-xl px-2.5 py-1.5 text-xs text-theme-text outline-none focus:border-theme-accent transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-bold uppercase tracking-wider text-theme-textSecondary/80 block">Dispositivos a incluir</label>
            <div className="max-h-32 overflow-y-auto custom-scrollbar border border-theme-border rounded-xl p-1 bg-theme-bg/50 space-y-0.5">
              {devices
                .filter((d) => !excludedIps.includes(d.ip))
                .map((device) => {
                  const isChecked = selectedGroupIps.includes(device.ip);
                  return (
                    <label
                      key={device.ip}
                      className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-theme-input cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleGroupIpSelection(device.ip)}
                        className="accent-theme-accent rounded border-theme-border w-3.5 h-3.5 cursor-pointer"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate text-[11px] leading-tight text-theme-text">
                          {device.name || 'Lámpara inteligente'}
                        </div>
                        <div className="font-mono text-[8px] text-theme-textSecondary/60 truncate">
                          {device.ip}
                        </div>
                      </div>
                    </label>
                  );
                })}
              {devices.filter((d) => !excludedIps.includes(d.ip)).length === 0 && (
                <div className="p-3 text-center text-[10px] text-theme-textSecondary/60">
                  No hay dispositivos activos disponibles.
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={handleCancelGroupForm}
              className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-theme-border text-theme-textSecondary hover:bg-theme-border transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveGroup}
              disabled={!groupNameInput.trim()}
              className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-theme-accent text-white hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* Main scrolling section for groups and unassigned devices */}
      <div className="space-y-4 pt-1 pr-1">
        {/* Rooms / Groups section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b border-theme-border pb-2 transition-colors">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-theme-textSecondary flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5 text-theme-textSecondary opacity-80" />
              Habitaciones
            </h3>
            {!isCreatingGroup && !editingGroupId && (
              <button
                type="button"
                onClick={handleStartCreateGroup}
                className="px-2 py-0.5 bg-theme-bg hover:bg-theme-border border border-theme-border rounded-lg text-[9px] font-bold uppercase tracking-wider text-theme-textSecondary hover:text-theme-accent transition-all flex items-center gap-1 active:scale-95 shadow-sm"
                title="Añadir Habitación"
              >
                <Plus className="w-3 h-3 text-theme-accent" />
                Añadir
              </button>
            )}
          </div>

          {groups.length === 0 ? (
            !isCreatingGroup && !editingGroupId && (
              <div className="p-3.5 border border-dashed border-theme-border rounded-2xl bg-theme-input/40 space-y-2.5 text-center transition-all duration-300">
                <p className="text-[10px] text-theme-textSecondary leading-relaxed">
                  Crea una habitación para agrupar tus lámparas (ej. Living, Dormitorio) y controlarlas todas juntas.
                </p>
                <button
                  type="button"
                  onClick={handleStartCreateGroup}
                  className="mx-auto px-3 py-1.5 bg-theme-bg border border-theme-border hover:bg-theme-input text-[9px] font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-1 text-theme-text active:scale-95"
                >
                  <Plus className="w-3 h-3 text-theme-accent" />
                  Crear Habitación
                </button>
              </div>
            )
          ) : (
            <div className="space-y-2">
              {groups.map((group) => {
                const isSelected = selectedGroupId === group.id;
                const expanded = isGroupExpanded(group.id);
                const roomDevices = devices.filter((d) => group.deviceIps.includes(d.ip) && !excludedIps.includes(d.ip));

                return (
                  <div key={group.id} className="space-y-1.5">
                    {/* Group Header Card */}
                    <div
                      className={`group/room relative z-0 flex items-center justify-between p-2.5 rounded-2xl border transition-all duration-300 cursor-pointer ${
                        isSelected
                          ? 'border-blue-500/30 bg-blue-500/5 dark:bg-blue-500/10 shadow-[0_2px_10px_rgba(0,122,255,0.06)]'
                          : 'border-theme-border bg-theme-input hover:bg-theme-border'
                      }`}
                      onClick={() => onSelectGroup(group.id)}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleGroupExpanded(group.id);
                          }}
                          className="p-1 hover:bg-theme-border rounded-lg text-theme-textSecondary transition-colors"
                        >
                          {expanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <Home className="w-3.5 h-3.5 text-theme-textSecondary opacity-70 flex-shrink-0" />
                        <div className="min-w-0 pr-2">
                          <span className="font-bold text-xs text-theme-text truncate block leading-tight">
                            {group.name}
                          </span>
                          <span className="text-[9px] text-theme-textSecondary font-mono block mt-0.5 transition-opacity duration-200 group-hover/room:opacity-0">
                            {roomDevices.length} {roomDevices.length === 1 ? 'lámpara' : 'lámparas'}
                          </span>
                        </div>
                      </div>

                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
                        <div className="opacity-0 group-hover/room:opacity-100 flex items-center gap-1.5 transition-all duration-200">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEditGroup(group);
                            }}
                            className="p-1.5 bg-theme-bg hover:bg-theme-border border border-theme-border rounded-xl text-theme-textSecondary hover:text-theme-text shadow-sm transition-all duration-150 active:scale-95"
                            title="Editar Habitación"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteGroup(group.id);
                            }}
                            className="p-1.5 bg-theme-bg hover:bg-theme-border border border-theme-border rounded-xl text-theme-textSecondary hover:text-red-400 shadow-sm transition-all duration-150 active:scale-95"
                            title="Eliminar Habitación"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        {isSelected && (
                          <span className="group-hover/room:hidden transition-all duration-200 flex items-center justify-center w-7 h-7">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 ring-4 ring-blue-400/20 animate-pulse" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Group Inner Devices List */}
                    {expanded && roomDevices.length > 0 && (
                      <div className="pl-3.5 space-y-1.5 border-l border-theme-border ml-4.5 py-1">
                        {roomDevices.map((device) => {
                          const isDeviceSelected = device.ip === selectedIp && !selectedGroupId;
                          const isEditing = device.ip === editingIp;
                          const iconStyle = getDeviceIconStyle(device);

                          return (
                            <div
                              key={device.ip}
                              className={`group relative z-0 flex items-center gap-2.5 p-2.5 rounded-2xl border transition-all duration-200 ${
                                isDeviceSelected
                                  ? 'border-blue-500/20 bg-blue-500/5'
                                  : 'border-transparent bg-theme-input/40 hover:bg-theme-border/40'
                              }`}
                            >
                              <div
                                className="flex-shrink-0 p-1.5 bg-theme-bg rounded-xl border border-theme-border flex items-center justify-center cursor-pointer"
                                onClick={() => !isEditing && onSelect(device.ip)}
                              >
                                <Lightbulb
                                  className={`w-3.5 h-3.5 transition-all duration-300 ${iconStyle.className}`}
                                  style={iconStyle.style}
                                />
                              </div>

                              <div
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() => !isEditing && onSelect(device.ip)}
                              >
                                {isEditing ? (
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      ref={editInputRef}
                                      type="text"
                                      value={tempName}
                                      onChange={(e) => setTempName(e.target.value)}
                                      onKeyDown={(e) => handleEditKeyDown(e, device.ip)}
                                      className="flex-1 min-w-0 bg-theme-input border border-theme-border rounded-xl px-2 py-0.5 text-xs text-theme-text outline-none focus:border-theme-accent transition-colors"
                                    />
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        saveName(device.ip);
                                      }}
                                      className="p-1 hover:bg-theme-border rounded-lg text-theme-green transition-all"
                                    >
                                      <Check className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        cancelEditing();
                                      }}
                                      className="p-1 hover:bg-theme-border rounded-lg text-theme-textSecondary transition-all"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex flex-col min-w-0 pr-2">
                                    <span className="font-bold text-xs text-theme-text truncate block leading-tight">
                                      {device.name || 'Lámpara inteligente'}
                                    </span>
                                    <span className="font-mono text-[9px] text-theme-textSecondary/60 mt-0.5 truncate transition-opacity duration-200 group-hover:opacity-0">
                                      {device.ip}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {!isEditing && (
                                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
                                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 transition-all duration-200">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startEditing(device.ip, device.name);
                                      }}
                                      className="p-1.5 bg-theme-bg hover:bg-theme-border border border-theme-border rounded-xl text-theme-textSecondary hover:text-theme-text shadow-sm transition-all duration-150 active:scale-95"
                                      title="Editar"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onExcludeDevice(device.ip);
                                      }}
                                      className="p-1.5 bg-theme-bg hover:bg-theme-border border border-theme-border rounded-xl text-theme-textSecondary hover:text-red-400 shadow-sm transition-all duration-150 active:scale-95"
                                      title="Excluir"
                                    >
                                      <EyeOff className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  {isDeviceSelected && (
                                    <span className="group-hover:hidden flex items-center justify-center w-7 h-7">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20 animate-pulse" />
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Individual devices section (unassigned) */}
        {individualDevices.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-theme-textSecondary flex items-center gap-1.5 border-b border-theme-border pb-2 transition-colors">
              <Radio className="w-3.5 h-3.5 text-theme-textSecondary opacity-60" />
              Lámparas sin asignar
            </h3>

            <div className="space-y-2.5">
              {individualDevices.map((device) => {
                const isSelected = device.ip === selectedIp && !selectedGroupId;
                const isEditing = device.ip === editingIp;
                const iconStyle = getDeviceIconStyle(device);

                return (
                  <div
                    key={device.ip}
                    className={`group relative z-0 flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300 ${
                      isSelected
                        ? 'border-blue-500/30 bg-blue-500/5 dark:bg-blue-500/10 shadow-[0_2px_10px_rgba(0,122,255,0.06)]'
                        : 'border-theme-border bg-theme-input hover:bg-theme-border'
                    }`}
                  >
                    <div
                      className="flex-shrink-0 p-2 bg-theme-bg rounded-xl border border-theme-border flex items-center justify-center cursor-pointer"
                      onClick={() => !isEditing && onSelect(device.ip)}
                    >
                      <Lightbulb
                        className={`w-4 h-4 transition-all duration-300 ${iconStyle.className}`}
                        style={iconStyle.style}
                      />
                    </div>

                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => !isEditing && onSelect(device.ip)}
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            ref={editInputRef}
                            type="text"
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            onKeyDown={(e) => handleEditKeyDown(e, device.ip)}
                            className="flex-1 min-w-0 bg-theme-input border border-theme-border rounded-xl px-2.5 py-1 text-xs text-theme-text outline-none focus:border-theme-accent transition-colors"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              saveName(device.ip);
                            }}
                            className="p-1.5 hover:bg-theme-border rounded-lg text-theme-green transition-all"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelEditing();
                            }}
                            className="p-1.5 hover:bg-theme-border rounded-lg text-theme-textSecondary transition-all"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="font-bold text-xs text-theme-text truncate">
                            {device.name || 'Lámpara inteligente'}
                          </span>
                          <div className="font-mono text-[9px] text-theme-textSecondary mt-0.5 flex items-center gap-1 min-w-0 transition-opacity duration-200 group-hover:opacity-0">
                            <span className="truncate">{device.ip}</span>
                            {device.state?.state !== undefined && (
                              <>
                                <span className="flex-shrink-0">·</span>
                                <span className={`flex-shrink-0 ${device.state.state ? 'text-amber-400' : 'text-theme-textSecondary'}`}>
                                  {device.state.state ? 'Encendida' : 'Apagada'}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 transition-all duration-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(device.ip, device.name);
                            }}
                            className="p-1.5 bg-theme-bg hover:bg-theme-border border border-theme-border rounded-xl text-theme-textSecondary hover:text-theme-text shadow-sm transition-all duration-150 active:scale-95"
                            title="Editar"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onExcludeDevice(device.ip);
                            }}
                            className="p-1.5 bg-theme-bg hover:bg-theme-border border border-theme-border rounded-xl text-theme-textSecondary hover:text-red-400 shadow-sm transition-all duration-150 active:scale-95"
                            title="Excluir"
                          >
                            <EyeOff className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {isSelected && (
                          <span className="group-hover:hidden flex items-center justify-center w-7 h-7 bg-theme-input/40 backdrop-blur-sm rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20 animate-pulse" />
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Global Empty State (no rooms and no individual devices) */}
        {groups.length === 0 && individualDevices.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center border border-dashed border-theme-border rounded-2xl bg-theme-input space-y-3 transition-all duration-300">
            <div className="p-3 bg-theme-input rounded-full border border-theme-border flex items-center justify-center">
              <Network className="w-5 h-5 text-theme-textSecondary opacity-40 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h4 className="text-[11px] font-bold text-theme-text uppercase tracking-wider">
                {devices.length > 0 ? 'Dispositivos ocultos' : 'Sin dispositivos'}
              </h4>
              <p className="text-[10px] text-theme-textSecondary leading-relaxed max-w-[200px] mx-auto">
                {devices.length > 0
                  ? 'Todas las lámparas detectadas han sido excluidas de la vista.'
                  : 'Haz clic en "Buscar" para rastrear lámparas inteligentes Wi-Fi en tu red.'}
              </p>
            </div>
            {devices.length === 0 && !isCreatingGroup && !editingGroupId && (
              <button
                type="button"
                onClick={handleStartCreateGroup}
                className="px-3 py-1.5 bg-theme-input hover:bg-theme-border border border-theme-border text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-1 text-theme-text"
              >
                <Plus className="w-3 h-3" />
                Crear Habitación
              </button>
            )}
          </div>
        )}
      </div>

      {/* Collapsible excluded devices section */}
      {excludedIps.length > 0 && (
        <div className="border-t border-theme-border pt-3">
          <button
            type="button"
            onClick={() => setShowExcluded(!showExcluded)}
            className="w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-theme-textSecondary hover:text-theme-text transition-colors pb-1 outline-none focus:text-theme-text"
          >
            <span className="flex items-center gap-1.5">
              <EyeOff className="w-3.5 h-3.5 opacity-60" />
              Dispositivos excluidos ({excludedIps.length})
            </span>
            {showExcluded ? (
              <ChevronUp className="w-3.5 h-3.5 text-theme-textSecondary" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-theme-textSecondary/60" />
            )}
          </button>

          {showExcluded && (
            <div className="mt-2 space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-1 py-1">
              {excludedIps.map((ip) => {
                const device = devices.find((d) => d.ip === ip) || {
                  ip,
                  name: deviceNames[ip] || undefined,
                };
                return (
                  <div
                    key={ip}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-theme-input border border-theme-border text-xs transition-colors hover:bg-theme-border"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="font-bold text-theme-text/80 truncate text-[11px] leading-tight">
                        {device.name || 'Lámpara inteligente'}
                      </div>
                      <div className="font-mono text-[9px] text-theme-textSecondary/50 truncate mt-0.5">
                        {device.ip}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onIncludeDevice(ip)}
                      className="p-1.5 hover:bg-theme-border rounded-lg text-theme-textSecondary hover:text-theme-accent transition-all flex-shrink-0"
                      title="Restaurar dispositivo"
                      aria-label={`Restaurar dispositivo ${device.name || device.ip}`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Manual IP input form */}
      <form onSubmit={handleManualAdd} className="relative flex items-center group w-full pt-1.5">
        <label htmlFor={manualIpInputId} className="sr-only">
          Dirección IP manual
        </label>
        <div className="absolute left-3.5 text-theme-textSecondary opacity-40 group-focus-within:text-theme-accent group-focus-within:opacity-80 transition-colors duration-200 pointer-events-none">
          <Globe className="w-3.5 h-3.5" />
        </div>
        <input
          id={manualIpInputId}
          type="text"
          value={manualIp}
          onChange={(e) => setManualIp(e.target.value)}
          placeholder="Añadir IP manualmente..."
          className="w-full bg-theme-input border border-theme-border rounded-2xl pl-9 pr-10 py-2.5 text-xs font-mono text-theme-text placeholder-theme-textSecondary/60 outline-none focus:border-theme-accent transition-all duration-300"
        />
        <button
          type="submit"
          disabled={!isValidIp(manualIp.trim())}
          aria-label="Añadir dispositivo por IP"
          className="absolute right-1.5 p-1.5 bg-theme-input hover:bg-theme-border border border-theme-border text-theme-text rounded-xl transition-all duration-200 flex items-center justify-center active:scale-90 disabled:opacity-30 disabled:pointer-events-none"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
};