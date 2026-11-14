import React from "react"

interface MarkdownTextProps {
  content: string
  className?: string
}

export function MarkdownText({ content, className = "" }: MarkdownTextProps) {
  if (!content) return null

  // Helper to parse inline markdown (bold, italic, code, links)
  const renderInline = (text: string): React.ReactNode[] => {
    // Regex splits on markdown tokens:
    // 1. Links: [text](url)
    // 2. Bold: **text** or __text__
    // 3. Inline code: `text`
    // 4. Italic: *text* or _text_
    const regex = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|_[^_]+_)/g
    const parts = text.split(regex)

    return parts.map((part, index) => {
      if (!part) return null

      // Link: [label](url)
      if (part.startsWith("[") && part.includes("](") && part.endsWith(")")) {
        const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
        if (match) {
          return (
            <a
              key={index}
              href={match[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#16795A] dark:text-teal-400 font-medium underline underline-offset-2 hover:opacity-80"
            >
              {match[1]}
            </a>
          )
        }
      }

      // Bold: **text** or __text__
      if ((part.startsWith("**") && part.endsWith("**") && part.length >= 4) ||
          (part.startsWith("__") && part.endsWith("__") && part.length >= 4)) {
        return <strong key={index} className="font-bold text-slate-900 dark:text-white">{part.slice(2, -2)}</strong>
      }

      // Inline code: `text`
      if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
        return (
          <code
            key={index}
            className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-200/60 dark:bg-slate-800 font-mono text-[11px] text-slate-800 dark:text-slate-200"
          >
            {part.slice(1, -1)}
          </code>
        )
      }

      // Italic: *text* or _text_
      if ((part.startsWith("*") && part.endsWith("*") && part.length >= 2) ||
          (part.startsWith("_") && part.endsWith("_") && part.length >= 2)) {
        return <em key={index} className="italic">{part.slice(1, -1)}</em>
      }

      return <React.Fragment key={index}>{part}</React.Fragment>
    })
  }

  // Parse block-level markdown: headings, bullet lists, numbered lists, paragraphs
  const lines = content.split("\n")
  const elements: React.ReactNode[] = []

  let currentList: { type: "ul" | "ol"; items: string[] } | null = null

  const flushList = () => {
    if (!currentList) return
    const isUl = currentList.type === "ul"
    const ListTag = isUl ? "ul" : "ol"
    const listClass = isUl
      ? "list-disc pl-5 my-1.5 space-y-1 text-inherit"
      : "list-decimal pl-5 my-1.5 space-y-1 text-inherit"

    elements.push(
      <ListTag key={`list-${elements.length}`} className={listClass}>
        {currentList.items.map((item, i) => (
          <li key={i} className="leading-relaxed">
            {renderInline(item)}
          </li>
        ))}
      </ListTag>
    )
    currentList = null
  }

  lines.forEach((rawLine, lineIndex) => {
    const line = rawLine.trim()

    // Empty line -> flush list and skip
    if (!line) {
      flushList()
      return
    }

    // Unordered list item: starts with '- ' or '* ' or '• '
    const ulMatch = line.match(/^[-*•]\s+(.*)$/)
    if (ulMatch) {
      if (currentList && currentList.type !== "ul") {
        flushList()
      }
      if (!currentList) {
        currentList = { type: "ul", items: [] }
      }
      currentList.items.push(ulMatch[1])
      return
    }

    // Ordered list item: starts with '1. ', '2. ', etc.
    const olMatch = line.match(/^\d+\.\s+(.*)$/)
    if (olMatch) {
      if (currentList && currentList.type !== "ol") {
        flushList()
      }
      if (!currentList) {
        currentList = { type: "ol", items: [] }
      }
      currentList.items.push(olMatch[1])
      return
    }

    // Not a list line, so flush any pending list
    flushList()

    // Headings
    if (line.startsWith("### ")) {
      elements.push(
        <h4 key={`h4-${lineIndex}`} className="font-bold text-sm mt-2.5 mb-1 text-slate-900 dark:text-white">
          {renderInline(line.slice(4))}
        </h4>
      )
      return
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h3 key={`h3-${lineIndex}`} className="font-bold text-base mt-3 mb-1 text-slate-900 dark:text-white">
          {renderInline(line.slice(3))}
        </h3>
      )
      return
    }
    if (line.startsWith("# ")) {
      elements.push(
        <h2 key={`h2-${lineIndex}`} className="font-extrabold text-lg mt-3.5 mb-1.5 text-slate-900 dark:text-white">
          {renderInline(line.slice(2))}
        </h2>
      )
      return
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${lineIndex}`} className="my-1 first:mt-0 last:mb-0 leading-relaxed">
        {renderInline(line)}
      </p>
    )
  })

  // Flush remaining list if any
  flushList()

  return <div className={`text-sm ${className}`}>{elements}</div>
}
