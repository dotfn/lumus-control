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
      <div className="flex items-center justify-between gap-2 border-b border-theme-border/60 pb-3 transition-colors duration-300">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-theme-textSecondary font-display flex items-center gap-1.5 transition-colors duration-300 whitespace-nowrap flex-shrink-0">
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
          className={`px-4 py-1.5 text-[11px] font-semibold rounded-full border transition-colors flex items-center justify-center gap-1.5 flex-shrink-0 active:scale-95 disabled:opacity-75 ${isScanning
            ? 'bg-theme-text/10 border-theme-text/20 text-theme-text'
            : 'bg-theme-card hover:bg-theme-input border-theme-border text-theme-text'
            }`}
        >
          {isScanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Buscar'}
        </button>
      </div>

      {/* Formulario de Habitación (Crear / Editar) */}
      {(isCreatingGroup || editingGroupId) && (
        <div className="p-3 bg-theme-input border border-theme-border rounded-[28px] space-y-3 transition-colors">
          <div className="flex items-center justify-between border-b border-theme-border/60 pb-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-theme-accent">
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
            <label className="text-[10px] font-semibold uppercase tracking-[0.05em] text-theme-textSecondary/80">Nombre</label>
            <input
              type="text"
              value={groupNameInput}
              onChange={(e) => setGroupNameInput(e.target.value)}
              placeholder="Ej. Living, Dormitorio..."
              className="w-full bg-theme-bg border border-theme-border rounded-xl px-2.5 py-1.5 text-xs text-theme-text outline-none focus:border-theme-accent transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-[0.05em] text-theme-textSecondary/80 block">Lámparas a incluir</label>
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
                        <div className="text-[10px] text-theme-textSecondary/60 truncate">
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
              className="px-3 py-1.5 text-[10px] font-semibold rounded-full border border-theme-border text-theme-textSecondary hover:bg-theme-input transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveGroup}
              disabled={!groupNameInput.trim()}
              className="px-4 py-1.5 text-[10px] font-semibold rounded-full bg-theme-accent text-white hover:opacity-90 disabled:opacity-50 transition-opacity shadow-none"
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
          <div className="flex items-center justify-between border-b border-theme-border/60 pb-2 transition-colors">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-theme-textSecondary flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5 text-theme-textSecondary opacity-80" />
              Habitaciones
            </h3>
            {!isCreatingGroup && !editingGroupId && (
              <button
                type="button"
                onClick={handleStartCreateGroup}
                className="px-3 py-1.5 bg-theme-card hover:bg-theme-input border border-theme-border rounded-full text-[10px] font-semibold text-theme-textSecondary hover:text-theme-text transition-colors flex items-center gap-1.5 active:scale-95 shadow-none"
                title="Añadir Habitación"
              >
                <Plus className="w-3 h-3 text-theme-accent" />
                Añadir
              </button>
            )}
          </div>

          {groups.length === 0 ? (
            !isCreatingGroup && !editingGroupId && (
              <div className="p-4 border border-dashed border-theme-border rounded-[28px] bg-theme-card/30 space-y-2.5 text-center transition-colors duration-300">
                <p className="text-[10px] text-theme-textSecondary/90 font-medium leading-relaxed">
                  Crea una habitación para agrupar tus lámparas (ej. Living, Dormitorio) y controlarlas todas juntas.
                </p>
                <button
                  type="button"
                  onClick={handleStartCreateGroup}
                  className="mx-auto px-4 py-1.5 bg-theme-card hover:bg-theme-input border border-theme-border text-[10px] font-semibold rounded-full transition-colors duration-344 flex items-center gap-1.5 text-theme-text active:scale-95"
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
                      className={`group/room relative flex items-center gap-3 p-4 rounded-[28px] border transition-colors duration-300 cursor-pointer shadow-none ${isSelected
                          ? 'border-theme-border bg-theme-card ring-1 ring-inset ring-theme-text/20'
                          : 'border-theme-border/30 bg-theme-card hover:bg-theme-input'
                        }`}
                      onClick={() => { onSelectGroup(group.id); toggleGroupExpanded(group.id); }}
                    >
                      {/* Room icon — light, same proportions as device rows */}
                      <div className="flex-shrink-0 p-1.5 bg-theme-card rounded-full border border-theme-border/60 flex items-center justify-center">
                        <Home className="w-3 h-3 text-theme-textSecondary/60" />
                      </div>

                      {/* Name + device count — gets all remaining space */}
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-[13px] leading-snug text-theme-text truncate block">
                          {group.name}
                        </span>
                        <span className="text-[10px] text-theme-textSecondary block mt-0.5">
                          {roomDevices.length} {roomDevices.length === 1 ? 'lámpara' : 'lámparas'}
                        </span>
                      </div>

                      {/* Edit/delete — absolute so they never compress the name */}
                      <div className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover/room:opacity-100 transition-opacity duration-150 pointer-events-none group-hover/room:pointer-events-auto">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleStartEditGroup(group); }}
                          className="p-1.5 rounded-full border border-theme-border bg-theme-card hover:bg-theme-input text-theme-textSecondary hover:text-theme-text transition-colors duration-150 active:scale-95"
                          title="Editar Habitación"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onDeleteGroup(group.id); }}
                          className="p-1.5 rounded-full border border-theme-border bg-theme-card hover:bg-theme-input text-theme-textSecondary hover:text-red-400 transition-colors duration-150 active:scale-95"
                          title="Eliminar Habitación"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Permanent right: selected dot + chevron */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isSelected && (
                          <span className="group-hover/room:opacity-0 transition-opacity duration-150 w-1.5 h-1.5 rounded-full bg-theme-accent animate-pulse" />
                        )}
                        <span className="text-theme-textSecondary/40">
                          {expanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Group Inner Devices List */}
                    {expanded && roomDevices.length > 0 && (
                      <div className="pl-3.5 space-y-1.5 border-l border-theme-border ml-[18px] py-1">
                        {roomDevices.map((device) => {
                          const isDeviceSelected = device.ip === selectedIp && (!selectedGroupId || selectedGroupId === group.id);
                          const isEditing = device.ip === editingIp;
                          const iconStyle = getDeviceIconStyle(device);

                          return (
                            <div
                              key={device.ip}
                              className={`group relative z-0 flex items-center gap-2.5 p-3 rounded-[28px] border transition-colors duration-300 shadow-none ${isDeviceSelected
                                  ? 'border-theme-text/40 bg-theme-text/[0.04]'
                                  : 'border-theme-border/20 bg-theme-card/50 hover:bg-theme-input'
                                }`}
                            >
                              <div
                                className="flex-shrink-0 p-1.5 bg-theme-card rounded-full border border-theme-border flex items-center justify-center cursor-pointer"
                                onClick={() => !isEditing && onSelect(device.ip)}
                              >
                                <Lightbulb
                                  className={`w-3.5 h-3.5 transition-[color,filter] duration-300 ${iconStyle.className}`}
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
                                      className="flex-1 min-w-0 bg-theme-input border border-theme-border rounded-full px-2 py-0.5 text-xs text-theme-text outline-none focus:border-theme-accent transition-colors"
                                    />
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        saveName(device.ip);
                                      }}
                                      className="p-1 hover:bg-theme-input rounded-full text-theme-green transition-colors"
                                    >
                                      <Check className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        cancelEditing();
                                      }}
                                      className="p-1 hover:bg-theme-input rounded-full text-theme-textSecondary transition-colors"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex flex-col min-w-0 pr-2">
                                    <span className="font-bold text-xs text-theme-text truncate block leading-tight tracking-apple-body">
                                      {device.name || 'Lámpara inteligente'}
                                    </span>
                                    <span className="text-[10px] text-theme-textSecondary/60 mt-0.5 truncate transition-opacity duration-200 group-hover:opacity-0">
                                      {device.ip}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {!isEditing && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
                                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 transition-opacity duration-200">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startEditing(device.ip, device.name);
                                      }}
                                      className="p-1.5 bg-theme-card hover:bg-theme-input border border-theme-border rounded-full text-theme-textSecondary hover:text-theme-text transition-colors duration-150 active:scale-95"
                                      title="Editar"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onExcludeDevice(device.ip);
                                      }}
                                      className="p-1.5 bg-theme-card hover:bg-theme-input border border-theme-border rounded-full text-theme-textSecondary hover:text-red-400 transition-colors duration-150 active:scale-95"
                                      title="Excluir"
                                    >
                                      <EyeOff className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  {isDeviceSelected && (
                                    <span className="group-hover:hidden flex items-center justify-center w-7 h-7">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
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
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-theme-textSecondary flex items-center gap-1.5 border-b border-theme-border/60 pb-2 transition-colors">
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
                    className={`group relative z-0 flex items-center gap-2.5 p-3 rounded-[28px] border transition-colors duration-300 shadow-none ${isSelected
                        ? 'border-theme-text/40 bg-theme-text/[0.04]'
                        : 'border-theme-border/30 bg-theme-card hover:bg-theme-input'
                      }`}
                  >
                    <div
                      className="flex-shrink-0 p-1.5 bg-theme-card rounded-full border border-theme-border flex items-center justify-center cursor-pointer"
                      onClick={() => !isEditing && onSelect(device.ip)}
                    >
                      <Lightbulb
                        className={`w-3.5 h-3.5 transition-[color,filter] duration-300 ${iconStyle.className}`}
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
                            className="flex-1 min-w-0 bg-theme-input border border-theme-border rounded-full px-2.5 py-1 text-xs text-theme-text outline-none focus:border-theme-accent transition-colors"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              saveName(device.ip);
                            }}
                            className="p-1.5 hover:bg-theme-input rounded-full text-theme-green transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelEditing();
                            }}
                            className="p-1.5 hover:bg-theme-input rounded-full text-theme-textSecondary transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="font-bold text-xs text-theme-text truncate tracking-apple-body">
                            {device.name || 'Lámpara inteligente'}
                          </span>
                          <div className="text-[10px] text-theme-textSecondary mt-0.5 flex items-center gap-1 min-w-0 transition-opacity duration-200 group-hover:opacity-0">
                            <span className="truncate">{device.ip}</span>
                            {device.state?.state !== undefined && (
                              <>
                                <span className="flex-shrink-0">·</span>
                                <span className={`flex-shrink-0 font-sans tracking-apple-body-sm ${device.state.state ? 'text-amber-500' : 'text-theme-textSecondary'}`}>
                                  {device.state.state ? 'Encendida' : 'Apagada'}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 transition-opacity duration-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(device.ip, device.name);
                            }}
                            className="p-1.5 bg-theme-card hover:bg-theme-input border border-theme-border rounded-full text-theme-textSecondary hover:text-theme-text transition-colors duration-150 active:scale-95"
                            title="Editar"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onExcludeDevice(device.ip);
                            }}
                            className="p-1.5 bg-theme-card hover:bg-theme-input border border-theme-border rounded-full text-theme-textSecondary hover:text-red-400 transition-colors duration-150 active:scale-95"
                            title="Excluir"
                          >
                            <EyeOff className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {isSelected && (
                          <span className="group-hover:hidden flex items-center justify-center w-7 h-7 bg-theme-input/40 backdrop-blur-md rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
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
          <div className="flex flex-col items-center justify-center py-10 px-6 text-center border border-dashed border-theme-border rounded-[28px] bg-theme-input/20 space-y-4 transition-colors duration-300 shadow-none">
            <div className="p-3 bg-theme-card rounded-full border border-theme-border flex items-center justify-center">
              <Network className="w-5 h-5 text-theme-textSecondary opacity-40 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h4 className="text-[11px] font-semibold text-theme-text uppercase tracking-[0.06em]">
                {devices.length > 0 ? 'Dispositivos ocultos' : 'Sin dispositivos'}
              </h4>
              <p className="text-[10px] text-theme-textSecondary leading-relaxed max-w-[200px] mx-auto tracking-apple-body-sm">
                {devices.length > 0
                  ? 'Todas las lámparas detectadas han sido excluidas de la vista.'
                  : 'Haz clic en "Buscar" para rastrear lámparas inteligentes Wi-Fi en tu red.'}
              </p>
            </div>
            {devices.length === 0 && !isCreatingGroup && !editingGroupId && (
              <button
                type="button"
                onClick={handleStartCreateGroup}
                className="px-4 py-2 bg-theme-card hover:bg-theme-input border border-theme-border text-[10px] font-semibold rounded-full transition-colors flex items-center gap-1.5 text-theme-text shadow-none"
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
        <div className="border-t border-theme-border/60 pt-3">
          <button
            type="button"
            onClick={() => setShowExcluded(!showExcluded)}
            className="w-full flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.06em] text-theme-textSecondary hover:text-theme-text transition-colors pb-1 outline-none focus:text-theme-text"
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
                    className="flex items-center gap-2.5 p-3 rounded-[28px] bg-theme-card border border-theme-border/30 text-xs transition-colors hover:bg-theme-input shadow-none"
                  >
                    <div className="flex-shrink-0 p-1.5 bg-theme-card rounded-full border border-theme-border flex items-center justify-center">
                      <Lightbulb className="w-3.5 h-3.5 text-theme-textSecondary opacity-30" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-theme-text/60 truncate text-[11px] leading-tight">
                        {device.name || 'Lámpara inteligente'}
                      </div>
                      <div className="text-[10px] text-theme-textSecondary/50 truncate mt-0.5">
                        {device.ip}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onIncludeDevice(ip)}
                      className="p-1.5 hover:bg-theme-input rounded-full text-theme-textSecondary hover:text-theme-accent transition-colors flex-shrink-0"
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
          className="w-full bg-theme-input border border-theme-border rounded-full pl-9 pr-12 py-2.5 text-xs  text-theme-text placeholder-theme-textSecondary/60 outline-none focus:border-theme-accent transition-colors duration-300 shadow-none"
        />
        <button
          type="submit"
          disabled={!isValidIp(manualIp.trim())}
          aria-label="Añadir dispositivo por IP"
          className="absolute right-1.5 p-1.5 bg-theme-card hover:bg-theme-input border border-theme-border text-theme-text rounded-full transition-[color,opacity] duration-200 flex items-center justify-center active:scale-90 disabled:opacity-30 disabled:pointer-events-none shadow-none"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
};