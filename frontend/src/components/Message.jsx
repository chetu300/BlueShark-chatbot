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
    <div>
      {" "}
      {message.role === "user" ? (
        <div className="flex items-start justify-end my-4 gap-2">
          <div className="flex flex-col gap-2 p-2 px-4 bg-slate-50  dark:bg-gray-600 rounded-md max-w-2xl">
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
                    <span className="text-xs px-2 py-1 rounded-md bg-white/70 dark:bg-black/20">
                      {file.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-sm dark:text-white  ">{message.content}</p>
            <span className="text-xs text-gray-400 dark:text-white">
              {moment(message.timestamp).fromNow()}
            </span>
          </div>
          <img src={assets.user_icon} alt="" className="w-8 rounded-full" />
        </div>
      ) : (
        <div className="inline-flex flex-col gap-2 p-2 px-4 max-w-2xl bg-primay/20  dark:text-white">
          <div
            ref={messageRef}
            className="text-sm dark:text-primary reset-tw"
          >
            <Markdown
              remarkPlugins={[remarkGfm]}
              components={{ pre: MarkdownCodeBlock }}
            >
              {message.content}
            </Markdown>
          </div>
        </div>
      )}
      <span className="text-xs text-gray-400 dark:text-[#B1A6C0]">
        {" "}
        {moment(message.timestamp).fromNow()}
      </span>
      <hr className="border-black dark:border-gray-600" />
    </div>
  )
}

export default Message
