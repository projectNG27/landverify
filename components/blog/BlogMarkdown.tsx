import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  markdown: string;
  className?: string;
};

export function BlogMarkdown({ markdown, className = "" }: Props) {
  return (
    <div className={`lv-prose ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </div>
  );
}
