"use client";

import { ChevronDown } from "lucide-react";
import { ReactNode, useId, useState } from "react";

type DetailSectionProps = {
  children: ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  summary?: ReactNode;
  title: string;
};

export function DetailSection({
  children,
  collapsible = true,
  defaultExpanded = true,
  summary,
  title,
}: DetailSectionProps) {
  const contentId = useId();
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!collapsible) {
    return (
      <section className="detail-section detail-section--fixed">
        <header className="detail-section__header">
          <h3 className="detail-section__title">{title}</h3>
          {summary ? <div className="detail-section__summary">{summary}</div> : null}
        </header>
        <div className="detail-section__content">{children}</div>
      </section>
    );
  }

  return (
    <section className="detail-section detail-section--collapsible">
      <header className="detail-section__header">
        <button
          type="button"
          className="detail-section__toggle"
          aria-controls={contentId}
          aria-expanded={expanded}
          aria-label={title}
          onClick={() => setExpanded((current) => !current)}
        >
          <span className="detail-section__heading">
            <span className="detail-section__title">{title}</span>
            {summary ? <span className="detail-section__summary">{summary}</span> : null}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={expanded ? "detail-section__chevron is-expanded" : "detail-section__chevron"}
            size={18}
          />
        </button>
      </header>
      {expanded ? (
        <div className="detail-section__content" id={contentId}>
          {children}
        </div>
      ) : null}
    </section>
  );
}
