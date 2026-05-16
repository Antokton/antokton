import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  const defaultStyle = {
    backgroundColor: 'var(--bg)',
    borderColor: 'var(--line)',
    color: 'var(--text)',
  };
  return (
    (<textarea
      className={cn(
        "flex min-h-[60px] w-full rounded-md border px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      style={defaultStyle}
      ref={ref}
      {...props} />)
  );
})
Textarea.displayName = "Textarea"

export { Textarea }