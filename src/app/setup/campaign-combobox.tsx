"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type CampaignOption = {
  id: string
  name: string
  orientation?: "portrait" | "landscape" | null
}

const CLEAR_SENTINEL = "__none__"

type CampaignComboboxProps = {
  campaigns: CampaignOption[]
  value: string
  onValueChange: (campaignId: string) => void
  disabled?: boolean
  emptyLabel?: string
  triggerId?: string
}

export function CampaignCombobox({
  campaigns,
  value,
  onValueChange,
  disabled,
  emptyLabel = "No campaign found.",
  triggerId = "campaign-combobox-trigger",
}: CampaignComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const selected = campaigns.find((c) => c.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={triggerId}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between border-zinc-600 bg-zinc-800/80 font-normal text-zinc-100 shadow-none hover:bg-zinc-800 hover:text-zinc-50"
        >
          <span className="truncate text-left">
            {selected ? selected.name : "Select a campaign…"}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 text-zinc-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] border-zinc-700 bg-zinc-900 p-0 text-zinc-100 shadow-xl shadow-black/50"
        align="start"
      >
        <Command className="bg-zinc-900 text-zinc-100 [&_[cmdk-item]]:text-zinc-100 [&_[cmdk-item]_svg]:text-zinc-400 [&_[data-slot=command-input-wrapper]]:border-zinc-800">
          <CommandInput
            placeholder="Search campaigns…"
            className="h-9 border-0 text-zinc-100 placeholder:text-zinc-500"
          />
          <CommandList>
            <CommandEmpty className="text-zinc-500">{emptyLabel}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value={CLEAR_SENTINEL}
                onSelect={() => {
                  onValueChange("")
                  setOpen(false)
                }}
                className="cursor-pointer text-zinc-500 aria-selected:bg-zinc-800 data-[selected=true]:bg-zinc-800"
              >
                <span className="truncate">Select a campaign…</span>
                <Check
                  className={cn(
                    "ml-auto size-4 shrink-0 text-blue-400",
                    value === "" ? "opacity-100" : "opacity-0",
                  )}
                />
              </CommandItem>
              {campaigns.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.id}
                  keywords={[c.name]}
                  onSelect={(currentValue) => {
                    const match = campaigns.find(
                      (x) => x.id.toLowerCase() === currentValue.toLowerCase(),
                    )
                    if (match) {
                      onValueChange(match.id)
                    }
                    setOpen(false)
                  }}
                  className="cursor-pointer text-zinc-200 aria-selected:bg-zinc-800 data-[selected=true]:bg-zinc-800"
                >
                  <span className="truncate">{c.name}</span>
                  <Check
                    className={cn(
                      "ml-auto size-4 shrink-0 text-blue-400",
                      value === c.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
