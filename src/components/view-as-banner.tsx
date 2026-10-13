import { getViewAs } from "@/lib/auth";
import { stopViewAsAction } from "@/actions/view-as";

export async function ViewAsBanner() {
  const viewing = await getViewAs();
  if (!viewing) return null;

  return (
    <div className="print:hidden sticky top-0 z-50 bg-[#7a3a22] text-[#f7ecdc]">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-2 text-sm">
        <p>
          Viewing as <strong>{viewing.target.name}</strong> ({viewing.target.email}). This
          is what they see.
        </p>
        <form action={stopViewAsAction}>
          <button type="submit" className="underline underline-offset-2">
            Back to my account
          </button>
        </form>
      </div>
    </div>
  );
}
