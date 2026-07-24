import Link from "next/link";
import { redirect } from "next/navigation";

import { CreateGroupForm } from "@/components/create-group-form";
import { auth } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { getGroupsForTeacher } from "@/lib/groups";

export default async function TeacherIndexPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const groups = await getGroupsForTeacher(session.user.id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-display font-semibold tracking-tight">Teacher</h1>
        <p className="mt-1 text-body text-foreground-muted">
          Create a classroom, share its join code with students, and track their progress from a single roster.
        </p>
      </div>

      {groups.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-title font-semibold">Your classrooms</h2>
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-background-elevated">
            {groups.map((group) => (
              <li key={group.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <Link href={`/teacher/${group.id}`} className="text-body font-medium text-foreground hover:text-accent hover:underline">
                    {group.name}
                  </Link>
                  <p className="text-caption text-foreground-muted">
                    Join code <span className="font-financial">{group.joinCode}</span> · Starting cash{" "}
                    {formatCurrency(group.startingCash.toString())}
                  </p>
                </div>
                <Link
                  href={`/teacher/${group.id}`}
                  className="shrink-0 rounded-md border border-border px-3 py-1.5 text-caption font-medium text-foreground-muted transition-colors hover:border-border-strong hover:text-foreground"
                >
                  View roster →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-title font-semibold">{groups.length > 0 ? "Create another classroom" : "Get started"}</h2>
        <CreateGroupForm />
      </section>
    </div>
  );
}
