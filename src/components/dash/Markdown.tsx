import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

const components: Components = {
  p: (p) => <p className="leading-relaxed" {...strip(p)} />,
  h1: (p) => <h3 className="mt-1 text-[15px] font-bold" {...strip(p)} />,
  h2: (p) => <h3 className="mt-1 text-[15px] font-bold" {...strip(p)} />,
  h3: (p) => <h4 className="mt-1 text-sm font-bold" {...strip(p)} />,
  h4: (p) => <h4 className="mt-1 text-sm font-semibold" {...strip(p)} />,
  h5: (p) => <h5 className="text-sm font-semibold" {...strip(p)} />,
  h6: (p) => <h6 className="text-sm font-semibold" {...strip(p)} />,
  ul: (p) => <ul className="ml-5 list-disc space-y-1 marker:text-muted-foreground" {...strip(p)} />,
  ol: (p) => (
    <ol className="ml-5 list-decimal space-y-1 marker:text-muted-foreground" {...strip(p)} />
  ),
  li: (p) => <li className="pl-0.5 [&>ol]:mt-1 [&>p]:inline [&>ul]:mt-1" {...strip(p)} />,
  strong: (p) => <strong className="font-semibold" {...strip(p)} />,
  hr: () => <hr className="border-border" />,
  blockquote: (p) => <blockquote className="border-l-2 pl-3 text-muted-foreground" {...strip(p)} />,
  a: (p) => (
    <a
      className="font-medium text-primary underline underline-offset-2"
      target="_blank"
      rel="noopener noreferrer"
      {...strip(p)}
    />
  ),
  pre: (p) => (
    <pre
      className="overflow-x-auto rounded-md bg-background/70 p-2 font-mono text-xs"
      {...strip(p)}
    />
  ),
  code: ({ className, ...p }) => (
    <code
      className={cn(
        "font-mono text-[0.85em]",
        // inline code has no language class and isn't inside <pre>
        !className && "rounded bg-background/70 px-1 py-0.5",
        className,
      )}
      {...strip(p)}
    />
  ),
  table: (p) => (
    <div className="overflow-x-auto rounded-md border bg-background/50">
      <table className="w-full border-collapse text-xs" {...strip(p)} />
    </div>
  ),
  thead: (p) => <thead className="bg-background/70" {...strip(p)} />,
  th: (p) => (
    <th className="whitespace-nowrap border-b px-2 py-1.5 text-left font-semibold" {...strip(p)} />
  ),
  td: (p) => <td className="border-b px-2 py-1.5 align-top last:border-b-0" {...strip(p)} />,
};

/** react-markdown passes the hast `node` prop; keep it off the DOM element. */
function strip<T extends { node?: unknown }>(props: T): Omit<T, "node"> {
  const { node: _node, ...rest } = props;
  return rest;
}

/** Renders an assistant reply as GitHub-flavoured markdown (tables, lists, code, links). */
export function Markdown({ content }: { content: string }) {
  return (
    <div className="space-y-2 break-words text-sm [&>*:first-child]:mt-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
