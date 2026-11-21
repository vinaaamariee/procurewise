path = 'client/src/pages/WorkflowPages.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read().replace('\r\n', '\n')

old_check = '''  if (role !== "end_user") {
    return (
      <div className="mx-auto max-w-[1240px] px-4 py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fbeae9] text-[#7b1e1e]">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-[#1f2933]">Access Restricted to End-User Requisitioners</h2>
        <p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-[#52606d]">
          The Pre-Canvass module is strictly reserved for End-User requisition preparation and preliminary quote compilation. Administrative, Procurement Office, and Approver roles manage quotation abstracts and purchase orders from their designated views.
        </p>
        <div className="mt-6">
          <Button asChild className="bg-[#7b1e1e] text-xs text-white hover:bg-[#641818]">
            <Link href="/dashboard">Return to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isEndUser = true;
  const isProcurement = false;'''

new_check = '''  const isOfficerOrAdmin = ["procurement_officer", "procurement_officer_i", "procurement_officer_ii", "procurement_staff", "admin"].includes(role);
  if (!isOfficerOrAdmin && role !== "end_user") {
    return (
      <div className="mx-auto max-w-[1240px] px-4 py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fbeae9] text-[#7b1e1e]">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-[#1f2933]">Access Restricted</h2>
        <p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-[#52606d]">
          The Pre-Canvass module is reserved for Procurement Officers and Requisitioners to collect and record supplier quotations.
        </p>
        <div className="mt-6">
          <Button asChild className="bg-[#7b1e1e] text-xs text-white hover:bg-[#641818]">
            <Link href="/dashboard">Return to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isEndUser = role === "end_user";
  const isProcurement = isOfficerOrAdmin;'''

if old_check in c:
    c = c.replace(old_check, new_check)
    print("SUCCESS: WorkflowPages updated")
else:
    print("ERROR: old_check not found in WorkflowPages.tsx")

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
