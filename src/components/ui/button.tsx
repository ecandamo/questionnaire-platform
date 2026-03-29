"use client"

import * as React from "react"
import {
  Button as MD3Button,
  buttonVariants,
  type ButtonProps as MD3ButtonProps,
} from "./material-design-3-button"

type LegacyVariant =
  | "default"
  | "outline"
  | "secondary"
  | "ghost"
  | "link"
  | "destructive"

const VARIANT_MAP: Record<LegacyVariant, MD3ButtonProps["variant"]> = {
  default: "filled",
  outline: "outlined",
  secondary: "tonal",
  ghost: "text",
  link: "text",
  destructive: "destructive",
}

export interface ButtonProps extends Omit<MD3ButtonProps, "variant"> {
  variant?: LegacyVariant | MD3ButtonProps["variant"]
}

function Button({ variant = "default", ...props }: ButtonProps) {
  const md3Variant =
    VARIANT_MAP[variant as LegacyVariant] ??
    (variant as MD3ButtonProps["variant"])
  return <MD3Button variant={md3Variant} {...props} />
}

export { Button, buttonVariants }
