import { motion } from 'framer-motion'

export function PageSection({ eyebrow, title, description, action, children, className = '' }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={className}
    >
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          {eyebrow ? (
            <p className="text-[11px] font-bold uppercase text-[#ff3b30]">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-2 text-3xl font-extrabold text-black sm:text-4xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-3 text-sm leading-7 text-zinc-600 sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </motion.section>
  )
}
