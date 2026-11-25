import { useEffect, useRef, useState } from "react"

export default function AttachmentCamera({ open, onClose, onCapture }) {
  const [cameraError, setCameraError] = useState("")
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    if (!open) return

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
            if (active) setCameraError("Could not start the camera preview.")
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
  }, [open])

  if (!open) return null

  const capturePhoto = async () => {
    const video = videoRef.current
    if (!video?.videoWidth || !video.videoHeight) {
      setCameraError("The camera is not ready yet. Please try again.")
      return
    }

    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext("2d")
    if (!context) {
      setCameraError("Could not capture the photo. Please try again.")
      return
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92)
    )
    if (!blob) {
      setCameraError("Could not capture the photo. Please try again.")
      return
    }

    await onCapture(
      new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" })
    )
  }

  return (
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
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Close camera"
          >
            Close
          </button>
        </div>
        {cameraError ? (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-200"
          >
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
            onClick={onClose}
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
  )
}
