export function SortDropdown({ value, options, onChange, label }) {
  return (
    <label className="inline-flex min-w-0 flex-1 items-center gap-3 text-sm text-zinc-500 sm:flex-none">
      <span className="hidden shrink-0 sm:inline">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full rounded-lg border border-black/10 bg-white px-3.5 py-3 text-sm font-semibold text-black outline-none transition-colors hover:border-black/20 sm:w-auto sm:px-4"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
