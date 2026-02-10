"use client";

import type * as React from "react";

import { cn } from "@/shared/helpers";

/** Shared Shadcn table class names for use in DataGrid and other table-like UIs */
export const tableHeaderRowClass =
    "[&_tr]:border-b";
export const tableHeadCellClass =
    "h-12 whitespace-nowrap px-4 py-2 text-left align-middle font-medium text-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]";
export const tableRowClass =
    "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted";
export const tableCellClass =
    "whitespace-nowrap p-3 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]";
export const tableFooterClass =
    "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0";

function Table({ className, ...props }: React.ComponentProps<"table">) {
    return (
        <div
            data-slot="table-container"
            className={cn("relative w-full overflow-x-auto", className)}
        >
            <table
                data-slot="table"
                className="w-full caption-bottom text-sm table-fixed"
                style={{ tableLayout: 'fixed' }}
                {...props}
            />
        </div>
    );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
    return (
        <thead
            data-slot="table-header"
            className={cn(tableHeaderRowClass, className)}
            {...props}
        />
    );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
    return (
        <tbody
            data-slot="table-body"
            className={cn("[&_tr:last-child]:border-0", className)}
            {...props}
        />
    );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
    return (
        <tfoot
            data-slot="table-footer"
            className={cn(tableFooterClass, className)}
            {...props}
        />
    );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
    return (
        <tr
            data-slot="table-row"
            className={cn(tableRowClass, className)}
            {...props}
        />
    );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
    return (
        <th
            data-slot="table-head"
            className={cn(tableHeadCellClass, className)}
            {...props}
        />
    );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
    return (
        <td
            data-slot="table-cell"
            className={cn(tableCellClass, className)}
            {...props}
        />
    );
}

function TableCaption({
    className,
    ...props
}: React.ComponentProps<"caption">) {
    return (
        <caption
            data-slot="table-caption"
            className={cn("mt-4 text-muted-foreground text-sm", className)}
            {...props}
        />
    );
}

export {
    Table,
    TableHeader,
    TableBody,
    TableFooter,
    TableHead,
    TableRow,
    TableCell,
    TableCaption,
};
