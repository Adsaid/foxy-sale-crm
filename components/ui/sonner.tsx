"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme()
  /** Немає ThemeProvider → лише light; інакше Sonner «dark» при темній ОС ламає контраст на світлому popover. */
  const toastTheme: ToasterProps["theme"] =
    resolvedTheme === "dark" ? "dark" : "light"

  return (
    <Sonner
      theme={toastTheme}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "cn-toast !border-border !bg-popover !text-popover-foreground shadow-md",
          title: "!text-popover-foreground",
          description: "!text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
