import { useState } from 'react'
import type { NoteColor } from '@shared/types'
import { GRADIENT_PRESETS, SOLID_PRESETS, noteColorToCss } from '@shared/colorPalette'

interface ColorPickerProps {
  value: NoteColor
  onChange: (color: NoteColor) => void
}

const ALL_PRESETS = [...SOLID_PRESETS, ...GRADIENT_PRESETS]

export function ColorPicker({ value, onChange }: ColorPickerProps): React.JSX.Element {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((isOpen) => !isOpen)}
        className="h-6 w-6 rounded-full border border-black/20"
        style={{ background: noteColorToCss(value) }}
        aria-label="Changer la couleur"
        title="Changer la couleur"
      />
      {open && (
        <div className="absolute right-0 top-7 z-10 grid grid-cols-5 gap-1.5 rounded-[var(--radius-md)] border border-black/10 bg-white/95 p-2 shadow-xl">
          {ALL_PRESETS.map((color, index) => (
            <button
              key={index}
              onClick={() => {
                onChange(color)
                setOpen(false)
              }}
              className="h-6 w-6 rounded-full border border-black/10"
              style={{ background: noteColorToCss(color) }}
              aria-label={`Couleur ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
