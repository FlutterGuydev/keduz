import { useState } from 'react'
import { FiHelpCircle, FiMaximize2, FiX } from 'react-icons/fi'
import { AnimatePresence, motion } from 'framer-motion'
import { translations } from '../../i18n/translations'

const sizeTables = {
  men: [
    { eu: '39', foot: '24.5', us: '6.5' },
    { eu: '40', foot: '25.0', us: '7' },
    { eu: '41', foot: '26.0', us: '8' },
    { eu: '42', foot: '26.5', us: '8.5' },
    { eu: '43', foot: '27.5', us: '9.5' },
  ],
  women: [
    { eu: '36', foot: '22.5', us: '5.5' },
    { eu: '37', foot: '23.5', us: '6.5' },
    { eu: '38', foot: '24.0', us: '7' },
    { eu: '39', foot: '24.5', us: '8' },
    { eu: '40', foot: '25.0', us: '8.5' },
  ],
}

function SizeDiagram({ t }) {
  return (
    <div className="rounded-[24px] bg-[#f6f5f2] p-5 sm:p-6">
      <div className="flex items-center gap-2 text-xs font-bold uppercase text-zinc-500">
        <FiMaximize2 size={17} />
        {t.sizeGuideMeasureTitle}
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-[0.9fr_1.1fr] sm:items-center">
        <div className="relative mx-auto h-[190px] w-[118px] rounded-[50%_50%_42%_42%] bg-white shadow-[inset_0_0_0_1px_rgba(15,15,16,0.06),0_18px_38px_rgba(15,15,16,0.06)]">
          <div className="absolute left-1/2 top-6 h-[132px] w-[52px] -translate-x-1/2 rounded-[60%_60%_44%_44%] border border-dashed border-black/20" />
          <div className="absolute bottom-5 left-1/2 h-px w-[86px] -translate-x-1/2 bg-[#ff3b30]" />
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-[#ff3b30]">
            cm
          </div>
        </div>
        <div className="space-y-3 text-sm leading-6 text-zinc-600">
          <p>{t.sizeGuideMeasureStepOne}</p>
          <p>{t.sizeGuideMeasureStepTwo}</p>
          <p className="rounded-2xl bg-white px-4 py-3 font-semibold text-black shadow-[0_12px_28px_rgba(15,15,16,0.04)]">
            {t.sizeGuideTip}
          </p>
        </div>
      </div>
    </div>
  )
}

function SizeTable({ rows, t }) {
  return (
    <div className="overflow-hidden rounded-[22px] bg-white shadow-[inset_0_0_0_1px_rgba(15,15,16,0.06)]">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-[#f7f7f5] text-xs font-bold uppercase text-zinc-500">
          <tr>
            <th className="px-4 py-3">{t.sizeGuideEu}</th>
            <th className="px-4 py-3">{t.sizeGuideFoot}</th>
            <th className="px-4 py-3">{t.sizeGuideUs}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.eu}-${row.us}`} className="border-t border-black/5">
              <td className="px-4 py-3 font-bold text-black">{row.eu}</td>
              <td className="px-4 py-3 text-zinc-600">{row.foot}</td>
              <td className="px-4 py-3 text-zinc-600">{row.us}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function SizeGuide({ language }) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('men')
  const t = translations[language]

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-end gap-2 text-sm font-semibold leading-tight text-zinc-600 transition-colors hover:text-black"
      >
        <FiHelpCircle size={18} />
        {t.sizeGuideTrigger}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/36 px-3 py-4 backdrop-blur-sm sm:items-center sm:px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-[#fcfbf8] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.22)] sm:rounded-[32px] sm:p-6"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase text-[#ff3b30]">
                    KED UZ
                  </p>
                  <h2 className="mt-2 text-2xl font-extrabold leading-tight text-black sm:text-3xl">
                    {t.sizeGuideTitle}
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-600">
                    {t.sizeGuideIntro}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-black shadow-[inset_0_0_0_1px_rgba(15,15,16,0.06)]"
                  aria-label={t.filterClose}
                >
                  <FiX size={21} />
                </button>
              </div>

              <div className="mt-6 grid grid-cols-2 rounded-full bg-white p-1 shadow-[inset_0_0_0_1px_rgba(15,15,16,0.06)]">
                {[
                  { id: 'men', label: t.navMen },
                  { id: 'women', label: t.navWomen },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-full px-4 py-3 text-sm font-bold transition-all ${
                      activeTab === tab.id
                        ? 'bg-black text-white shadow-[0_10px_24px_rgba(15,15,16,0.16)]'
                        : 'text-zinc-500 hover:text-black'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.92fr]"
              >
                <SizeDiagram t={t} />
                <SizeTable rows={sizeTables[activeTab]} t={t} />
              </motion.div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
