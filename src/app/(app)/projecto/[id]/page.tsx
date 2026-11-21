import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { getProject } from "@/lib/services/projects";
import { ProjectWorkspace, type Clip, type Job, type Moment, type Project } from "@/components/project-workspace";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export default async function ProjectPage({ params }: Ctx) {
  const user = await requireUser();
  const { id } = await params;
  const project = getProject(user.id, id);
  if (!project) notFound();
  const moments = all<Moment>(
    "SELECT id,start_sec,end_sec,title,description,reason,score,category FROM moments WHERE project_id=? ORDER BY score DESC", id);
  const clips = all<Clip>(
    "SELECT * FROM clips WHERE project_id=? AND user_id=? ORDER BY start_sec ASC", id, user.id);
  const jobs = all("SELECT id,type,status,progress,stage,error,payload_json,created_at FROM jobs WHERE project_id=? AND user_id=? ORDER BY created_at DESC", id, user.id)
    .map((j) => {
      let payload: Record<string, unknown> = {};
      try { payload = JSON.parse(String(j.payload_json || "{}")); } catch { /* ignorar */ }
      const { payload_json, ...rest } = j;
      return { ...rest, payload };
    });
  return <ProjectWorkspace initial={{ project: project as Project, moments, clips, jobs: jobs as Job[] }} />;
}
