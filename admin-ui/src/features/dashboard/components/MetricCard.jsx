const accents = {
  default: 'border-gray-700 text-indigo-400',
  low:     'border-green-800 text-green-400',
  medium:  'border-yellow-800 text-yellow-400',
  high:    'border-red-800 text-red-400',
}

const bgAccents = {
  default: 'bg-indigo-500/10',
  low:     'bg-green-500/10',
  medium:  'bg-yellow-500/10',
  high:    'bg-red-500/10',
}

export default function MetricCard({ title, value, accent = 'default', icon: Icon }) {
  const toneClass = accents[accent].split(' ')[1]
  return (
    <div className={`bg-gray-900 border rounded-xl p-5 flex items-center gap-4 ${accents[accent]}`}>
      {Icon && (
        <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${bgAccents[accent]}`}>
          <Icon className={`w-6 h-6 ${toneClass}`} aria-hidden />
        </div>
      )}
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
        <p className={`text-3xl font-bold mt-0.5 ${accents[accent].split(' ')[1]}`}>{value}</p>
      </div>
    </div>
  )
}
