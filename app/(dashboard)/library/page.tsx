"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Download, MoreHorizontal, Trash2, Search, ImageIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

const MOCK_LIBRARY = [
  {
    id: 1,
    prompt: "A cute red fox sitting on a wooden log, stylized 3D rendered",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80",
    quality: "4K",
    position: "Isometric",
    date: "1 hour ago",
  },
  {
    id: 2,
    prompt: "Futuristic neon gaming controller pad, vibrant glowing elements",
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80",
    quality: "2K",
    position: "Top Down",
    date: "3 hours ago",
  },
  {
    id: 3,
    prompt: "Minimalist coffee cup with steam, clay render style",
    image: "https://images.unsplash.com/photo-1572111504938-27b9c9c8fa07?w=800&q=80",
    quality: "2K",
    position: "Front Facing",
    date: "Yesterday",
  },
  {
    id: 4,
    prompt: "Golden shield with intricate details and glowing sapphire",
    image: "https://images.unsplash.com/photo-1582216514547-19aa82a93ad5?w=800&q=80",
    quality: "4K",
    position: "Three Quarter",
    date: "2 days ago",
  },
];

export default function LibraryPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLibrary = MOCK_LIBRARY.filter((item) =>
    item.prompt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="flex flex-col h-full max-w-7xl mx-auto px-6 py-8 gap-8">
        {/* ── Header Section ─────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-heading font-bold tracking-tight">Library</h1>
            <p className="text-muted-foreground text-sm">
              Your collection of generated 3D icons.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Search prompt..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full md:w-64 pl-9 pr-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all placeholder:text-muted-foreground/50"
              />
            </div>
            <Button asChild size="icon" className="h-10 w-10 rounded-xl shadow-lg shadow-primary/20">
              <Link href="/">
                <Plus className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>

        {/* ── Grid Section ───────────────────────────────────── */}
        <AnimatePresence mode="popLayout">
          {filteredLibrary.length > 0 ? (
            <motion.div 
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {filteredLibrary.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="group relative flex flex-col"
                >
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted/30 border border-border/40 group-hover:border-primary/20 group-hover:shadow-2xl group-hover:shadow-primary/5 transition-all duration-300">
                    <Image
                      src={item.image}
                      alt={item.prompt}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />

                    {/* Metadata Overlay */}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                      <Badge 
                        variant="secondary" 
                        className="bg-background/80 backdrop-blur-xl border-none text-[10px] h-5 px-2 shadow-sm"
                      >
                        {item.quality}
                      </Badge>
                      <Badge 
                        variant="secondary" 
                        className="bg-background/80 backdrop-blur-xl border-none text-[10px] h-5 px-2 shadow-sm"
                      >
                        {item.position}
                      </Badge>
                    </div>

                    {/* Quick Actions Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[10px] text-white/90 font-medium">
                          {item.date}
                        </span>
                        <div className="flex gap-2">
                          <Button 
                            variant="secondary" 
                            size="icon" 
                            className="h-8 w-8 rounded-lg bg-background/90 backdrop-blur-md hover:bg-white text-foreground shadow-lg"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="secondary" 
                                size="icon" 
                                className="h-8 w-8 rounded-lg bg-background/90 backdrop-blur-md hover:bg-white text-foreground shadow-lg"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl border-border/50">
                              <DropdownMenuItem className="gap-2 text-sm">
                                <Download className="h-4 w-4" /> Download
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive focus:text-destructive gap-2 text-sm">
                                <Trash2 className="h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 px-1">
                    <p className="text-sm font-medium text-foreground/80 line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                      {item.prompt}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-32 rounded-3xl border border-dashed border-border/60 bg-muted/10"
            >
              <div className="w-16 h-16 rounded-2xl bg-muted/40 flex items-center justify-center mb-4">
                <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-foreground/70">
                {searchQuery ? "No matches found" : "Your library is empty"}
              </h3>
              <p className="text-muted-foreground text-sm mb-8 max-w-[250px] text-center">
                {searchQuery 
                  ? "Try searching for a different keyword or prompt." 
                  : "Start generating unique 3D icons in the studio to see them here."}
              </p>
              {!searchQuery && (
                <Button asChild className="rounded-xl shadow-lg shadow-primary/20">
                  <Link href="/">Back to Studio</Link>
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
