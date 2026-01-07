class MergeInProgressIntoDraftOnBrands < ActiveRecord::Migration[7.1]
  # The `in_progress` (status=1) state was a cosmetic distinction from
  # `draft` (status=0) — every Draft brand auto-transitioned to In Progress
  # on first save. SDRs found the two-phase early state confusing without
  # adding value. Collapse them into Draft and drop the enum value.
  def up
    execute <<~SQL
      UPDATE brands SET status = 0 WHERE status = 1;
    SQL
  end

  def down
    raise ActiveRecord::IrreversibleMigration,
          "in_progress was merged into draft; the prior split can't be reconstructed."
  end
end
