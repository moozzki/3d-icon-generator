"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Download, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const MOCK_GALLERY = [
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

export default function GalleryPage() {
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold mb-2">My Gallery</h1>
            <p className="text-muted-foreground">View all your previously generated 3D icons.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {MOCK_GALLERY.map((item) => (
            <Card key={item.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col">
              <div className="relative aspect-square bg-secondary/10 overflow-hidden">
                <img 
                  src={item.image} 
                  alt={item.prompt} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                
                <div className="absolute top-3 left-3 flex gap-2">
                  <Badge variant="secondary" className="bg-background/80 backdrop-blur-md hover:bg-background/90 text-xs">
                    {item.quality}
                  </Badge>
                  <Badge variant="secondary" className="bg-background/80 backdrop-blur-md hover:bg-background/90 text-xs shadow-sm">
                    {item.position}
                  </Badge>
                </div>

                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="icon" className="h-8 w-8 bg-background/80 backdrop-blur-md hover:bg-background/90">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="gap-2">
                        <Download className="h-4 w-4" /> Download
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive gap-2">
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              <CardContent className="p-4 flex-1 flex flex-col justify-between">
                <p className="text-sm font-medium line-clamp-2 leading-relaxed mb-3">
                  {item.prompt}
                </p>
                <div className="text-xs text-muted-foreground font-medium">
                  {item.date}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {MOCK_GALLERY.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 bg-muted/30 rounded-2xl border border-dashed border-border/60">
            <h3 className="font-heading text-xl font-semibold mb-2">No icons yet</h3>
            <p className="text-muted-foreground mb-6">Start generating your first 3D icon in the studio.</p>
            <Button asChild>
              <a href="/">Go to Studio</a>
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
