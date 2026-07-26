import type { User } from "@/types/database";

interface PersonPickerProps {
    people: User[];
    selectedIds: string[];
    onChange: (selectedIds: string[]) => void;
    disabled?: boolean;
    emptyMessage?: string;
}

export default function PersonPicker({
    people,
    selectedIds,
    onChange,
    disabled = false,
    emptyMessage = "No people are available.",
}: PersonPickerProps) {
    if (people.length === 0) {
        return <p className="text-sm text-slate-500">{emptyMessage}</p>;
    }

    return (
        <div className="grid gap-2 sm:grid-cols-2">
            {people.map((person) => {
                const selected = selectedIds.includes(person.uid);
                return (
                    <label
                        key={person.uid}
                        className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                            selected ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:bg-slate-50"
                        }`}
                    >
                        <input
                            type="checkbox"
                            checked={selected}
                            disabled={disabled}
                            onChange={(event) =>
                                onChange(
                                    event.target.checked
                                        ? [...selectedIds, person.uid]
                                        : selectedIds.filter((id) => id !== person.uid)
                                )
                            }
                            className="h-4 w-4"
                        />
                        {person.photoURL ? (
                            <img src={person.photoURL} alt="" className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 font-black text-blue-700">
                                {person.displayName.charAt(0).toUpperCase()}
                            </span>
                        )}
                        <span className="min-w-0">
                            <span className="block truncate text-sm font-bold text-slate-900">
                                {person.displayName}
                            </span>
                            <span className="block truncate text-xs text-slate-500">{person.email}</span>
                        </span>
                    </label>
                );
            })}
        </div>
    );
}
