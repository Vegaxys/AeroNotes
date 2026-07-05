import { useState } from 'react'
import type { NoteColor } from '@shared/types'
import { GRADIENT_PRESETS, SOLID_PRESETS, isSameNoteColor, noteColorToCss } from '@shared/colorPalette'

interface ColorPickerProps {
  value: NoteColor
  onChange: (color: NoteColor) => void
}

const ALL_PRESETS = [...SOLID_PRESETS, ...GRADIENT_PRESETS]

function initialGradientColors(value: NoteColor): [string, string] {
  if (value.type === 'gradient') return value.value as [string, string]
  return ['#93c5fd', '#6ee7b7']
}

function initialGradientAngle(value: NoteColor): number {
  return value.type === 'gradient' ? (value.angle ?? 135) : 135
}

export function ColorPicker({ value, onChange }: ColorPickerProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [initialFrom, initialTo] = initialGradientColors(value)
  const [customFrom, setCustomFrom] = useState(initialFrom)
  const [customTo, setCustomTo] = useState(initialTo)
  const [customAngle, setCustomAngle] = useState(initialGradientAngle(value))

  const applyCustomGradient = (): void => {
    onChange({ type: 'gradient', value: [customFrom, customTo], angle: customAngle })
  }

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
        <div className="absolute right-0 top-8 z-10 flex w-64 flex-col gap-3 rounded-[var(--radius-md)] border border-white/15 bg-neutral-900/95 p-4 shadow-xl">
          <div className="grid grid-cols-4 gap-4">
            {ALL_PRESETS.map((color, index) => {
              const isActive = isSameNoteColor(color, value)
              return (
                <button
                  key={index}
                  onClick={() => {
                    onChange(color)
                    setOpen(false)
                  }}
                  className={`h-8 w-8 rounded-full border border-white/15 ${
                    isActive ? 'ring-2 ring-offset-2 ring-offset-neutral-900 ring-white' : ''
                  }`}
                  style={{ background: noteColorToCss(color) }}
                  aria-label={`Couleur ${index + 1}`}
                />
              )
            })}
          </div>

          <div className="h-px bg-white/10" />

          <label className="flex items-center gap-2 text-xs text-white/60">
            <input
              type="color"
              value={value.type === 'solid' ? (value.value as string) : '#ffffff'}
              onChange={(e) => onChange({ type: 'solid', value: e.target.value })}
              className="h-8 w-8 cursor-pointer rounded border border-white/15"
              aria-label="Couleur personnalisee"
            />
            Couleur personnalisee
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-xs text-white/60">Gradient personnalise</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-8 w-8 cursor-pointer rounded border border-white/15"
                aria-label="Premiere couleur du gradient"
              />
              <input
                type="color"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-8 w-8 cursor-pointer rounded border border-white/15"
                aria-label="Seconde couleur du gradient"
              />
              <input
                type="number"
                min={0}
                max={360}
                value={customAngle}
                onChange={(e) => setCustomAngle(Number(e.target.value))}
                className="w-14 rounded border border-white/15 bg-transparent px-1 py-1 text-xs text-white/70"
                aria-label="Angle du gradient"
              />
              <button
                onClick={applyCustomGradient}
                className="rounded-[var(--radius-sm)] bg-white/10 px-2 py-1 text-xs text-white/80 hover:bg-white/20"
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
