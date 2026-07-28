const calendarColors = [
    "#2563eb",
    "#4f46e5",
    "#7c3aed",
    "#a21caf",
    "#db2777",
    "#dc2626",
    "#ea580c",
    "#ca8a04",
    "#16a34a",
    "#059669",
    "#0891b2",
    "#475569",
];

interface CalendarColorPickerProps {
    id: string;
    value: string;
    onChange: (color: string) => void;
    disabled?: boolean;
}

export default function CalendarColorPicker({ id, value, onChange, disabled = false }: CalendarColorPickerProps) {
    const normalizedValue = value.toLowerCase();

    return (
        <div className="mt-2 space-y-3">
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-12" aria-label="Calendar color palette">
                {calendarColors.map((color) => {
                    const selected = normalizedValue === color;
                    return (
                        <button
                            key={color}
                            type="button"
                            onClick={() => onChange(color)}
                            disabled={disabled}
                            aria-label={`Use color ${color}`}
                            aria-pressed={selected}
                            className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition hover:scale-110 disabled:opacity-50 ${
                                selected ? "border-slate-900 ring-2 ring-slate-300" : "border-white"
                            }`}
                            style={{ backgroundColor: color }}
                        >
                            {selected ? <span className="font-black text-white">✓</span> : null}
                        </button>
                    );
                })}
            </div>
            <div className="flex items-center gap-3">
                <span
                    className="h-10 w-10 shrink-0 rounded-lg border border-slate-300"
                    style={{ backgroundColor: /^#[0-9a-f]{6}$/i.test(value) ? value : "#ffffff" }}
                    aria-hidden="true"
                />
                <div>
                    <label htmlFor={id} className="text-xs font-bold text-slate-600">
                        Custom hex color
                    </label>
                    <input
                        id={id}
                        value={value}
                        onChange={(event) => onChange(event.target.value)}
                        disabled={disabled}
                        required
                        pattern="#[0-9a-fA-F]{6}"
                        maxLength={7}
                        placeholder="#2563eb"
                        className="mt-1 block w-32 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm uppercase"
                    />
                </div>
            </div>
        </div>
    );
}
