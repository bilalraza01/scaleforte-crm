class AddMissingColumnsToAuditLogs < ActiveRecord::Migration[7.1]
  # The original CreateAuditLogs migration was a stub — the table only ever
  # had id/created_at/updated_at. AuditLog#record! silently no-op'd via
  # rescue because the columns AR expected didn't exist (action,
  # resource_type, etc.). Bring the table up to the shape AuditLog +
  # AuditLogPage have always assumed.
  def change
    add_reference :audit_logs, :user, foreign_key: true
    add_column    :audit_logs, :action,        :string, null: false
    add_column    :audit_logs, :resource_type, :string
    add_column    :audit_logs, :resource_id,   :bigint
    add_column    :audit_logs, :ip_address,    :string
    add_column    :audit_logs, :user_agent,    :string
    add_column    :audit_logs, :metadata,      :jsonb, null: false, default: {}

    add_index :audit_logs, [:resource_type, :resource_id]
    add_index :audit_logs, :created_at
  end
end
