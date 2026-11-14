import React from "react"

interface MarkdownTextProps {
  content: string
  className?: string
}

function isTableDelimiter(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed.includes("-") || !trimmed.includes("|")) return false
  const cells = trimmed
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map(c => c.trim())
  return cells.length > 0 && cells.every(c => /^:?-{2,}:?$/.test(c))
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map(c => c.trim())
}

function getTableAlignments(line: string): Array<"left" | "center" | "right" | undefined> {
  const cells = line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map(c => c.trim())

  return cells.map(c => {
    const left = c.startsWith(":")
    const right = c.endsWith(":")
    if (left && right) return "center"
    if (right) return "right"
    if (left) return "left"
    return undefined
  })
}

function isTableRow(line: string): boolean {
  const trimmed = line.trim()
  return trimmed.includes("|") && trimmed.length >= 3
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

  let i = 0
  while (i < lines.length) {
    const rawLine = lines[i]
    const line = rawLine.trim()

    // Empty line -> flush list and skip
    if (!line) {
      flushList()
      i++
      continue
    }

    // 1. Table Detection: Header row followed by delimiter row
    if (isTableRow(line) && i + 1 < lines.length && isTableDelimiter(lines[i + 1])) {
      flushList()
      const headerRow = parseTableRow(line)
      const alignments = getTableAlignments(lines[i + 1])
      const rows: string[][] = []
      i += 2 // skip header and delimiter

      while (i < lines.length && isTableRow(lines[i]) && !isTableDelimiter(lines[i])) {
        rows.push(parseTableRow(lines[i]))
        i++
      }

      elements.push(
        <div key={`table-${elements.length}`} className="my-2.5 max-w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 font-bold">
              <tr>
                {headerRow.map((h, colIdx) => (
                  <th
                    key={colIdx}
                    className={`p-2.5 sm:px-3 sm:py-2.5 whitespace-nowrap ${
                      alignments[colIdx] === "center"
                        ? "text-center"
                        : alignments[colIdx] === "right"
                          ? "text-right"
                          : "text-left"
                    }`}
                  >
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-300">
              {rows.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  {headerRow.map((_, colIdx) => {
                    const cell = row[colIdx] || ""
                    return (
                      <td
                        key={colIdx}
                        className={`p-2.5 sm:px-3 sm:py-2.5 leading-snug ${
                          alignments[colIdx] === "center"
                            ? "text-center"
                            : alignments[colIdx] === "right"
                              ? "text-right"
                              : "text-left"
                        }`}
                      >
                        {renderInline(cell)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue
    }

    // 2. Unordered list item: starts with '- ' or '* ' or '• '
    const ulMatch = line.match(/^[-*•]\s+(.*)$/)
    if (ulMatch) {
      if (currentList && currentList.type !== "ul") {
        flushList()
      }
      if (!currentList) {
        currentList = { type: "ul", items: [] }
      }
      currentList.items.push(ulMatch[1])
      i++
      continue
    }

    // 3. Ordered list item: starts with '1. ', '2. ', etc.
    const olMatch = line.match(/^\d+\.\s+(.*)$/)
    if (olMatch) {
      if (currentList && currentList.type !== "ol") {
        flushList()
      }
      if (!currentList) {
        currentList = { type: "ol", items: [] }
      }
      currentList.items.push(olMatch[1])
      i++
      continue
    }

    // Not a list line, so flush any pending list
    flushList()

    // 4. Headings
    if (line.startsWith("### ")) {
      elements.push(
        <h4 key={`h4-${i}`} className="font-bold text-sm mt-2.5 mb-1 text-slate-900 dark:text-white">
          {renderInline(line.slice(4))}
        </h4>
      )
      i++
      continue
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h3 key={`h3-${i}`} className="font-bold text-base mt-3 mb-1 text-slate-900 dark:text-white">
          {renderInline(line.slice(3))}
        </h3>
      )
      i++
      continue
    }
    if (line.startsWith("# ")) {
      elements.push(
        <h2 key={`h2-${i}`} className="font-extrabold text-lg mt-3.5 mb-1.5 text-slate-900 dark:text-white">
          {renderInline(line.slice(2))}
        </h2>
      )
      i++
      continue
    }

    // 5. Regular paragraph
    elements.push(
      <p key={`p-${i}`} className="my-1 first:mt-0 last:mb-0 leading-relaxed">
        {renderInline(line)}
      </p>
    )
    i++
  }

  // Flush remaining list if any
  flushList()

  return <div className={`text-sm ${className}`}>{elements}</div>
}
