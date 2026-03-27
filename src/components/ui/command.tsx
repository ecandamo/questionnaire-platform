"use client"

import * as React from "react"
import { SearchIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent } from "@/components/ui/dialog"

// Lightweight command palette built without cmdk dependency
// Provides CommandDialog, CommandInput, CommandList, CommandItem, CommandEmpty, CommandGroup

interface CommandContextValue {
  search: string
  setSearch: (v: string) => void
}

const CommandContext = React.createContext<CommandContextValue>({
  search: "",
  setSearch: () => {},
})

function Command({ className, children, ...props }: React.ComponentProps<"div">) {
  const [search, setSearch] = React.useState("")
  return (
    <CommandContext.Provider value={{ search, setSearch }}>
      <div
        className={cn(
          "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </CommandContext.Provider>
  )
}

function CommandDialog({ children, ...props }: React.ComponentProps<typeof Dialog>) {
  return (
    <Dialog {...props}>
      <DialogContent className="overflow-hidden p-0">
        <Command>
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  )
}

function CommandInput({ className, ...props }: React.ComponentProps<"input">) {
  const { search, setSearch } = React.useContext(CommandContext)
  return (
    <div className="flex items-center border-b border-border px-3">
      <SearchIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" />
      <input
        className={cn(
          "flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        {...props}
      />
    </div>
  )
}

function CommandList({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
      {...props}
    >
      {children}
    </div>
  )
}

function CommandEmpty({ className, ...props }: React.ComponentProps<"div">) {
  const { search } = React.useContext(CommandContext)
  if (!search) return null
  return (
    <div
      className={cn("py-6 text-center text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CommandGroup({
  className,
  heading,
  children,
  ...props
}: React.ComponentProps<"div"> & { heading?: string }) {
  return (
    <div className={cn("overflow-hidden p-1", className)} {...props}>
      {heading && (
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{heading}</div>
      )}
      {children}
    </div>
  )
}

interface CommandItemProps extends React.ComponentProps<"div"> {
  onSelect?: () => void
  value?: string
}

function CommandItem({ className, onSelect, children, ...props }: CommandItemProps) {
  return (
    <div
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
        className
      )}
      onClick={onSelect}
      role="option"
      aria-selected={false}
      {...props}
    >
      {children}
    </div>
  )
}

function CommandSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("-mx-1 h-px bg-border", className)} {...props} />
}

export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
}
