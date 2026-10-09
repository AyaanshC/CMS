create policy invoices_delete_draft on invoices for delete to authenticated using (can_bill_project(project_id) and status = 'draft');
