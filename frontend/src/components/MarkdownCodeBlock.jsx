import React from "react"
import toast from "react-hot-toast"

function MarkdownCodeBlock({ children }) {
  const codeElement = React.Children.toArray(children).find((child) =>
    React.isValidElement(child)
  )
  const codeClass = codeElement?.props?.className || ""
  const language = codeClass.match(/language-([\w-]+)/)?.[1] || "Code"
  const code = React.Children.toArray(codeElement?.props?.children).join("")

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code)
      toast.success("Code copied")
    } catch {
      toast.error("Could not copy code")
    }
  }

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-gray-700 bg-[#1e1e1e]">
      <div className="flex items-center justify-between border-b border-gray-700 px-4 py-2 text-xs text-gray-300">
        <span>{language}</span>
        <button
          type="button"
          onClick={copyCode}
          className="rounded px-2 py-1 hover:bg-white/10"
        >
          Copy Code
        </button>
      </div>
      <pre className="!m-0 !max-w-full !rounded-none">
        <code className={codeClass}>{code}</code>
      </pre>
    </div>
  )
}

export default MarkdownCodeBlock
