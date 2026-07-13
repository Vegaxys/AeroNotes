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
  NOTE_TOGGLE_COLLAPSE: 'note:toggle-collapse',
  /** Main -> note window: right-click landed on the titlebar drag region (window-relative coords). */
  NOTE_HEADER_CONTEXT_MENU: 'note:header-context-menu',
  NOTE_SET_COLOR: 'note:set-color',
  NOTE_SET_TITLE: 'note:set-title',
  NOTES_REORDER: 'notes:reorder',
  NOTE_DELETE: 'note:delete',
  NOTE_DUPLICATE: 'note:duplicate',
  /** Cross-window color clipboard (copy a note's background, paste it on another). */
  COLOR_COPY: 'color:copy',
  COLOR_GET_COPIED: 'color:get-copied',
  NOTE_MOVE_TO_FOLDER: 'note:move-to-folder',
  OVERLAY_HIDE: 'overlay:hide',
  APP_QUIT: 'app:quit',
  APP_GET_VERSION: 'app:get-version',
  SYNC_SIGN_IN: 'sync:sign-in',
  SYNC_SIGN_OUT: 'sync:sign-out',
  SYNC_NOW: 'sync:now',
  SYNC_STATUS_GET: 'sync:status-get',
  SYNC_STATUS_CHANGED: 'sync:status-changed',
  /** Main -> renderers: these notes changed from the cloud; open editors must reload them. */
  NOTES_REMOTE_APPLIED: 'notes:remote-applied',
  SETTINGS_WINDOW_OPEN: 'settings-window:open',
  NOTE_WINDOWS_CLOSE_ALL: 'note-windows:close-all',
  FOLDERS_GET_ALL: 'folders:get-all',
  FOLDERS_CHANGED: 'folders:changed',
  FOLDER_ADD: 'folder:add',
  FOLDER_RENAME: 'folder:rename',
  FOLDER_DELETE: 'folder:delete',
  TEMPLATES_GET_ALL: 'templates:get-all',
  TEMPLATES_CHANGED: 'templates:changed',
  TEMPLATE_ADD: 'template:add',
  TEMPLATE_UPDATE: 'template:update',
  TEMPLATE_DELETE: 'template:delete',
  TEMPLATE_EDITOR_OPEN: 'template-editor:open',
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
