import React, { useEffect, useRef } from "react"
import { assets } from "../assets/assets"
import Markdown from "react-markdown"
import moment from "moment"
import Prism from "prismjs"
import remarkGfm from "remark-gfm"
import MarkdownCodeBlock from "./MarkdownCodeBlock"
import "prismjs/components/prism-markup"
import "prismjs/components/prism-css"
import "prismjs/components/prism-javascript"
import "prismjs/components/prism-jsx"
import "prismjs/components/prism-typescript"
import "prismjs/components/prism-tsx"
import "prismjs/components/prism-python"
import "prismjs/components/prism-bash"
import "prismjs/components/prism-json"
import "prismjs/components/prism-yaml"
import "prismjs/components/prism-sql"
import "prismjs/components/prism-java"
import "prismjs/components/prism-c"
import "prismjs/components/prism-cpp"
import "prismjs/components/prism-go"
import "prismjs/components/prism-rust"

function Message({ message }) {
  const messageRef = useRef(null)

  useEffect(() => {
    if (message.role === "assistant" && messageRef.current) {
      Prism.highlightAll()
    }
  }, [message.content, message.role])
  return (
    <article className="mx-auto w-full max-w-3xl px-3 py-3 sm:px-6">
      {message.role === "user" ? (
        <div className="flex items-end justify-end gap-2">
          <div className="flex max-w-[min(85%,42rem)] flex-col items-end gap-1">
            <div className="flex w-full flex-col gap-2 rounded-2xl bg-slate-100 px-4 py-3 dark:bg-gray-700">
              {message.attachments?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {message.attachments.map((file, fileIndex) => (
                    <div key={file.id || fileIndex}>
                      {file.dataUrl && (
                        <img
                          src={file.dataUrl}
                          alt={file.name}
                          className="max-h-64 max-w-full rounded-lg object-contain"
                        />
                      )}
                      <span className="rounded-md bg-white/70 px-2 py-1 text-xs dark:bg-black/20">
                        {file.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <p className="whitespace-pre-wrap break-words text-sm text-gray-900 dark:text-white">
                {message.content}
              </p>
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {moment(message.timestamp).fromNow()}
            </span>
          </div>
          <img
            src={assets.user_icon}
            alt=""
            className="h-8 w-8 rounded-full"
          />
        </div>
      ) : (
        <div className="flex flex-col items-start gap-1">
          <div
            ref={messageRef}
            className="markdown-body w-full max-w-full text-sm text-gray-900 dark:text-gray-100"
          >
            <Markdown
              remarkPlugins={[remarkGfm]}
              components={{ pre: MarkdownCodeBlock }}
            >
              {message.content}
            </Markdown>
          </div>
          {message.content && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {moment(message.timestamp).fromNow()}
            </span>
          )}
        </div>
      )}
    </article>
  )
}

export default Message
