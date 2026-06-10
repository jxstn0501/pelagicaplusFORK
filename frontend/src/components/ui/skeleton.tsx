import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "rounded-md overflow-hidden relative bg-white/5 skeleton-shimmer",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
