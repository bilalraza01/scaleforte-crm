class AuditLog < ApplicationRecord
  belongs_to :user, optional: true
  belongs_to :resource, polymorphic: true, optional: true

  scope :recent, -> { order(created_at: :desc) }

  validates :action, presence: true

  # FR-1.8 + FR-11.1: best-effort logging. A logging failure must not
  # break the request flow.
  def self.record!(user:, action:, resource: nil, request: nil, metadata: {})
    create!(
      user: user,
      action: action.to_s,
      resource_type: resource&.class&.name,
      resource_id:   resource&.id,
      ip_address:    request&.remote_ip,
      user_agent:    request&.user_agent,
      metadata:      metadata
    )
  rescue => e
    Rails.logger.warn("AuditLog#record! failed: #{e.class} #{e.message}")
    nil
  end
end
