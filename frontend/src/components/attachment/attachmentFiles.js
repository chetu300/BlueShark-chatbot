export const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]

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
  const extension = file.name.split(".").pop()?.toLowerCase()
  return TEXT_EXTENSIONS.includes(extension)
}

export function readAttachment(file) {
  return new Promise((resolve, reject) => {
    if (file.type.startsWith("image/")) {
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
