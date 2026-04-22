export function EmptyState({ title, actionLabel, onReset }) {
  return (
    <div className="rounded-[30px] border border-dashed border-black/10 bg-white p-10 text-center shadow-[0_18px_40px_rgba(15,15,16,0.04)] sm:p-14">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-lg text-zinc-500">
        0
      </div>
      <p className="text-sm text-zinc-500 sm:text-[15px]">{title}</p>
      {actionLabel ? (
        <button
          type="button"
          onClick={onReset}
          className="mt-6 inline-flex rounded-full border border-black/10 px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-black hover:text-white"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}
