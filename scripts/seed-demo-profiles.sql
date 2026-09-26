-- ProcureWise Reset & Seed Migration

    -- Purge dependent records first
    DELETE FROM procurewise.pmr_logs;
    DELETE FROM procurewise.delivery_receipts;
    DELETE FROM procurewise.purchase_orders;
    DELETE FROM procurewise.quotation_abstracts;
    DELETE FROM procurewise.supplier_quotations;
    DELETE FROM procurewise.rfqs;
    DELETE FROM procurewise.rfq_number_assignments;
    DELETE FROM procurewise.abstracts_of_canvass;
    DELETE FROM procurewise.mcdm_recommendations;
    DELETE FROM procurewise.pre_canvass_quotes;
    DELETE FROM procurewise.pre_canvasses;
    DELETE FROM procurewise.purchase_request_decisions;
    DELETE FROM procurewise.purchase_request_items;
    DELETE FROM procurewise.letters_of_notice;
    DELETE FROM procurewise.bac_transmittals;
    DELETE FROM procurewise.test_record_archives;

    -- Delete documents and notifications attached to transactional entities
    DELETE FROM procurewise.procurement_documents 
      WHERE "entityType" IN ('purchase_request', 'pre_canvass', 'rfq', 'purchase_order', 'delivery_receipt');
    DELETE FROM procurewise.workflow_corrections 
      WHERE "entityType" IN ('purchase_request', 'pre_canvass', 'rfq', 'purchase_order');
    DELETE FROM procurewise.workflow_notifications 
      WHERE "entityType" IN ('purchase_request', 'pre_canvass', 'rfq', 'purchase_order');

    -- Wipe Purchase Requests created this month (September 2026) and mock submissions
    DELETE FROM procurewise.purchase_requests 
      WHERE "createdAt" >= '2026-09-01' OR "prNumber" ILIKE '%test%' OR "purpose" ILIKE '%test%';

    -- Reset committed amounts on budget allotments so test allocations don't linger
    UPDATE procurewise.budget_allotments SET "committedAmount" = '0.00';
  


    -- Upsert standardized demo profiles into procurewise.users
    INSERT INTO procurewise.users ("openId", name, email, "officeName", "loginMethod", role, "updatedAt")
    VALUES
      ('ffd07cb7-8df7-45a2-90df-e1e394564488', 'Officer Demo', 'officer.demo@bsc.edu.ph', 'Procurement Management Unit', 'supabase', 'procurement_officer', NOW()),
  ('9e253045-eec8-426d-8348-f71e84f16028', 'Staff Demo', 'staff.demo@bsc.edu.ph', 'Procurement Management Unit', 'supabase', 'procurement_staff', NOW()),
  ('40750606-c882-4a08-8295-df466082b770', 'BAC Demo', 'bac.demo@bsc.edu.ph', 'Bids and Awards Committee', 'supabase', 'bac', NOW()),
  ('c6903f73-f490-4fc5-8dc8-259361304f5e', 'HoPE Demo', 'hope.demo@bsc.edu.ph', 'Office of the President', 'supabase', 'hope', NOW()),
  ('2d71dbbd-4e81-4ebc-b82a-5758e32a1028', 'Budget Demo', 'budget.demo@bsc.edu.ph', 'Budget and Finance Office', 'supabase', 'budget_officer', NOW()),
  ('653ef6a3-20c3-4cfb-8285-7430330f17c8', 'End-User Demo', 'enduser.demo@bsc.edu.ph', 'Requesting Unit', 'supabase', 'end_user', NOW())
    ON CONFLICT ("openId") DO UPDATE
      SET name = excluded.name, 
          email = excluded.email, 
          "officeName" = excluded."officeName", 
          role = excluded.role, 
          "updatedAt" = NOW();
  
