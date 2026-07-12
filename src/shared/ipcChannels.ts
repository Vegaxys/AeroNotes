export const IPC_CHANNELS = {
  OVERLAY_SET_IGNORE_MOUSE: 'overlay:set-ignore-mouse',
  NOTES_GET_ALL: 'notes:get-all',
  NOTES_CHANGED: 'notes:changed',
  NOTE_ADD: 'note:add',
  NOTE_UPDATE_CONTENT: 'note:update-content',
  NOTE_DETACH: 'note:detach',
  NOTE_REDOCK: 'note:redock',
  NOTE_FOCUS: 'note:focus',
  NOTE_SET_ALWAYS_ON_TOP: 'note:set-always-on-top',
  NOTE_SET_COLOR: 'note:set-color',
  NOTE_SET_TITLE: 'note:set-title',
  NOTES_REORDER: 'notes:reorder',
  NOTE_DELETE: 'note:delete',
  NOTE_DUPLICATE: 'note:duplicate',
  NOTE_MOVE_TO_FOLDER: 'note:move-to-folder',
  OVERLAY_HIDE: 'overlay:hide',
  APP_QUIT: 'app:quit',
  APP_GET_VERSION: 'app:get-version',
  SETTINGS_WINDOW_OPEN: 'settings-window:open',
  NOTE_WINDOWS_CLOSE_ALL: 'note-windows:close-all',
  FOLDERS_GET_ALL: 'folders:get-all',
  FOLDERS_CHANGED: 'folders:changed',
  FOLDER_ADD: 'folder:add',
  FOLDER_RENAME: 'folder:rename',
  FOLDER_DELETE: 'folder:delete',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_CHANGED: 'settings:changed',
  SHELL_OPEN_PATH: 'shell:open-path',
  SHELL_OPEN_EXTERNAL: 'shell:open-external',
  DIALOG_PICK_PATH: 'dialog:pick-path',
  IMAGE_SAVE: 'image:save',
  IMAGE_IMPORT: 'image:import',
  /** Source renderer -> main: cursor position (screen coords) during a block drag outside the source window. */
  BLOCK_DRAG_MOVE: 'block:drag-move',
  /** Source renderer -> main: drag came back inside the source window (or was aborted); clear any remote indicator. */
  BLOCK_DRAG_CANCEL: 'block:drag-cancel',
  /** Source renderer -> main: mouse released outside the source window; try to drop into the note window under the cursor. */
  BLOCK_DRAG_DROP: 'block:drag-drop',
  /** Main -> target note window: a foreign block drag is hovering at these window-relative coords. */
  BLOCK_DRAG_OVER: 'block:drag-over',
  /** Main -> target note window: the foreign block drag left; hide the drop indicator. */
  BLOCK_DRAG_LEAVE: 'block:drag-leave',
  /** Main -> target note window: insert the dragged block at these window-relative coords. */
  BLOCK_DROP: 'block:drop',
  /** Target renderer -> main: a block was dropped into another note; the source must delete it. */
  BLOCK_TRANSFERRED: 'block:transferred',
  /** Main -> source note window: delete the block that was transferred elsewhere. */
  BLOCK_REMOVE: 'block:remove'
} as const
