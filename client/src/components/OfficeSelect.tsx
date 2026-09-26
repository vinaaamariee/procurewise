import * as React from "react";
import { Check, ChevronsUpDown, Building2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { trpc } from "@/lib/trpc";
import { INSTITUTIONAL_OFFICES, InstitutionalOffice } from "../../../shared/institutionalOffices";

export interface OfficeOption {
  id?: number;
  code: string;
  name: string;
  category?: string;
}

export interface OfficeSelectProps {
  /** The value: either numeric ID or string Name/Code depending on `valueMode` */
  value?: string | number | null;
  /** Whether the value should be the office ID or office Name */
  valueMode?: "id" | "name";
  /** Callback fired when office selection changes */
  onChange?: (value: string) => void;
  /** Callback fired with full office metadata on selection */
  onSelectOffice?: (office: OfficeOption | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  /** Allow selecting an "All Offices" or "Clear" option */
  allowAll?: boolean;
  allLabel?: string;
  allValue?: string;
  /** Show a clear button */
  allowClear?: boolean;
  /** Accessible ID for labels */
  id?: string;
  /** Additional custom options if needed */
  customOffices?: OfficeOption[];
}

export function OfficeSelect({
  value,
  valueMode = "name",
  onChange,
  onSelectOffice,
  placeholder = "Select office or department...",
  disabled = false,
  className,
  triggerClassName,
  allowAll = false,
  allLabel = "All Offices",
  allValue = "",
  allowClear = false,
  id,
  customOffices,
}: OfficeSelectProps) {
  const [open, setOpen] = React.useState(false);

  // Fetch offices from setup API (which seeds and returns database offices)
  const setupOfficesQuery = trpc.procurement.setup.offices.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Combine database offices with institutional master list
  const combinedOffices = React.useMemo<OfficeOption[]>(() => {
    const list: OfficeOption[] = [];
    const seenCodes = new Set<string>();
    const seenNames = new Set<string>();

    // 1. Add from customOffices if provided
    if (customOffices?.length) {
      for (const o of customOffices) {
        if (!seenCodes.has(o.code.toUpperCase()) && !seenNames.has(o.name.toLowerCase())) {
          list.push(o);
          seenCodes.add(o.code.toUpperCase());
          seenNames.add(o.name.toLowerCase());
        }
      }
    }

    // 2. Add from server query
    if (setupOfficesQuery.data?.length) {
      for (const o of setupOfficesQuery.data) {
        const matchingInst = INSTITUTIONAL_OFFICES.find(
          (inst) => inst.code.toLowerCase() === o.code.toLowerCase() || inst.name.toLowerCase() === o.name.toLowerCase()
        );
        if (!seenCodes.has(o.code.toUpperCase()) && !seenNames.has(o.name.toLowerCase())) {
          list.push({
            id: o.id,
            code: o.code,
            name: o.name,
            category: matchingInst?.category || "Other Units",
          });
          seenCodes.add(o.code.toUpperCase());
          seenNames.add(o.name.toLowerCase());
        }
      }
    }

    // 3. Fallback / supplement with INSTITUTIONAL_OFFICES constants
    for (const inst of INSTITUTIONAL_OFFICES) {
      if (!seenCodes.has(inst.code.toUpperCase()) && !seenNames.has(inst.name.toLowerCase())) {
        list.push({
          code: inst.code,
          name: inst.name,
          category: inst.category,
        });
        seenCodes.add(inst.code.toUpperCase());
        seenNames.add(inst.name.toLowerCase());
      }
    }

    return list;
  }, [customOffices, setupOfficesQuery.data]);

  // Group offices by category
  const groupedOffices = React.useMemo(() => {
    const groups: Record<string, OfficeOption[]> = {};
    for (const office of combinedOffices) {
      const cat = office.category || "Offices & Units";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(office);
    }
    return groups;
  }, [combinedOffices]);

  // Normalize string value comparison
  const selectedOffice = React.useMemo(() => {
    if (value === undefined || value === null || value === "" || (allowAll && value === allValue)) {
      return null;
    }

    if (valueMode === "id") {
      const numVal = Number(value);
      return combinedOffices.find((o) => o.id === numVal) || null;
    }

    const strVal = String(value).trim().toLowerCase();
    return (
      combinedOffices.find(
        (o) =>
          o.name.toLowerCase() === strVal ||
          o.code.toLowerCase() === strVal ||
          (o.id !== undefined && String(o.id) === strVal)
      ) || null
    );
  }, [value, valueMode, allowAll, allValue, combinedOffices]);

  const handleSelect = (office: OfficeOption | null) => {
    if (!office) {
      onChange?.(allowAll ? allValue : "");
      onSelectOffice?.(null);
    } else {
      const returnedValue = valueMode === "id" ? String(office.id ?? "") : office.name;
      onChange?.(returnedValue);
      onSelectOffice?.(office);
    }
    setOpen(false);
  };

  const displayText = React.useMemo(() => {
    if (allowAll && (value === allValue || value === "" || value === undefined)) {
      return allLabel;
    }
    if (selectedOffice) {
      return `${selectedOffice.code} — ${selectedOffice.name}`;
    }
    if (value) {
      return String(value);
    }
    return placeholder;
  }, [allowAll, value, allValue, allLabel, selectedOffice, placeholder]);

  return (
    <div className={cn("relative w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "flex h-9 w-full items-center justify-between rounded-[4px] border border-border bg-background px-3 text-xs font-normal text-foreground hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-ring dark:border-[#46515c] dark:bg-[#1b2229] dark:text-[#f1f5f8]",
              !selectedOffice && !allowAll && "text-muted-foreground dark:text-[#8896a6]",
              triggerClassName
            )}
          >
            <div className="flex items-center gap-2 truncate text-left">
              <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
              <span className="truncate">{displayText}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              {allowClear && selectedOffice && !disabled && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(null);
                  }}
                  className="rounded-full p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </span>
              )}
              <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] min-w-[280px] p-0 shadow-lg border border-border dark:border-[#46515c] dark:bg-[#1b2229]"
        >
          <Command
            filter={(itemValue, search) => {
              if (itemValue.toLowerCase().includes(search.toLowerCase())) return 1;
              return 0;
            }}
          >
            <CommandInput
              placeholder="Search office or code (e.g. ICT, OOP, Library)..."
              className="h-9 text-xs"
            />
            <CommandList className="max-h-64 overflow-y-auto">
              <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
                No matching office found.
              </CommandEmpty>

              {allowAll && (
                <>
                  <CommandGroup>
                    <CommandItem
                      value={`${allLabel} all`}
                      onSelect={() => handleSelect(null)}
                      className="cursor-pointer text-xs font-medium py-1.5"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-3.5 w-3.5 shrink-0",
                          !selectedOffice ? "opacity-100 text-[#7b1e1e] dark:text-[#ff837a]" : "opacity-0"
                        )}
                      />
                      <span>{allLabel}</span>
                    </CommandItem>
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}

              {Object.entries(groupedOffices).map(([category, offices]) => (
                <CommandGroup key={category} heading={category}>
                  {offices.map((office) => {
                    const isSelected = selectedOffice?.name.toLowerCase() === office.name.toLowerCase() ||
                      (valueMode === "id" && office.id && Number(value) === office.id);
                    return (
                      <CommandItem
                        key={`${office.code}-${office.name}`}
                        value={`${office.code} ${office.name}`}
                        onSelect={() => handleSelect(office)}
                        className="cursor-pointer text-xs py-1.5"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-3.5 w-3.5 shrink-0",
                            isSelected ? "opacity-100 text-[#7b1e1e] dark:text-[#ff837a]" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-foreground truncate">
                            <span className="font-bold text-[#7b1e1e] dark:text-[#ff837a] mr-1.5">
                              {office.code}
                            </span>
                            — {office.name}
                          </span>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
export default OfficeSelect;
