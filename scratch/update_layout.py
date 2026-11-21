path = 'client/src/components/DashboardLayout.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read().replace('\r\n', '\n')

old_nav = '''  {
    id: "pre-canvass",
    path: "/rfq",
    label: "Collect Supplier Quotes",
    stepNumber: "Pre-Canvass",
    icon: FileSearch,
    section: "workspace",
    roles: ["end_user"],
  },'''

new_nav = '''  {
    id: "pre-canvass",
    path: "/rfq",
    label: "Collect Supplier Quotes",
    stepNumber: "Pre-Canvass",
    icon: FileSearch,
    section: "workspace",
    roles: [
      "procurement_officer",
      "procurement_officer_i",
      "procurement_officer_ii",
      "procurement_staff",
      "admin",
    ],
  },'''

if old_nav in c:
    c = c.replace(old_nav, new_nav)
    print('SUCCESS: nav updated')
else:
    print('ERROR: old_nav not found')

old_staff = '        "/pmr-registry",\n        "/rfq-management",'
new_staff = '        "/pmr-registry",\n        "/rfq",\n        "/rfq-management",'
if old_staff in c:
    c = c.replace(old_staff, new_staff)
    print('SUCCESS: staff paths updated')
else:
    print('ERROR: old_staff not found')

old_officer = '        "/officer/pr-verification",\n        "/officer/rfq-distribution",'
new_officer = '        "/officer/pr-verification",\n        "/rfq",\n        "/officer/rfq-distribution",'
if old_officer in c:
    c = c.replace(old_officer, new_officer)
    print('SUCCESS: officer paths updated')
else:
    print('ERROR: old_officer not found')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
