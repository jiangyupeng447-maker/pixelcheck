import { useRef, useState, type DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { UploadedImage } from '../types'
import { IconUpload, IconTrash, IconArrowRight } from '../components/icons'

function readImageFile(file: File): Promise<UploadedImage> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please choose an image file (PNG, JPG, WebP).'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const img = new Image()
      img.onload = () =>
        resolve({ name: file.name, dataUrl, width: img.naturalWidth, height: img.naturalHeight, size: file.size })
      img.onerror = () => reject(new Error('Could not decode image.'))
      img.src = dataUrl
    }
    reader.onerror = () => reject(new Error('Could not read file.'))
    reader.readAsDataURL(file)
  })
}

function formatBytes(bytes?: number): string {
  if (!bytes && bytes !== 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

interface DropZoneProps {
  label: string
  hint: string
  image: UploadedImage | null
  onSelect: (img: UploadedImage) => void
  onClear: () => void
}

function DropZone({ label, hint, image, onSelect, onClear }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    try {
      setError(null)
      const img = await readImageFile(files[0])
      onSelect(img)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.')
    }
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    void handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="panel-label">{label}</span>
        {image && (
          <div className="flex items-center gap-3">
            <button
              className="flex items-center gap-1 text-xs text-content-muted hover:text-content-primary"
              onClick={() => inputRef.current?.click()}
            >
              <IconUpload className="h-3.5 w-3.5" />
              Replace
            </button>
            <button
              className="flex items-center gap-1 text-xs text-content-muted hover:text-danger"
              onClick={onClear}
            >
              <IconTrash className="h-3.5 w-3.5" />
              Remove
            </button>
          </div>
        )}
      </div>

      {image ? (
        <div className="card overflow-hidden">
          <div className="grid max-h-80 place-items-center overflow-hidden bg-[repeating-conic-gradient(#F0F1ED_0%_25%,#FFFFFF_0%_50%)] bg-[length:20px_20px] p-3">
            <img
              src={image.dataUrl}
              alt={label}
              className="max-h-72 w-auto rounded-md object-contain shadow-lg"
            />
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs">
            <span className="truncate text-content-secondary">{image.name}</span>
            <span className="flex items-center gap-2 font-mono text-content-muted">
              <span>{image.width} × {image.height}</span>
              {image.size != null && <span className="text-content-muted/70">· {formatBytes(image.size)}</span>}
            </span>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`grid h-64 cursor-pointer place-items-center rounded-xl border-2 border-dashed transition-colors ${
            dragging
              ? 'border-brand bg-brand-soft'
              : 'border-border hover:border-border-strong hover:bg-bg-surface'
          }`}
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full border border-border bg-bg-elevated text-content-secondary">
              <IconUpload className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">Drop image or click to upload</p>
              <p className="mt-1 text-xs text-content-muted">{hint}</p>
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
    </div>
  )
}

export default function NewReview() {
  const navigate = useNavigate()
  const { designImage, actualImage, setDesignImage, setActualImage } = useApp()
  const ready = Boolean(designImage && actualImage)
  const sizesDiffer =
    !!designImage && !!actualImage && (designImage.width !== actualImage.width || designImage.height !== actualImage.height)

  return (
    <div className="mx-auto h-full max-w-5xl overflow-y-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">New Review</h1>
        <p className="mt-1 text-sm text-content-secondary">
          Upload your design mock and the implemented page to run a UI visual QA. Catch spacing,
          sizing, color, alignment and typography issues — all processed locally in your browser.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <DropZone
          label="Design Screenshot"
          hint="The intended design (from Figma, etc.)"
          image={designImage}
          onSelect={setDesignImage}
          onClear={() => setDesignImage(null)}
        />
        <DropZone
          label="Actual Screenshot"
          hint="The implemented / shipped page"
          image={actualImage}
          onSelect={setActualImage}
          onClear={() => setActualImage(null)}
        />
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
        <div className="text-sm text-content-muted">
          {ready ? (
            <>
              <div className="flex items-center gap-3 font-mono text-xs text-content-secondary">
                <span>Design {designImage!.width} × {designImage!.height}</span>
                <span className="text-content-muted">·</span>
                <span>Actual {actualImage!.width} × {actualImage!.height}</span>
              </div>
              {sizesDiffer ? (
                <p className="mt-1.5 text-xs text-warning">
                  检测到 Design 与 Actual 尺寸不同，将以 Design 为基准进行坐标对齐（不会拉伸图片）。
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-success">尺寸一致 · 将进行 1:1 对齐比较。</p>
              )}
            </>
          ) : (
            'Upload both screenshots to start the comparison.'
          )}
        </div>
        <button className="btn-primary" disabled={!ready} onClick={() => navigate('/compare')}>
          开始 AI 走查
          <IconArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
