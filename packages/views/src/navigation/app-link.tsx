"use client";

import { forwardRef } from "react";
import { useNavigation } from "@spec-ui/core/navigation/provider";

type AppLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};

export const AppLink = forwardRef<HTMLAnchorElement, AppLinkProps>(
  function AppLink(
    { href, children, onClick, onMouseEnter, onFocus, ...props },
    ref,
  ) {
    const { push, prefetch } = useNavigation();

    function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      event.preventDefault();
      onClick?.(event);
      push(href);
    }

    function handleMouseEnter(event: React.MouseEvent<HTMLAnchorElement>) {
      prefetch?.(href);
      onMouseEnter?.(event);
    }

    function handleFocus(event: React.FocusEvent<HTMLAnchorElement>) {
      prefetch?.(href);
      onFocus?.(event);
    }

    return (
      <a
        ref={ref}
        href={href}
        {...props}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onFocus={handleFocus}
      >
        {children}
      </a>
    );
  },
);
