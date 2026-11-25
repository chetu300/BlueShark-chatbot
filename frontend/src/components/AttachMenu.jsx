import { useEffect, useRef, useState } from "react"
import toast from "react-hot-toast"
import AttachmentCamera from "./attachment/AttachmentCamera"
import { CameraIcon, PaperclipIcon, PlusIcon } from "./attachment/AttachmentIcons"
import {
  readAttachment,
  SUPPORTED_IMAGE_TYPES,
} from "./attachment/attachmentFiles"

export default function AttachMenu({
  disabled = false,
  fileCount = 0,
  maxAttachments = 1,
  canUploadImages = false,
  imageUploadsRemaining = 0,
  onAdd,
}) {
  const [open, setOpen] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const rootRef = useRef(null)
  const fileInputRef = useRef(null)
  const imageInputRef = useRef(null)

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [])

  const addFiles = async (fileList) => {
    const incoming = Array.from(fileList || [])
    if (!incoming.length) return

    const room = maxAttachments - fileCount
    if (room <= 0) {
      toast.error(`Your plan allows up to ${maxAttachments} attachments per message`)
      return
    }

    const accepted = []
    let remainingImages = imageUploadsRemaining
    for (const file of incoming) {
      if (accepted.length >= room) break
      if (file.type.startsWith("image/")) {
        if (!canUploadImages) {
          toast.error("Image uploads require a paid plan")
          continue
        }
        if (remainingImages <= 0) {
          toast.error("You've reached your monthly image upload limit")
          continue
        }
        if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
          toast.error(`${file.name} must be a JPEG, PNG, or WebP image`)
          continue
        }
      }
      accepted.push(file)
      if (file.type.startsWith("image/")) {
        remainingImages -= 1
      }
    }

    if (incoming.length > room) {
      toast.error(`Your plan allows up to ${maxAttachments} attachments per message`)
    }
    if (!accepted.length) return

    try {
      const parsed = await Promise.all(accepted.map(readAttachment))
      onAdd?.(parsed)
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        aria-label="Add files"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex h-10 w-10 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-200 dark:hover:bg-white/10"
      >
        <PlusIcon />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-30 mb-3 w-60 rounded-2xl border border-black/10 bg-white p-2 text-gray-800 shadow-xl dark:border-white/10 dark:bg-[#1c1c27] dark:text-gray-100">
          <button
            type="button"
            disabled={!canUploadImages || imageUploadsRemaining <= 0}
            onClick={() => {
              setOpen(false)
              setCameraOpen(true)
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-100 dark:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            title={
              !canUploadImages
                ? "Image uploads require a paid plan"
                : `${imageUploadsRemaining} image uploads remaining this month`
            }
          >
            <CameraIcon />
            Take photo
          </button>
          <button
            type="button"
            disabled={!canUploadImages || imageUploadsRemaining <= 0}
            onClick={() => {
              setOpen(false)
              imageInputRef.current?.click()
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-100 dark:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            title={
              !canUploadImages
                ? "Image uploads require a paid plan"
                : `${imageUploadsRemaining} image uploads remaining this month`
            }
          >
            <PaperclipIcon />
            Upload image
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              fileInputRef.current?.click()
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-100 dark:hover:bg-white/10"
          >
            <PaperclipIcon />
            Upload files
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        accept=".pdf,.txt,.md,.csv,.json,.js,.jsx,.ts,.tsx,.css,.html,.xml,.yml,.yaml,.doc,.docx"
        onChange={(event) => {
          addFiles(event.target.files)
          event.target.value = ""
        }}
      />
      <input
        ref={imageInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          addFiles(event.target.files)
          event.target.value = ""
        }}
      />
      <AttachmentCamera
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={async (photo) => {
          await addFiles([photo])
          setCameraOpen(false)
        }}
      />
    </div>
  )
}
