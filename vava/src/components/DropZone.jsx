import { useCallback, useState } from 'react'

function DropZone({ onFiles, compact = false }) {
  const [dragging, setDragging] = useState(false)

  const handle = useCallback((files) => {
    const jsons = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.json'))
    if (jsons.length) onFiles(jsons)
  }, [onFiles])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    handle(e.dataTransfer.files)
  }, [handle])

  const onChange = useCallback((e) => {
    handle(e.target.files)
    e.target.value = ''
  }, [handle])

  return (
    <div
      className={`dropzone ${dragging ? 'dropzone--active' : ''} ${compact ? 'dropzone--compact' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={(e) => { e.preventDefault(); setDragging(false) }}
      onDrop={onDrop}
    >
      <input
        id="file-input"
        type="file"
        accept=".json"
        multiple
        onChange={onChange}
        style={{ display: 'none' }}
      />
      <label htmlFor="file-input" className="dropzone__label">
        <svg className="dropzone__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 16v-8m0 0-3 3m3-3 3 3M6.5 19h11a2.5 2.5 0 0 0 0-5h-.5A5 5 0 1 0 7 9.5" />
        </svg>
        {compact ? (
          <span className="dropzone__hint">Adicionar mais arquivos</span>
        ) : (
          <>
            <p className="dropzone__text">Arraste os <code>.json</code> das partidas aqui</p>
            <span className="dropzone__hint">ou clique para selecionar</span>
          </>
        )}
      </label>
    </div>
  )
}

export default DropZone
