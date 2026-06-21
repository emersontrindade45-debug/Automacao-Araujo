"use client";

interface SelectCheckboxProps {
  checked: boolean;
  onSelect: (shiftKey: boolean) => void;
  ariaLabel: string;
}

// Checkbox como <button> (não <input>) para evitar conflito entre o toggle
// nativo do checkbox e o estado controlado pelo React ao capturar shiftKey.
export function SelectCheckbox({ checked, onSelect, ariaLabel }: SelectCheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={(e) => onSelect(e.shiftKey)}
      className={[
        "h-4 w-4 rounded border cursor-pointer flex items-center justify-center transition-colors",
        checked ? "bg-brand border-brand" : "bg-surface border-border",
      ].join(" ")}
    >
      {checked && (
        <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </button>
  );
}
