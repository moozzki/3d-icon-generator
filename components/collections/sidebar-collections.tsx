"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Folder, FolderPlus, Folders, MoreVertical, Pencil, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateCollectionDialog } from "./create-collection-dialog";
import { RenameCollectionDialog } from "./rename-collection-dialog";
import { DeleteCollectionDialog } from "./delete-collection-dialog";

interface Collection {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface SidebarCollectionsProps {
  isCollapsed?: boolean;
  isMobile?: boolean;
  onItemClick?: () => void;
}

export function SidebarCollections({
  isCollapsed = false,
  isMobile = false,
  onItemClick,
}: SidebarCollectionsProps) {
  const pathname = usePathname();
  const [createOpen, setCreateOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Collection | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Collection | null>(null);

  const { data: collectionsData, isLoading } = useQuery<{ collections: Collection[] }>({
    queryKey: ["collections"],
    queryFn: async () => {
      const res = await fetch("/api/collections");
      if (!res.ok) throw new Error("Failed to fetch collections");
      return res.json();
    },
  });

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const collections = collectionsData?.collections || [];

  const filteredCollections = collections.filter((col) =>
    col.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCollection = collections.find(
    (col) => pathname === `/collections/${col.id}`
  );

  if (isCollapsed) {
    return (
      <>
        <div className="px-1.5 py-2 border-t border-border/40 space-y-1">
          {/* 1. New Collection Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setCreateOpen(true)}
                className="flex items-center justify-center w-full rounded-lg py-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <FolderPlus className="h-4 w-4 shrink-0" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              New Collection
            </TooltipContent>
          </Tooltip>

          {/* 2. All Collections Popover Trigger */}
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "relative flex items-center justify-center w-full rounded-lg py-2.5 transition-colors",
                      popoverOpen || (activeCollection && pathname?.startsWith("/collections"))
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Folders className="h-4 w-4 shrink-0" />
                    {collections.length > 0 && (
                      <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                        {collections.length > 99 ? "99+" : collections.length}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              {!popoverOpen && (
                <TooltipContent side="right" sideOffset={8}>
                  Collections ({collections.length})
                </TooltipContent>
              )}
            </Tooltip>

            <PopoverContent
              side="right"
              sideOffset={12}
              align="start"
              className="w-72 p-3 border-border/50 bg-card/95 backdrop-blur-md rounded-2xl shadow-xl space-y-3"
            >
              {/* Popover Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Folders className="h-4 w-4 text-primary" />
                  <span className="font-heading text-sm font-semibold">
                    Collections
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted font-medium text-muted-foreground">
                    {collections.length}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setPopoverOpen(false);
                    setCreateOpen(true);
                  }}
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                  title="New Collection"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Search Bar (if collections >= 4) */}
              {collections.length >= 4 && (
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search collections..."
                    className="w-full bg-muted/40 text-xs rounded-lg pl-8 pr-3 py-1.5 outline-none border border-transparent focus:border-primary/40 focus:bg-background transition-all placeholder:text-muted-foreground/50"
                  />
                </div>
              )}

              {/* Collections List */}
              <div className="space-y-0.5 max-h-60 overflow-y-auto pr-1">
                {isLoading && (
                  <div className="space-y-1.5 py-1">
                    <div className="h-8 w-full rounded-lg bg-muted/40 animate-pulse" />
                    <div className="h-8 w-3/4 rounded-lg bg-muted/40 animate-pulse" />
                  </div>
                )}

                {!isLoading && collections.length === 0 && (
                  <div className="py-6 text-center space-y-2">
                    <Folders className="h-8 w-8 mx-auto text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground">No collections created yet.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPopoverOpen(false);
                        setCreateOpen(true);
                      }}
                      className="text-xs h-7 rounded-lg gap-1"
                    >
                      <FolderPlus className="h-3.5 w-3.5" />
                      Create Collection
                    </Button>
                  </div>
                )}

                {!isLoading && collections.length > 0 && filteredCollections.length === 0 && (
                  <p className="text-xs text-muted-foreground/60 text-center py-4 italic">
                    No matching collections
                  </p>
                )}

                {filteredCollections.map((col) => {
                  const isActive = pathname === `/collections/${col.id}`;
                  return (
                    <div
                      key={col.id}
                      className={cn(
                        "group/popitem flex items-center justify-between rounded-xl text-xs font-medium transition-all duration-150 p-1",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      )}
                    >
                      <Link
                        href={`/collections/${col.id}`}
                        onClick={() => {
                          setPopoverOpen(false);
                          if (onItemClick) onItemClick();
                        }}
                        className="flex items-center gap-2.5 px-2 py-1.5 flex-1 min-w-0 truncate"
                      >
                        <Folder
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            isActive ? "text-primary fill-primary/20" : "text-muted-foreground/70"
                          )}
                        />
                        <span className="truncate">{col.name}</span>
                      </Link>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-md opacity-0 group-hover/popitem:opacity-100 transition-opacity text-muted-foreground hover:text-foreground hover:bg-muted"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36 p-1 border-border/50 rounded-xl">
                          <DropdownMenuItem
                            onClick={() => {
                              setPopoverOpen(false);
                              setRenameTarget(col);
                            }}
                            className="text-xs gap-2 cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setPopoverOpen(false);
                              setDeleteTarget(col);
                            }}
                            className="text-xs gap-2 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

          {/* 3. Active Collection Quick Shortcut */}
          {activeCollection && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href={`/collections/${activeCollection.id}`}
                  onClick={onItemClick}
                  className="flex items-center justify-center w-full rounded-lg py-2.5 bg-primary/10 text-primary transition-colors"
                >
                  <Folder className="h-4 w-4 shrink-0 fill-primary/20 text-primary" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Active: {activeCollection.name}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <CreateCollectionDialog open={createOpen} onOpenChange={setCreateOpen} />
        <RenameCollectionDialog
          open={!!renameTarget}
          onOpenChange={(open) => {
            if (!open) setRenameTarget(null);
          }}
          collection={renameTarget}
        />
        <DeleteCollectionDialog
          open={!!deleteTarget}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          collection={deleteTarget}
        />
      </>
    );
  }

  return (
    <>
      <div className="pt-4 pb-2 border-t border-border/40">
        {/* Section Header */}
        <div className="flex items-center justify-between px-3 mb-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            Collections
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCreateOpen(true)}
            className="h-5 w-5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60"
            title="Create collection"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Collections List */}
        <div className="space-y-0.5 px-3 max-h-48 overflow-y-auto pr-1">
          {isLoading && (
            <div className="space-y-1 py-1">
              <div className="h-7 w-full rounded-md bg-muted/40 animate-pulse" />
              <div className="h-7 w-3/4 rounded-md bg-muted/40 animate-pulse" />
            </div>
          )}

          {!isLoading && collections.length === 0 && (
            <p className="text-xs text-muted-foreground/60 px-2 py-2 italic text-center">
              No collections yet
            </p>
          )}

          {collections.map((col) => {
            const isActive = pathname === `/collections/${col.id}`;
            return (
              <div
                key={col.id}
                className={cn(
                  "group/item flex items-center justify-between rounded-lg text-sm font-medium transition-colors duration-150",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Link
                  href={`/collections/${col.id}`}
                  onClick={onItemClick}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 flex-1 min-w-0 truncate"
                >
                  <Folder
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive ? "text-primary fill-primary/20" : "text-muted-foreground/70"
                    )}
                  />
                  <span className="truncate text-xs">{col.name}</span>
                </Link>

                {/* Dropdown Menu for options */}
                <div className="opacity-0 group-hover/item:opacity-100 transition-opacity pr-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80"
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36 p-1 border-border/50 rounded-xl">
                      <DropdownMenuItem
                        onClick={() => setRenameTarget(col)}
                        className="text-xs gap-2 cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteTarget(col)}
                        className="text-xs gap-2 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dialogs */}
      <CreateCollectionDialog open={createOpen} onOpenChange={setCreateOpen} />
      <RenameCollectionDialog
        open={!!renameTarget}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
        collection={renameTarget}
      />
      <DeleteCollectionDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        collection={deleteTarget}
      />
    </>
  );
}
