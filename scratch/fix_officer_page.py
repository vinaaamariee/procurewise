path = 'client/src/pages/OfficerPrVerificationPage.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read().replace('\r\n', '\n')

c = c.replace('  FileText,\n', '  FileText,\n  FileSearch,\n')
c = c.replace('void utils.procurement.officerPrVerifications.invalidate();', 'void utils.procurement.officer.prVerification.list.invalidate();')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print("SUCCESS: OfficerPrVerificationPage fixed")
