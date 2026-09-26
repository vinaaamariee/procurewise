-- Foreign key constraints for Supabase PostgreSQL schema "procurewise"
-- This connects all related tables in the Supabase Schema Visualizer and ensures referential integrity in Postgres.

-- 1. Budget Allotments
DO $$ BEGIN
  ALTER TABLE "procurewise"."budget_allotments"
    ADD CONSTRAINT "fk_budget_allotments_office"
    FOREIGN KEY ("officeId") REFERENCES "procurewise"."offices"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."budget_allotments"
    ADD CONSTRAINT "fk_budget_allotments_object_of_expenditure"
    FOREIGN KEY ("objectOfExpenditureId") REFERENCES "procurewise"."objects_of_expenditure"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."budget_allotments"
    ADD CONSTRAINT "fk_budget_allotments_creator"
    FOREIGN KEY ("createdById") REFERENCES "procurewise"."users"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Suppliers & Supplier Tags
DO $$ BEGIN
  ALTER TABLE "procurewise"."suppliers"
    ADD CONSTRAINT "fk_suppliers_creator"
    FOREIGN KEY ("createdById") REFERENCES "procurewise"."users"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."supplier_tags"
    ADD CONSTRAINT "fk_supplier_tags_creator"
    FOREIGN KEY ("createdById") REFERENCES "procurewise"."users"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."supplier_tag_assignments"
    ADD CONSTRAINT "fk_supplier_tag_assignments_supplier"
    FOREIGN KEY ("supplierId") REFERENCES "procurewise"."suppliers"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."supplier_tag_assignments"
    ADD CONSTRAINT "fk_supplier_tag_assignments_tag"
    FOREIGN KEY ("supplierTagId") REFERENCES "procurewise"."supplier_tags"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."supplier_tag_assignments"
    ADD CONSTRAINT "fk_supplier_tag_assignments_assigner"
    FOREIGN KEY ("assignedById") REFERENCES "procurewise"."users"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Procurement Catalog User Favorites & Saved Items
DO $$ BEGIN
  ALTER TABLE "procurewise"."procurement_catalog_favorites"
    ADD CONSTRAINT "fk_catalog_favorites_user"
    FOREIGN KEY ("userId") REFERENCES "procurewise"."users"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."procurement_catalog_favorites"
    ADD CONSTRAINT "fk_catalog_favorites_item"
    FOREIGN KEY ("catalogItemId") REFERENCES "procurewise"."procurement_catalog_items"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."procurement_catalog_saved_items"
    ADD CONSTRAINT "fk_catalog_saved_items_user"
    FOREIGN KEY ("userId") REFERENCES "procurewise"."users"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."procurement_catalog_saved_items"
    ADD CONSTRAINT "fk_catalog_saved_items_item"
    FOREIGN KEY ("catalogItemId") REFERENCES "procurewise"."procurement_catalog_items"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. APP PPMP Entries
DO $$ BEGIN
  ALTER TABLE "procurewise"."app_ppmp_entries"
    ADD CONSTRAINT "fk_app_ppmp_entries_office"
    FOREIGN KEY ("officeId") REFERENCES "procurewise"."offices"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."app_ppmp_entries"
    ADD CONSTRAINT "fk_app_ppmp_entries_object_of_expenditure"
    FOREIGN KEY ("objectOfExpenditureId") REFERENCES "procurewise"."objects_of_expenditure"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."app_ppmp_entries"
    ADD CONSTRAINT "fk_app_ppmp_entries_catalog_item"
    FOREIGN KEY ("catalogItemId") REFERENCES "procurewise"."procurement_catalog_items"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."app_ppmp_entries"
    ADD CONSTRAINT "fk_app_ppmp_entries_preparer"
    FOREIGN KEY ("preparedById") REFERENCES "procurewise"."users"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5. Test Record Archives
DO $$ BEGIN
  ALTER TABLE "procurewise"."test_record_archives"
    ADD CONSTRAINT "fk_test_record_archives_ppmp_entry"
    FOREIGN KEY ("ppmpEntryId") REFERENCES "procurewise"."app_ppmp_entries"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."test_record_archives"
    ADD CONSTRAINT "fk_test_record_archives_archiver"
    FOREIGN KEY ("archivedById") REFERENCES "procurewise"."users"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. Purchase Requests
DO $$ BEGIN
  ALTER TABLE "procurewise"."purchase_requests"
    ADD CONSTRAINT "fk_purchase_requests_office"
    FOREIGN KEY ("officeId") REFERENCES "procurewise"."offices"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."purchase_requests"
    ADD CONSTRAINT "fk_purchase_requests_object_of_expenditure"
    FOREIGN KEY ("objectOfExpenditureId") REFERENCES "procurewise"."objects_of_expenditure"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."purchase_requests"
    ADD CONSTRAINT "fk_purchase_requests_requester"
    FOREIGN KEY ("requestedById") REFERENCES "procurewise"."users"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."purchase_requests"
    ADD CONSTRAINT "fk_purchase_requests_ppmp_entry"
    FOREIGN KEY ("ppmpEntryId") REFERENCES "procurewise"."app_ppmp_entries"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."purchase_requests"
    ADD CONSTRAINT "fk_purchase_requests_requested_signatory"
    FOREIGN KEY ("requestedSignatoryId") REFERENCES "procurewise"."procurement_signatories"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."purchase_requests"
    ADD CONSTRAINT "fk_purchase_requests_approved_signatory"
    FOREIGN KEY ("approvedSignatoryId") REFERENCES "procurewise"."procurement_signatories"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."purchase_requests"
    ADD CONSTRAINT "fk_purchase_requests_procurement_reviewer"
    FOREIGN KEY ("procurementReviewedById") REFERENCES "procurewise"."users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."purchase_requests"
    ADD CONSTRAINT "fk_purchase_requests_assigned_officer"
    FOREIGN KEY ("assignedOfficerId") REFERENCES "procurewise"."users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."purchase_requests"
    ADD CONSTRAINT "fk_purchase_requests_admin_approver"
    FOREIGN KEY ("administrativeApprovedById") REFERENCES "procurewise"."users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."purchase_requests"
    ADD CONSTRAINT "fk_purchase_requests_budget_reviewer"
    FOREIGN KEY ("budgetReviewedById") REFERENCES "procurewise"."users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."purchase_requests"
    ADD CONSTRAINT "fk_purchase_requests_supply_reviewer"
    FOREIGN KEY ("supplyReviewedById") REFERENCES "procurewise"."users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."purchase_requests"
    ADD CONSTRAINT "fk_purchase_requests_bac_reviewer"
    FOREIGN KEY ("bacReviewedById") REFERENCES "procurewise"."users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 7. Purchase Request Items
DO $$ BEGIN
  ALTER TABLE "procurewise"."purchase_request_items"
    ADD CONSTRAINT "fk_purchase_request_items_pr"
    FOREIGN KEY ("purchaseRequestId") REFERENCES "procurewise"."purchase_requests"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."purchase_request_items"
    ADD CONSTRAINT "fk_purchase_request_items_catalog_item"
    FOREIGN KEY ("catalogItemId") REFERENCES "procurewise"."procurement_catalog_items"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 8. Pre-Canvasses & Quotes
DO $$ BEGIN
  ALTER TABLE "procurewise"."pre_canvasses"
    ADD CONSTRAINT "fk_pre_canvasses_pr"
    FOREIGN KEY ("purchaseRequestId") REFERENCES "procurewise"."purchase_requests"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."pre_canvasses"
    ADD CONSTRAINT "fk_pre_canvasses_preparer"
    FOREIGN KEY ("preparedById") REFERENCES "procurewise"."users"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."pre_canvass_quotes"
    ADD CONSTRAINT "fk_pre_canvass_quotes_pre_canvass"
    FOREIGN KEY ("preCanvassId") REFERENCES "procurewise"."pre_canvasses"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."pre_canvass_quotes"
    ADD CONSTRAINT "fk_pre_canvass_quotes_supplier"
    FOREIGN KEY ("supplierId") REFERENCES "procurewise"."suppliers"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 9. Abstracts of Canvass
DO $$ BEGIN
  ALTER TABLE "procurewise"."abstracts_of_canvass"
    ADD CONSTRAINT "fk_abstracts_of_canvass_pre_canvass"
    FOREIGN KEY ("preCanvassId") REFERENCES "procurewise"."pre_canvasses"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."abstracts_of_canvass"
    ADD CONSTRAINT "fk_abstracts_of_canvass_recommended_supplier"
    FOREIGN KEY ("recommendedSupplierId") REFERENCES "procurewise"."suppliers"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."abstracts_of_canvass"
    ADD CONSTRAINT "fk_abstracts_of_canvass_preparer"
    FOREIGN KEY ("preparedById") REFERENCES "procurewise"."users"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."abstracts_of_canvass"
    ADD CONSTRAINT "fk_abstracts_of_canvass_decider"
    FOREIGN KEY ("decidedById") REFERENCES "procurewise"."users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 10. RFQs & Supplier Quotations
DO $$ BEGIN
  ALTER TABLE "procurewise"."rfqs"
    ADD CONSTRAINT "fk_rfqs_pr"
    FOREIGN KEY ("purchaseRequestId") REFERENCES "procurewise"."purchase_requests"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."rfqs"
    ADD CONSTRAINT "fk_rfqs_creator"
    FOREIGN KEY ("createdById") REFERENCES "procurewise"."users"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."supplier_quotations"
    ADD CONSTRAINT "fk_supplier_quotations_rfq"
    FOREIGN KEY ("rfqId") REFERENCES "procurewise"."rfqs"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."supplier_quotations"
    ADD CONSTRAINT "fk_supplier_quotations_supplier"
    FOREIGN KEY ("supplierId") REFERENCES "procurewise"."suppliers"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."quotation_abstracts"
    ADD CONSTRAINT "fk_quotation_abstracts_rfq"
    FOREIGN KEY ("rfqId") REFERENCES "procurewise"."rfqs"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."quotation_abstracts"
    ADD CONSTRAINT "fk_quotation_abstracts_recommended_supplier"
    FOREIGN KEY ("recommendedSupplierId") REFERENCES "procurewise"."suppliers"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."quotation_abstracts"
    ADD CONSTRAINT "fk_quotation_abstracts_preparer"
    FOREIGN KEY ("preparedById") REFERENCES "procurewise"."users"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."quotation_abstracts"
    ADD CONSTRAINT "fk_quotation_abstracts_approver"
    FOREIGN KEY ("approvedById") REFERENCES "procurewise"."users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 11. Purchase Orders
DO $$ BEGIN
  ALTER TABLE "procurewise"."purchase_orders"
    ADD CONSTRAINT "fk_purchase_orders_pr"
    FOREIGN KEY ("purchaseRequestId") REFERENCES "procurewise"."purchase_requests"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."purchase_orders"
    ADD CONSTRAINT "fk_purchase_orders_rfq"
    FOREIGN KEY ("rfqId") REFERENCES "procurewise"."rfqs"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."purchase_orders"
    ADD CONSTRAINT "fk_purchase_orders_pre_canvass"
    FOREIGN KEY ("preCanvassId") REFERENCES "procurewise"."pre_canvasses"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."purchase_orders"
    ADD CONSTRAINT "fk_purchase_orders_supplier"
    FOREIGN KEY ("supplierId") REFERENCES "procurewise"."suppliers"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."purchase_orders"
    ADD CONSTRAINT "fk_purchase_orders_generator"
    FOREIGN KEY ("generatedById") REFERENCES "procurewise"."users"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."purchase_orders"
    ADD CONSTRAINT "fk_purchase_orders_approver"
    FOREIGN KEY ("approvedById") REFERENCES "procurewise"."users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 12. Delivery Receipts & PMR Logs
DO $$ BEGIN
  ALTER TABLE "procurewise"."delivery_receipts"
    ADD CONSTRAINT "fk_delivery_receipts_po"
    FOREIGN KEY ("purchaseOrderId") REFERENCES "procurewise"."purchase_orders"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."delivery_receipts"
    ADD CONSTRAINT "fk_delivery_receipts_receiver"
    FOREIGN KEY ("receivedById") REFERENCES "procurewise"."users"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."pmr_logs"
    ADD CONSTRAINT "fk_pmr_logs_po"
    FOREIGN KEY ("purchaseOrderId") REFERENCES "procurewise"."purchase_orders"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."pmr_logs"
    ADD CONSTRAINT "fk_pmr_logs_logger"
    FOREIGN KEY ("loggedById") REFERENCES "procurewise"."users"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 13. Procurement Settings, Signatories & Documents
DO $$ BEGIN
  ALTER TABLE "procurewise"."procurement_settings"
    ADD CONSTRAINT "fk_procurement_settings_updater"
    FOREIGN KEY ("updatedById") REFERENCES "procurewise"."users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."procurement_signatories"
    ADD CONSTRAINT "fk_procurement_signatories_creator"
    FOREIGN KEY ("createdById") REFERENCES "procurewise"."users"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."procurement_documents"
    ADD CONSTRAINT "fk_procurement_documents_uploader"
    FOREIGN KEY ("uploadedById") REFERENCES "procurewise"."users"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 14. Workflow Corrections & Notifications
DO $$ BEGIN
  ALTER TABLE "procurewise"."workflow_corrections"
    ADD CONSTRAINT "fk_workflow_corrections_requester"
    FOREIGN KEY ("requestedById") REFERENCES "procurewise"."users"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."workflow_corrections"
    ADD CONSTRAINT "fk_workflow_corrections_assignee"
    FOREIGN KEY ("assignedToId") REFERENCES "procurewise"."users"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."workflow_notifications"
    ADD CONSTRAINT "fk_workflow_notifications_recipient"
    FOREIGN KEY ("recipientUserId") REFERENCES "procurewise"."users"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 15. Letters of Notice & BAC Transmittals
DO $$ BEGIN
  ALTER TABLE "procurewise"."letters_of_notice"
    ADD CONSTRAINT "fk_letters_of_notice_pr"
    FOREIGN KEY ("purchaseRequestId") REFERENCES "procurewise"."purchase_requests"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."letters_of_notice"
    ADD CONSTRAINT "fk_letters_of_notice_supplier"
    FOREIGN KEY ("supplierId") REFERENCES "procurewise"."suppliers"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."letters_of_notice"
    ADD CONSTRAINT "fk_letters_of_notice_issuer"
    FOREIGN KEY ("issuedById") REFERENCES "procurewise"."users"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."bac_transmittals"
    ADD CONSTRAINT "fk_bac_transmittals_pr"
    FOREIGN KEY ("purchaseRequestId") REFERENCES "procurewise"."purchase_requests"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."bac_transmittals"
    ADD CONSTRAINT "fk_bac_transmittals_preparer"
    FOREIGN KEY ("preparedById") REFERENCES "procurewise"."users"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 16. Supplier Evaluations & Electronic Approvals
DO $$ BEGIN
  ALTER TABLE "procurewise"."supplier_evaluations"
    ADD CONSTRAINT "fk_supplier_evaluations_supplier"
    FOREIGN KEY ("supplierId") REFERENCES "procurewise"."suppliers"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."supplier_evaluations"
    ADD CONSTRAINT "fk_supplier_evaluations_po"
    FOREIGN KEY ("purchaseOrderId") REFERENCES "procurewise"."purchase_orders"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."supplier_evaluations"
    ADD CONSTRAINT "fk_supplier_evaluations_pr"
    FOREIGN KEY ("purchaseRequestId") REFERENCES "procurewise"."purchase_requests"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."supplier_evaluations"
    ADD CONSTRAINT "fk_supplier_evaluations_office"
    FOREIGN KEY ("officeId") REFERENCES "procurewise"."offices"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."supplier_evaluations"
    ADD CONSTRAINT "fk_supplier_evaluations_urgent_pr_updater"
    FOREIGN KEY ("urgentPurchaseRequestUpdatedById") REFERENCES "procurewise"."users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."supplier_evaluations"
    ADD CONSTRAINT "fk_supplier_evaluations_evaluator"
    FOREIGN KEY ("evaluatedById") REFERENCES "procurewise"."users"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."supplier_evaluation_approvals"
    ADD CONSTRAINT "fk_supplier_eval_approvals_eval"
    FOREIGN KEY ("supplierEvaluationId") REFERENCES "procurewise"."supplier_evaluations"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."supplier_evaluation_approvals"
    ADD CONSTRAINT "fk_supplier_eval_approvals_approver"
    FOREIGN KEY ("approvedById") REFERENCES "procurewise"."users"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 17. MCDM Recommendations & Best Value Policies
DO $$ BEGIN
  ALTER TABLE "procurewise"."mcdm_recommendations"
    ADD CONSTRAINT "fk_mcdm_recommendations_pre_canvass"
    FOREIGN KEY ("preCanvassId") REFERENCES "procurewise"."pre_canvasses"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."mcdm_recommendations"
    ADD CONSTRAINT "fk_mcdm_recommendations_recommended_supplier"
    FOREIGN KEY ("recommendedSupplierId") REFERENCES "procurewise"."suppliers"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."mcdm_recommendations"
    ADD CONSTRAINT "fk_mcdm_recommendations_creator"
    FOREIGN KEY ("createdById") REFERENCES "procurewise"."users"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."best_value_policies"
    ADD CONSTRAINT "fk_best_value_policies_creator"
    FOREIGN KEY ("createdById") REFERENCES "procurewise"."users"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."best_value_policy_criteria"
    ADD CONSTRAINT "fk_best_value_policy_criteria_policy"
    FOREIGN KEY ("policyId") REFERENCES "procurewise"."best_value_policies"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 18. Historical Prices & Audit Trails
DO $$ BEGIN
  ALTER TABLE "procurewise"."historical_prices"
    ADD CONSTRAINT "fk_historical_prices_supplier"
    FOREIGN KEY ("supplierId") REFERENCES "procurewise"."suppliers"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."historical_prices"
    ADD CONSTRAINT "fk_historical_prices_po"
    FOREIGN KEY ("purchaseOrderId") REFERENCES "procurewise"."purchase_orders"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."historical_prices"
    ADD CONSTRAINT "fk_historical_prices_recorder"
    FOREIGN KEY ("recordedById") REFERENCES "procurewise"."users"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."audit_trails"
    ADD CONSTRAINT "fk_audit_trails_performer"
    FOREIGN KEY ("performedById") REFERENCES "procurewise"."users"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 19. PR Decisions & RFQ Assignments
DO $$ BEGIN
  ALTER TABLE "procurewise"."purchase_request_decisions"
    ADD CONSTRAINT "fk_pr_decisions_pr"
    FOREIGN KEY ("purchaseRequestId") REFERENCES "procurewise"."purchase_requests"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."purchase_request_decisions"
    ADD CONSTRAINT "fk_pr_decisions_performer"
    FOREIGN KEY ("performedById") REFERENCES "procurewise"."users"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."purchase_request_decisions"
    ADD CONSTRAINT "fk_pr_decisions_document"
    FOREIGN KEY ("documentId") REFERENCES "procurewise"."procurement_documents"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."rfq_number_assignments"
    ADD CONSTRAINT "fk_rfq_assignments_assigner"
    FOREIGN KEY ("assignedById") REFERENCES "procurewise"."users"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."rfq_number_assignments"
    ADD CONSTRAINT "fk_rfq_assignments_pr"
    FOREIGN KEY ("purchaseRequestId") REFERENCES "procurewise"."purchase_requests"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."rfq_number_assignments"
    ADD CONSTRAINT "fk_rfq_assignments_rfq"
    FOREIGN KEY ("rfqId") REFERENCES "procurewise"."rfqs"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 20. Form Templates
DO $$ BEGIN
  ALTER TABLE "procurewise"."form_templates"
    ADD CONSTRAINT "fk_form_templates_creator"
    FOREIGN KEY ("createdById") REFERENCES "procurewise"."users"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."form_templates"
    ADD CONSTRAINT "fk_form_templates_updater"
    FOREIGN KEY ("updatedById") REFERENCES "procurewise"."users"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "procurewise"."form_templates"
    ADD CONSTRAINT "fk_form_templates_approver"
    FOREIGN KEY ("approvedById") REFERENCES "procurewise"."users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
