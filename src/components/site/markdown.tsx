import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Article body text. Raw HTML in the Markdown is not rendered. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="article-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ node, ...props }) => {
            void node;
            return (
              <div className="-mx-1 overflow-x-auto px-1">
                <table {...props} />
              </div>
            );
          },
          a: ({ node, href, ...props }) => {
            void node;
            const external = href?.startsWith("http");
            return (
              <a
                href={href}
                {...props}
                {...(external ? { rel: "noopener noreferrer", target: "_blank" } : {})}
              />
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
