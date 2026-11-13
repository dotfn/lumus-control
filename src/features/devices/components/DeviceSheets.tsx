import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useDeviceStore } from '../store/deviceStore';
import { useVisibleDevices } from '../selectors';
import { lampName } from '../../../utils/lampAppearance';
import { LampTile, Sheet } from '../../shell/components/primitives';

interface RoomSheetProps {
  /** Habitación a editar; sin id se crea una nueva. */
  groupId?: string;
  onClose: () => void;
}

export const RoomSheet: React.FC<RoomSheetProps> = ({ groupId, onClose }) => {
  const groups = useDeviceStore((s) => s.groups);
  const createGroup = useDeviceStore((s) => s.createGroup);
  const updateGroup = useDeviceStore((s) => s.updateGroup);
  const deleteGroup = useDeviceStore((s) => s.deleteGroup);
  const selectGroup = useDeviceStore((s) => s.selectGroup);
  const visible = useVisibleDevices();

  const editing = groups.find((g) => g.id === groupId);
  const [name, setName] = useState(editing?.name ?? '');
  const [macs, setMacs] = useState<string[]>(editing?.deviceMacs ?? []);

  const toggle = (mac: string) => {
    setMacs((prev) => (prev.includes(mac) ? prev.filter((m) => m !== mac) : [...prev, mac]));
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;

    if (editing) {
      updateGroup(editing.id, cleanName, macs);
    } else {
      createGroup(cleanName, macs);
      const created = useDeviceStore.getState().groups;
      selectGroup(created[created.length - 1].id);
    }
    onClose();
  };

  return (
    <Sheet
      title={editing ? 'Editar habitación' : 'Nueva habitación'}
      description="Las lámparas de una habitación se controlan juntas con un solo ajuste."
      onClose={onClose}
    >
      <form onSubmit={save} style={{ display: 'contents' }}>
        <label className="mac-field-label" htmlFor="room-name">
          Nombre
        </label>
        <input
          id="room-name"
          className="mac-input"
          value={name}
          maxLength={40}
          placeholder="Living, Dormitorio…"
          onChange={(e) => setName(e.target.value)}
        />

        <span className="mac-field-label">Lámparas</span>
        <div className="mac-sheet__body">
          <div className="mac-group">
            {visible.length === 0 && (
              <div className="mac-row">
                <span className="mac-row__hint">Todavía no se encontró ninguna lámpara.</span>
              </div>
            )}
            {visible.map((device) => (
              <label key={device.mac} className="mac-row">
                <input
                  type="checkbox"
                  className="mac-check"
                  checked={macs.includes(device.mac)}
                  onChange={() => toggle(device.mac)}
                />
                <LampTile device={device} />
                <span className="mac-row__text mac-row__label">{lampName(device)}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mac-sheet__actions">
          {editing && (
            <button
              type="button"
              className="mac-btn mac-btn--destructive"
              onClick={() => {
                deleteGroup(editing.id);
                onClose();
              }}
            >
              Eliminar habitación
            </button>
          )}
          <span className="mac-sheet__actions-spacer" />
          <button type="button" className="mac-btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="mac-btn mac-btn--primary" disabled={!name.trim()}>
            {editing ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </form>
    </Sheet>
  );
};

export const AddLampSheet: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const addDeviceByIp = useDeviceStore((s) => s.addDeviceByIp);
  const [ip, setIp] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanIp = ip.trim().replace(/^\[|\]$/g, '');
    if (!cleanIp || isAdding) return;

    setIsAdding(true);
    setError(null);
    const failure = await addDeviceByIp(cleanIp);
    setIsAdding(false);
    if (failure) {
      setError(failure);
    } else {
      onClose();
    }
  };

  return (
    <Sheet
      title="Añadir lámpara por IP"
      description="Para lámparas que la búsqueda automática no encuentra, por ejemplo en otra subred."
      onClose={onClose}
    >
      <form onSubmit={submit} style={{ display: 'contents' }}>
        <label className="mac-field-label" htmlFor="lamp-ip">
          Dirección IP
        </label>
        <input
          id="lamp-ip"
          className="mac-input"
          value={ip}
          placeholder="192.168.1.50"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={error !== null}
          onChange={(e) => {
            setIp(e.target.value);
            setError(null);
          }}
        />
        {error && (
          <p className="mac-error" role="alert">
            {error}
          </p>
        )}

        <div className="mac-sheet__actions">
          <button type="button" className="mac-btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="mac-btn mac-btn--primary" disabled={!ip.trim() || isAdding}>
            {isAdding && <Loader2 size={13} className="mac-spin" />}
            Añadir
          </button>
        </div>
      </form>
    </Sheet>
  );
};
