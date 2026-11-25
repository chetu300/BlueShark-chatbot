export default function AttachmentPreview({ files, onRemove, disabled }) {
  if (!files.length) return null

  return (
    <div className="flex gap-2 overflow-x-auto px-2 pb-2">
      {files.map((file) => (
        <div
          key={file.id}
          className="relative flex max-w-[180px] shrink-0 items-center gap-2 rounded-xl border border-black/10 bg-white px-2 py-1.5 dark:border-white/15 dark:bg-[#1c1c27]"
        >
          {file.dataUrl ? (
            <img
              src={file.dataUrl}
              alt={file.name}
              className="h-10 w-10 rounded-lg object-cover"
            />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-xs font-semibold text-blue-700">
              {file.name.split(".").pop()?.slice(0, 4).toUpperCase()}
            </span>
          )}
          <span className="truncate text-xs dark:text-white">{file.name}</span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onRemove(file.id)}
            className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-black text-xs leading-none text-white"
            aria-label={`Remove ${file.name}`}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
