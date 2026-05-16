import * as React from "react"

import { cn } from "@/lib/utils"

const Table = React.forwardRef(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props} />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef(({ className, ...props }, ref) => {
  const defaultStyle = {
    borderColor: 'var(--line)',
  };
  return (
  <thead ref={ref} style={defaultStyle} className={cn("[&_tr]:border-b", className)} {...props} />
);})
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props} />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef(({ className, ...props }, ref) => {
  const defaultStyle = {
    backgroundColor: 'var(--panel)',
    borderColor: 'var(--line)',
    color: 'var(--text)',
  };
  return (
  <tfoot
    ref={ref}
    style={defaultStyle}
    className={cn("border-t font-medium [&>tr]:last:border-b-0", className)}
    {...props} />
);})
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef(({ className, ...props }, ref) => {
  const defaultStyle = {
    borderColor: 'var(--line)',
  };
  return (
  <tr
    ref={ref}
    style={defaultStyle}
    className={cn(
      "border-b transition-colors hover:opacity-80 data-[state=selected]:opacity-80",
      className
    )}
    {...props} />
);})
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef(({ className, ...props }, ref) => {
  const defaultStyle = {
    color: 'var(--muted)',
  };
  return (
  <th
    ref={ref}
    style={defaultStyle}
    className={cn(
      "h-10 px-2 text-left align-middle font-medium [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className
    )}
    {...props} />
);})
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef(({ className, ...props }, ref) => {
  const defaultStyle = {
    color: 'var(--text)',
  };
  return (
  <td
    ref={ref}
    style={defaultStyle}
    className={cn(
      "p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className
    )}
    {...props} />
);})
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef(({ className, ...props }, ref) => {
  const defaultStyle = {
    color: 'var(--muted)',
  };
  return (
  <caption
    ref={ref}
    style={defaultStyle}
    className={cn("mt-4 text-sm", className)}
    {...props} />
);})
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}