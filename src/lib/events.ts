/**
 * Dispatches a custom event to open the Settings modal.
 * Moved here to avoid Vite HMR issues with exporting non-components from component files.
 */
export function openSettingsModal(): void {
    window.dispatchEvent(new CustomEvent("open-settings"));
}
