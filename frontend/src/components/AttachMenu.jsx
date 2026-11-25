import { useEffect, useRef, useState } from "react"
import toast from "react-hot-toast"

const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]

const TEXT_EXTENSIONS = [
  "txt",
  "md",
  "csv",
  "json",
  "js",
  "jsx",
  "ts",
  "tsx",
  "css",
  "html",
  "xml",
  "yml",
  "yaml",
]

function isTextFile(file) {
  if (file.type.startsWith("text/")) return true
  const ext = file.name.split(".").pop()?.toLowerCase()
  return TEXT_EXTENSIONS.includes(ext)
}

function readAttachment(file) {
  return new Promise((resolve, reject) => {
    if (file.type.startsWith("image/")) {
      // Make image preview data.
      const reader = new FileReader()
      reader.onerror = () => reject(new Error(`Could not read ${file.name}`))
      reader.onload = () => {
        resolve({
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type,
          size: file.size,
          text: "",
          dataUrl: String(reader.result || ""),
        })
      }
      reader.readAsDataURL(file)
      return
    }

    if (!isTextFile(file)) {
      resolve({
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        text: "",
      })
      return
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`))
    reader.onload = () => {
      resolve({
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        text: String(reader.result || "").slice(0, 20000),
      })
    }
    reader.readAsText(file)
  })
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  )
}

function PaperclipIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.82-2.83l8.48-8.48"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 4h-4L8 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-4l-2-3Z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  )
}

export function AttachmentPreview({ files, onRemove, disabled }) {
  if (!files.length) return null

  return (
    <div className="flex gap-2 px-2 pb-2 overflow-x-auto">
      {files.map((file) => (
        <div
          key={file.id}
          className="relative shrink-0 flex items-center gap-2 rounded-xl border border-black/10 dark:border-white/15 bg-white dark:bg-[#1c1c27] px-2 py-1.5 max-w-[180px]"
        >
          {file.dataUrl ? (
            <img
              src={file.dataUrl}
              alt={file.name}
              className="w-10 h-10 rounded-lg object-cover"
            />
          ) : (
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 text-blue-700 text-xs font-semibold">
              {file.name.split(".").pop()?.slice(0, 4).toUpperCase()}
            </span>
          )}
          <span className="text-xs truncate dark:text-white">{file.name}</span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onRemove(file.id)}
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-black text-white text-xs leading-none"
            aria-label={`Remove ${file.name}`}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

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
  const [cameraError, setCameraError] = useState("")
  const rootRef = useRef(null)
  const fileInputRef = useRef(null)
  const imageInputRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [])

  useEffect(() => {
    if (!cameraOpen) return

    let active = true
    setCameraError("")

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access is not available in this browser.")
      return () => {}
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {
            setCameraError("Could not start the camera preview.")
          })
        }
      })
      .catch((error) => {
        if (!active) return
        setCameraError(
          error.name === "NotAllowedError"
            ? "Allow camera access in your browser settings, then try again."
            : error.name === "NotFoundError"
              ? "No camera was found on this device."
              : "Could not open the camera. Check your camera connection and try again."
        )
      })

    return () => {
      active = false
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [cameraOpen])

  const capturePhoto = async () => {
    const video = videoRef.current
    if (!video?.videoWidth || !video.videoHeight) {
      setCameraError("The camera is not ready yet. Please try again.")
      return
    }

    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92)
    )
    if (!blob) {
      setCameraError("Could not capture the photo. Please try again.")
      return
    }

    const photo = new File([blob], `camera-${Date.now()}.jpg`, {
      type: "image/jpeg",
    })
    await addFiles([photo])
    setCameraOpen(false)
  }

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
        className="flex items-center justify-center w-9 h-9 rounded-full text-white hover:bg-white/15 disabled:opacity-40"
      >
        <PlusIcon />
      </button>

      {open && (
        <div className="absolute bottom-12 left-0 z-30 w-52 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1c1c27] shadow-lg p-1.5 text-black dark:text-white">
          <button
            type="button"
            disabled={!canUploadImages || imageUploadsRemaining <= 0}
            onClick={() => {
              setOpen(false)
              setCameraOpen(true)
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            title={
              !canUploadImages
                ? "Image uploads require a paid plan"
                : `${imageUploadsRemaining} image uploads remaining this month`
            }
          >
            <CameraIcon />
            Camera
          </button>
          <button
            type="button"
            disabled={!canUploadImages || imageUploadsRemaining <= 0}
            onClick={() => {
              setOpen(false)
              imageInputRef.current?.click()
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
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
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
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
      {cameraOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Camera"
        >
          <div className="w-full max-w-xl rounded-2xl bg-white p-4 text-black shadow-xl dark:bg-[#1c1c27] dark:text-white">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Camera</h2>
              <button
                type="button"
                onClick={() => setCameraOpen(false)}
                className="rounded-full px-3 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10"
                aria-label="Close camera"
              >
                Close
              </button>
            </div>
            {cameraError ? (
              <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
                {cameraError}
              </p>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="max-h-[65vh] w-full rounded-xl bg-black object-contain"
              />
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCameraOpen(false)}
                className="rounded-full px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(cameraError)}
                onClick={capturePhoto}
                className="rounded-full bg-blue-600 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Capture photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
