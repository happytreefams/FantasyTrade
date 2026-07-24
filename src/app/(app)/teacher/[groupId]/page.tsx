import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CreateChallengeForm } from "@/components/create-challenge-form";
import { formatCurrency, formatPercent } from "@/lib/format";
import { GroupAccessError, getGroupRoster, requireGroupTeacher } from "@/lib/groups";

export default async function TeacherGroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;

  let group;
  try {
    ({ group } = await requireGroupTeacher(groupId));
  } catch (error) {
    if (error instanceof GroupAccessError) {
      if (error.message === "Not authenticated.") redirect("/login");
      notFound();
    }
    throw error;
  }

  const roster = await getGroupRoster(groupId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/teacher" className="text-caption text-foreground-muted hover:text-foreground">
          ← Teacher
        </Link>
        <h1 className="mt-1 text-display font-semibold tracking-tight">{group.name}</h1>
        <p className="mt-1 text-body text-foreground-muted">
          Join code <span className="font-financial font-semibold">{group.joinCode}</span> · Starting cash{" "}
          {formatCurrency(group.startingCash.toString())} · {roster.length} student{roster.length === 1 ? "" : "s"}
        </p>
      </div>

      {roster.length === 0 ? (
        <p className="text-body text-foreground-muted">
          No students yet — share the join code above. Students can enter it during signup or from Settings.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-background-elevated">
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-border text-left text-caption text-foreground-muted">
                <th className="px-4 py-2">Student</th>
                <th className="px-4 py-2">Portfolio value</th>
                <th className="px-4 py-2">Return since joining</th>
                <th className="px-4 py-2">Learning progress</th>
              </tr>
            </thead>
            <tbody>
              {roster
                .sort((a, b) => b.returnPercent - a.returnPercent)
                .map((student) => {
                  const isGain = student.returnPercent >= 0;
                  return (
                    <tr key={student.userId} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{student.name ?? "—"}</p>
                        <p className="text-caption text-foreground-muted">{student.email}</p>
                      </td>
                      <td className="px-4 py-3 font-financial">{formatCurrency(student.portfolioValue)}</td>
                      <td className={`px-4 py-3 font-financial ${isGain ? "text-positive" : "text-negative"}`}>
                        {formatPercent(student.returnPercent)}
                      </td>
                      <td className="px-4 py-3 text-caption text-foreground-muted">
                        {student.completedLessons}/{student.totalLessons} lessons
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-title font-semibold">Classroom challenges</h2>
        <CreateChallengeForm groupId={group.id} />
      </section>
    </div>
  );
}
