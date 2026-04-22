import { Link } from 'react-router-dom'

export function Breadcrumbs({ items }) {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm text-zinc-400">
      {items.map((item, index) => (
        <div key={item.label} className="flex items-center gap-2">
          {item.href ? (
            <Link to={item.href} className="transition-colors hover:text-black">
              {item.label}
            </Link>
          ) : (
            <span className="text-zinc-500">{item.label}</span>
          )}
          {index < items.length - 1 ? <span>/</span> : null}
        </div>
      ))}
    </nav>
  )
}
