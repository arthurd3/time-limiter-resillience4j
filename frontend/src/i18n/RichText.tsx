import type { ReactNode } from 'react'

/**
 * Renders a copy string with a minimal inline vocabulary.
 *
 * Prose lives in the dictionary as whole sentences rather than as fragments glued together in
 * JSX. Fragmenting a sentence across keys forces every language into English word order; keeping
 * it whole lets a translator move the emphasis wherever their language actually wants it.
 *
 *   **bold**            emphasis in primary ink
 *   *italic*
 *   `code`
 *   [label](href)       external link
 *   <caller>…</caller>  a lane token, coloured to match the figures (also worker, deadline)
 *   {name}              a value passed in via `values`
 */
const TOKEN =
  /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|<(?:caller|worker|deadline)>[^<]+<\/(?:caller|worker|deadline)>|\{[a-zA-Z0-9_]+\})/g

const LANE_CLASS: Record<string, string> = {
  caller: 'text-caller',
  worker: 'text-worker',
  deadline: 'text-critical',
}

export function RichText({
  children,
  values = {},
}: {
  children: string
  values?: Record<string, ReactNode>
}) {
  const parts = children.split(TOKEN).filter((p) => p !== '')

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <b key={i} className="font-semibold text-ink">
              <RichText values={values}>{part.slice(2, -2)}</RichText>
            </b>
          )
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={i} className="font-mono text-[13px]">
              {part.slice(1, -1)}
            </code>
          )
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return (
            <em key={i}>
              <RichText values={values}>{part.slice(1, -1)}</RichText>
            </em>
          )
        }
        const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part)
        if (link) {
          return (
            <a
              key={i}
              href={link[2]}
              target="_blank"
              rel="noreferrer"
              className="text-caller underline-offset-4 hover:underline"
            >
              {link[1]}
            </a>
          )
        }
        const lane = /^<(caller|worker|deadline)>(.+)<\/\1>$/.exec(part)
        if (lane) {
          return (
            <b key={i} className={`font-semibold ${LANE_CLASS[lane[1]]}`}>
              <RichText values={values}>{lane[2]}</RichText>
            </b>
          )
        }
        const value = /^\{([a-zA-Z0-9_]+)\}$/.exec(part)
        if (value) {
          return <span key={i}>{values[value[1]] ?? ''}</span>
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

/** Convenience for a whole paragraph of copy. */
export function P({ children, values }: { children: string; values?: Record<string, ReactNode> }) {
  return (
    <p>
      <RichText values={values}>{children}</RichText>
    </p>
  )
}
