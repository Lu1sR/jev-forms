// Ink marks, drawn like a reviewer's pen: a check for "listo", a wavy
// underline with a query "?" for "revisa", a strike for "no aparece", a pen tick for corrections.
// State is carried by the mark's shape, never by colour alone.

import type { SVGProps } from "react";
import type { Answer } from "@/lib/types";

type MarkProps = SVGProps<SVGSVGElement> & { title?: string };

export function Check({ title, ...rest }: MarkProps) {
  return (
    <svg viewBox="0 0 28 22" aria-hidden={!title} role={title ? "img" : undefined} {...rest}>
      {title ? <title>{title}</title> : null}
      <path
        d="M2.5 12.8c2.2 1.4 4.3 3.4 6 6.2 3.4-7.1 8.9-12.8 16.9-17"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
      />
    </svg>
  );
}

export function Wave({ title, ...rest }: MarkProps) {
  return (
    <svg viewBox="0 0 28 22" aria-hidden={!title} role={title ? "img" : undefined} {...rest}>
      {title ? <title>{title}</title> : null}
      <path
        d="M2 17c2.4-3.2 4.3-3.2 6 0s3.9 3.2 6 0 3.9-3.2 6 0 3.6 3 6-.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        pathLength={1}
      />
      <path
        d="M11.2 3.6c.5-1.5 1.7-2.3 3.1-2.3 1.6 0 2.8 1 2.8 2.4 0 1.4-1 2-2 2.6-.8.5-1.1 1-1.1 1.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        pathLength={1}
      />
      <circle cx="14" cy="11.4" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function Strike({ title, ...rest }: MarkProps) {
  return (
    <svg viewBox="0 0 28 22" aria-hidden={!title} role={title ? "img" : undefined} {...rest}>
      {title ? <title>{title}</title> : null}
      <path d="M3 11.6c7.4-1 14.6-1.2 22-.6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" pathLength={1} />
    </svg>
  );
}

export function PenTick({ title, ...rest }: MarkProps) {
  return (
    <svg viewBox="0 0 28 22" aria-hidden={!title} role={title ? "img" : undefined} {...rest}>
      {title ? <title>{title}</title> : null}
      <path
        d="M4 16.5 15.8 4.7a2.3 2.3 0 0 1 3.3 3.3L7.3 19.8 3 21l1-4.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        pathLength={1}
      />
    </svg>
  );
}

export function StatusMark({ status, ...rest }: MarkProps & { status: Answer["status"] }) {
  switch (status) {
    case "green":
      return <Check {...rest} />;
    case "yellow":
      return <Wave {...rest} />;
    case "corrected":
      return <PenTick {...rest} />;
    default:
      return <Strike {...rest} />;
  }
}
