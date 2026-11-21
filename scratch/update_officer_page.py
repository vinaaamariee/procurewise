path = 'client/src/pages/OfficerPrVerificationPage.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read().replace('\r\n', '\n')

old_state = '  const [selectedVerificationItem, setSelectedVerificationItem] = useState<any | null>(null);'
new_state = '''  const [selectedVerificationItem, setSelectedVerificationItem] = useState<any | null>(null);
  const [canvassModalPr, setCanvassModalPr] = useState<{ id: number; prNumber: string; purpose: string; totalEstimate: string; officeId?: number; status: string } | null>(null);'''

if old_state in c and 'canvassModalPr' not in c:
    c = c.replace(old_state, new_state)
    print("SUCCESS: state added")

modal_render = '''      {/* Integrated Pre-Canvass / Supplier Quoting Modal */}
      {canvassModalPr && (
        <IntegratedPreCanvassModal
          open={Boolean(canvassModalPr)}
          onOpenChange={(open) => {
            if (!open) setCanvassModalPr(null);
          }}
          purchaseRequest={canvassModalPr}
          onCompleted={() => {
            void utils.procurement.officerPrVerifications.invalidate();
            void utils.procurement.dashboard.invalidate();
          }}
        />
      )}
    </div>
  );
}'''

old_end = '''    </div>
  );
}'''

if old_end in c:
    idx = c.rfind(old_end)
    if idx != -1:
        c = c[:idx] + modal_render
        print("SUCCESS: Modal rendered at end of OfficerPrVerificationPage")

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
