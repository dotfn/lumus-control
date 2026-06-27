import React from 'react';
import { PRESET_COLORS, rgbToHex } from '../../../utils/color';

interface ColorPickerProps {
  currentR?: number;
  currentG?: number;
  currentB?: number;
  onChange: (r: number, g: number, b: number) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  currentR = 255,
  currentG = 180,
  currentB = 84,
  onChange,
}) => {
  const currentHex = rgbToHex(currentR, currentG, currentB);

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    onChange(r, g, b);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-theme-textSecondary transition-colors duration-300">
          Colores sólidos
        </label>
      </div>

      <div className="grid grid-cols-5 gap-2.5">
        {PRESET_COLORS.map((color) => {
          const isSelected = color.r === currentR && color.g === currentG && color.b === currentB;
          return (
            <button
              key={color.name}
              onClick={() => onChange(color.r, color.g, color.b)}
              className={`w-9 h-9 rounded-full border transition-[border-color,transform] active:scale-95 duration-300 hover:scale-110 ${
                isSelected ? 'border-theme-text ring-1 ring-theme-text/20 shadow-none' : 'border-theme-border/60'
              }`}
              style={{ backgroundColor: `rgb(${color.r},${color.g},${color.b})` }}
              aria-label={`Color ${color.name}`}
            />
          );
        })}

        {/* Custom Color Selector Swatch */}
        <label
          className="relative w-9 h-9 rounded-full border border-theme-border overflow-hidden cursor-pointer hover:scale-110 transition-transform active:scale-95 flex items-center justify-center"
          style={{
            background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
          }}
          aria-label="Selector de color personalizado"
        >
          <input
            type="color"
            value={currentHex}
            onChange={handleCustomColorChange}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </label>
      </div>
    </div>
  );
};
