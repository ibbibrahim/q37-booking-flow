// Shared classes so DTL modals fit small screens: the dialog is capped to the
// visible viewport (dvh accounts for mobile browser chrome) and scrolls
// internally, since Radix locks page scroll while a dialog is open.
export const DTL_DIALOG_CONTENT_CLASS =
  'w-[calc(100vw-3rem)] max-h-[calc(100dvh-3rem)] overflow-y-auto overscroll-contain px-5 py-6 sm:p-6';

// Keeps the action buttons visible at the bottom of the scrolling dialog.
// Negative offsets cancel the content padding so the bar spans edge to edge.
export const DTL_DIALOG_FOOTER_CLASS =
  'sticky -bottom-6 -mx-5 -mb-6 sm:-mx-6 sm:-mb-6 gap-2 sm:space-x-0 border-t border-border bg-background px-5 py-3 sm:px-6 sm:py-4';
