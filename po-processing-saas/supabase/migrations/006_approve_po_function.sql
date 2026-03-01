-- Atomic PO approval: updates PO status + review queue in one transaction

CREATE OR REPLACE FUNCTION approve_po(
  p_po_id UUID,
  p_org_id UUID,
  p_status TEXT,
  p_reviewed_by UUID,
  p_review_notes TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Update PO status
  UPDATE purchase_orders
  SET status = p_status, reviewed_by = p_reviewed_by
  WHERE id = p_po_id AND organization_id = p_org_id;

  -- Update review queue
  UPDATE review_queue
  SET status = 'completed', review_notes = p_review_notes
  WHERE purchase_order_id = p_po_id AND organization_id = p_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
