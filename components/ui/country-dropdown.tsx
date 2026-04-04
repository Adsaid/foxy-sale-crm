"use client";

import React, { useCallback, useState, forwardRef, useEffect } from "react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { cn } from "@/lib/utils";

import { ChevronDownIcon, Globe } from "lucide-react";
import { CircleFlag } from "react-circle-flags";

import { countries } from "country-data-list";

export interface Country {
  alpha2: string;
  alpha3: string;
  countryCallingCodes: string[];
  currencies: string[];
  emoji?: string;
  ioc: string;
  languages: string[];
  name: string;
  status: string;
}

interface CountryDropdownProps {
  options?: Country[];
  onChange?: (country: Country) => void;
  defaultValue?: string;
  disabled?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  /** Текст, коли пошук нічого не знайшов */
  emptyText?: string;
  slim?: boolean;
  className?: string;
}

/** Стабільне посилання: інакше `useEffect(..., [options])` спрацьовував би щоразу на новому масиві з дефолту. */
const DEFAULT_COUNTRY_OPTIONS = countries.all.filter(
  (country: Country) =>
    country.emoji && country.status !== "deleted" && country.ioc !== "PRK"
) as Country[];

const CountryDropdownComponent = (
  {
    options = DEFAULT_COUNTRY_OPTIONS,
    onChange,
    defaultValue,
    disabled = false,
    placeholder = "Оберіть країну",
    searchPlaceholder = "Пошук країни…",
    emptyText = "Країну не знайдено",
    slim = false,
    className,
    ...props
  }: CountryDropdownProps,
  ref: React.ForwardedRef<HTMLButtonElement>
) => {
  const [open, setOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country | undefined>(
    undefined
  );

  useEffect(() => {
    if (defaultValue) {
      const initialCountry = options.find(
        (country) => country.alpha3 === defaultValue
      );
      if (initialCountry) {
        setSelectedCountry(initialCountry);
      } else {
        setSelectedCountry(undefined);
      }
    } else {
      setSelectedCountry(undefined);
    }
  }, [defaultValue, options]);

  const handleSelect = useCallback(
    (country: Country) => {
      setSelectedCountry(country);
      onChange?.(country);
      setOpen(false);
    },
    [onChange]
  );

  /** Як у `SelectTrigger`: rounded-4xl, bg-input/30, кільця фокусу. */
  const triggerClasses = cn(
    "flex items-center justify-between gap-1.5 rounded-4xl border border-input bg-input/30 px-3 py-2 text-sm whitespace-nowrap transition-colors outline-none",
    "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "dark:hover:bg-input/50",
    "[&>span]:line-clamp-1",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    slim ? "h-9 w-20" : "h-9 w-full",
    className
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        ref={ref}
        type="button"
        className={triggerClasses}
        disabled={disabled}
        data-slot="country-dropdown-trigger"
        {...props}
      >
        {selectedCountry ? (
          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
            <div className="inline-flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full">
              <CircleFlag
                countryCode={selectedCountry.alpha2.toLowerCase()}
                height={20}
              />
            </div>
            {slim === false && (
              <span className="truncate text-left font-medium tabular-nums tracking-wide text-foreground">
                {selectedCountry.alpha2.toUpperCase()}
              </span>
            )}
          </div>
        ) : (
          <span
            className={cn(
              "flex min-w-0 flex-1 items-center gap-2 text-left",
              slim ? "justify-center" : "text-muted-foreground"
            )}
          >
            {slim === false ? placeholder : <Globe className="size-5 opacity-70" />}
          </span>
        )}
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent
        collisionPadding={10}
        side="bottom"
        align="start"
        className={cn(
          "z-50 min-w-[--radix-popper-anchor-width] gap-0 overflow-hidden p-0",
          "rounded-2xl border-0 bg-popover/70 text-popover-foreground shadow-2xl ring-1 ring-foreground/5",
          "relative before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-[inherit] before:backdrop-blur-2xl before:backdrop-saturate-150"
        )}
      >
        <Command
          className={cn(
            "max-h-[min(280px,var(--radix-popover-content-available-height))] w-full rounded-2xl bg-transparent p-1"
          )}
        >
          <CommandList className="max-h-[min(240px,var(--radix-popover-content-available-height))]">
            <div className="sticky top-0 z-10 rounded-xl bg-popover/90 px-0 pt-0 pb-1 backdrop-blur-sm">
              <CommandInput placeholder={searchPlaceholder} />
            </div>
            <CommandEmpty className="text-muted-foreground">{emptyText}</CommandEmpty>
            <CommandGroup className="p-0">
              {options
                .filter((x) => x.name)
                .map((option) => (
                  <CommandItem
                    key={option.alpha3}
                    value={`${option.name} ${option.alpha2} ${option.alpha3}`}
                    className="cursor-pointer rounded-xl px-3 py-2"
                    data-checked={
                      selectedCountry != null && option.alpha3 === selectedCountry.alpha3
                        ? true
                        : undefined
                    }
                    onSelect={() => handleSelect(option)}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                      <div className="inline-flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full">
                        <CircleFlag
                          countryCode={option.alpha2.toLowerCase()}
                          height={20}
                        />
                      </div>
                      <span className="truncate font-medium tabular-nums tracking-wide">
                        {option.alpha2.toUpperCase()}
                      </span>
                    </div>
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

CountryDropdownComponent.displayName = "CountryDropdownComponent";

export const CountryDropdown = forwardRef(CountryDropdownComponent);
