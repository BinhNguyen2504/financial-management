import { Fragment } from "react";

// Editorial emphasis only: plain text stays escaped by React. No HTML or links.
export function HelpText({ text }: { text: string }) {
  return text
    .replace(/^Kết quả:/, "**Kết quả:**")
    .split(/(\*\*[\s\S]+?\*\*|==[\s\S]+?==)/g)
    .map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      if (part.startsWith("==") && part.endsWith("=="))
        return (
          <strong className="help-emphasis" key={index}>
            {part.slice(2, -2)}
          </strong>
        );
      return <Fragment key={index}>{part}</Fragment>;
    });
}
