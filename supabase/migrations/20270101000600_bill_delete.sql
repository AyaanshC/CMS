create policy bills_delete on public.vendor_bills for delete to authenticated
  using (public.can_procure(project_id) and status = 'recorded' and created_by = auth.uid());
