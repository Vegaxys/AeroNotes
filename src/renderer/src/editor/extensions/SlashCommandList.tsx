import { useEffect, useImperativeHandle, useRef, useState } from 'react'
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
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => setSelectedIndex(0), [items])

  // The list scrolls, so arrow navigation must drag the viewport along with
  // it — otherwise Enter fires on an item the user cannot see.
  useEffect(() => {
    listRef.current?.children[selectedIndex]?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  const selectItem = (index: number): void => {
    const item = items[index]
    if (item) command(item)
  }

  useImperativeHandle(
    ref,
    () => ({
      onKeyDown: ({ event }) => {
        // Functional updates: key repeats arrive faster than React commits, and
        // reading `selectedIndex` from the closure would make every press in the
        // same batch move from the same stale index.
        if (event.key === 'ArrowUp') {
          setSelectedIndex((current) => (current + items.length - 1) % items.length)
          return true
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex((current) => (current + 1) % items.length)
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
    // data-mouse-live: in the overlay window this popup (appended to body) can
    // stick out past the dock's rect; without the marker the click-through
    // hit-test would hand those pixels back to the desktop.
    <div
      ref={listRef}
      data-mouse-live=""
      // max-h + scroll rather than a truncated item list: a post-it window is
      // small, but every entry has to stay reachable.
      className="dock-scroll max-h-72 w-56 overflow-y-auto rounded-[var(--radius-md)] border border-white/15 bg-neutral-900/95 p-1 shadow-2xl"
    >
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
