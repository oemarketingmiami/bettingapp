import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Renders the analyst's reply as clean, professional text — bold/lists/tables
// format properly instead of showing raw markdown symbols.
export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-sm leading-relaxed text-zinc-100">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2.5 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
          em: ({ children }) => <em className="italic text-zinc-200">{children}</em>,
          ul: ({ children }) => <ul className="mb-2.5 ml-1 list-none space-y-1.5">{children}</ul>,
          ol: ({ children }) => <ol className="mb-2.5 ml-5 list-decimal space-y-1.5 marker:text-zinc-500">{children}</ol>,
          li: ({ children }) => (
            <li className="flex gap-2 [ol_&]:list-item [ol_&]:pl-0">
              <span className="mt-2 hidden h-1 w-1 shrink-0 rounded-full bg-sky-400/70 [ul_&]:block" />
              <span className="min-w-0">{children}</span>
            </li>
          ),
          h1: ({ children }) => <h3 className="mb-2 mt-1 font-display text-base font-semibold text-white">{children}</h3>,
          h2: ({ children }) => <h3 className="mb-2 mt-1 font-display text-base font-semibold text-white">{children}</h3>,
          h3: ({ children }) => <h4 className="mb-1.5 mt-1 font-semibold text-zinc-100">{children}</h4>,
          a: ({ children, href }) => <a href={href} className="text-sky-400 underline underline-offset-2">{children}</a>,
          code: ({ children }) => <code className="rounded bg-white/10 px-1 py-0.5 text-[13px] text-sky-200">{children}</code>,
          hr: () => <hr className="my-3 border-white/10" />,
          table: ({ children }) => <div className="mb-2.5 overflow-x-auto"><table className="w-full text-xs">{children}</table></div>,
          th: ({ children }) => <th className="border-b border-white/10 px-2 py-1 text-left font-medium text-zinc-400">{children}</th>,
          td: ({ children }) => <td className="border-b border-white/5 px-2 py-1 text-zinc-200">{children}</td>,
          blockquote: ({ children }) => <blockquote className="mb-2.5 border-l-2 border-sky-500/40 pl-3 text-zinc-300">{children}</blockquote>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
