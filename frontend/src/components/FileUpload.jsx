import { useState, useRef } from 'react'

const MAX_FILE_SIZE = 10 * 1024 * 1024

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function FileUpload({ onFileSelect }) {
  const [file, setFile] = useState(null)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  const handleFile = (f) => {
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a .csv file')
      return
    }
    if (f.size > MAX_FILE_SIZE) {
      setError('File too large. Maximum size is 10MB.')
      return
    }
    setError(null)
    setFile(f)
    onFileSelect(f)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files && e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-indigo-400 bg-slate-700/50'
            : 'border-slate-600 hover:border-indigo-400 hover:bg-slate-700/30'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
        <svg
          className="w-8 h-8 mx-auto mb-2 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.9 5 5 0 019.9-1A5.5 5.5 0 0118 16h-1m-6-4l-3 3m0 0l3 3m-3-3h12"
          />
        </svg>
        <p className="text-sm text-slate-300">
          Drop a CSV file here or click to browse
        </p>
      </div>

      {file && (
        <div className="mt-3 bg-slate-700 rounded-md px-3 py-2 text-xs text-slate-200 flex items-center justify-between">
          <span className="truncate">{file.name}</span>
          <span className="text-slate-400 ml-2 flex-shrink-0">
            {formatSize(file.size)}
          </span>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}
    </div>
  )
}
