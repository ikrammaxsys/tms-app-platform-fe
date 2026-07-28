"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  AppWindow,
  Boxes,
  LayoutDashboard,
  Map,
  Server,
  History,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const NAV_ITEMS = [
  { title: "Overview", href: "/", icon: LayoutDashboard },
  { title: "Applications", href: "/applications", icon: AppWindow },
  { title: "Application Groups", href: "/application-groups", icon: Boxes },
  { title: "Servers", href: "/servers", icon: Server },
  { title: "Deployments", href: "/deployments", icon: History },
  { title: "Roadmap", href: "/roadmap", icon: Map },
]

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(href + "/")
}

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader>
        <Link
          href="/"
          className="flex items-center px-2 py-1.5 group-data-[collapsible=icon]:justify-center"
        >
          <Image
            src="/img/toray-logo1.png"
            alt="Toray"
            width={120}
            height={32}
            className="h-8 w-auto object-contain group-data-[collapsible=icon]:h-6 m-auto"
            priority
          />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive(pathname, item.href)}
                    tooltip={item.title}
                    render={<Link href={item.href} />}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
