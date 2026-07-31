import { PageHeader } from "@/components/platform/page-header"
import { PageRefreshButton } from "@/components/platform/page-refresh-button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { getRoadmap, type RoadmapItem } from "@/lib/platform/queries"
import { cn } from "@/lib/utils"

function Column({
  title,
  accent,
  items,
}: {
  title: string
  accent: string
  items: RoadmapItem[]
}) {
  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn("size-2.5 rounded-full", accent)} />
          <h2 className="font-semibold">{title}</h2>
        </div>
        <span className="text-muted-foreground text-sm tabular-nums">{items.length}</span>
      </header>
      <div className="flex flex-col gap-3">
        {items.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            Nothing here yet
          </p>
        ) : (
          items.map((item) => (
            <Card key={item.title}>
              <CardContent>
                {item.tag ? (
                  <Badge variant="secondary" className="mb-2">
                    {item.tag}
                  </Badge>
                ) : null}
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-muted-foreground mt-1 text-sm">{item.description}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </section>
  )
}

export default async function RoadmapPage() {
  const roadmap = await getRoadmap()

  return (
    <div>
      <PageHeader
        title="Roadmap"
        description="TMS Dev Platform features — ideas, work in progress, and what has shipped"
        actions={
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">
              {roadmap.ideas.length} Ideas · {roadmap.inProgress.length} In Progress ·{" "}
              {roadmap.shipped.length} Shipped
            </span>
            <PageRefreshButton />
          </div>
        }
      />
      <div className="grid gap-5 md:grid-cols-3">
        <Column title="Ideas" accent="bg-slate-400" items={roadmap.ideas} />
        <Column title="In Progress" accent="bg-primary" items={roadmap.inProgress} />
        <Column title="Shipped" accent="bg-emerald-500" items={roadmap.shipped} />
      </div>
    </div>
  )
}
