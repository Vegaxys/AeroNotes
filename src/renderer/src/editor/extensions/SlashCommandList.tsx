import { useEffect, useImperativeHandle, useState } from 'react'
import type { SlashCommandItem } from './slashCommandItems'

export interface SlashCommandListHandle {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

interface SlashCommandListProps {
  items: SlashCommandItem[]
  command: (item: SlashCommandItem) => void
  ref?: React.Ref<SlashCommandListHandle>
}

export function SlashCommandList({ items, command, ref }: SlashCommandListProps): React.JSX.Element | null {
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => setSelectedIndex(0), [items])

  const selectItem = (index: number): void => {
    const item = items[index]
    if (item) command(item)
  }

  useImperativeHandle(
    ref,
    () => ({
      onKeyDown: ({ event }) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((selectedIndex + items.length - 1) % items.length)
          return true
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex((selectedIndex + 1) % items.length)
          return true
        }
        if (event.key === 'Enter') {
          selectItem(selectedIndex)
          return true
        }
        return false
      }
    }),
    [selectedIndex, items]
  )

  if (items.length === 0) {
    return null
  }

  return (
    <div className="w-56 overflow-hidden rounded-[var(--radius-md)] border border-white/15 bg-neutral-900/95 p-1 shadow-2xl">
      {items.map((item, index) => (
        <button
          key={item.title}
          onClick={() => selectItem(index)}
          className={`flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-sm text-white/90 ${
            index === selectedIndex ? 'bg-white/15' : 'hover:bg-white/10'
          }`}
        >
          <span className="w-5 text-center text-xs text-white/60">{item.icon}</span>
          <span>{item.title}</span>
        </button>
      ))}
    </div>
  )
}
