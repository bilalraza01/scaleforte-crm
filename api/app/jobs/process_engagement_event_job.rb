class ProcessEngagementEventJob < ApplicationJob
  queue_as :default

  def perform(event_id)
    event = EngagementEvent.find(event_id)
    return if event.processed_at.present?

    contact = match_contact(event)
    if contact
      event.update!(contact: contact, unmatched: false)
      update_summary!(contact, event)
    end

    event.update!(processed_at: Time.current)
  end

  private

  def match_contact(event)
    if event.smartlead_lead_id.present?
      c = Contact.find_by(smartlead_lead_id: event.smartlead_lead_id)
      return c if c
    end
    email = event.raw_payload&.dig("lead_email")
    return nil if email.blank?
    Contact.where("lower(email) = ?", email.downcase).first
  end

  def update_summary!(contact, event)
    summary = ContactEngagementSummary.find_or_initialize_by(contact_id: contact.id)
    summary.smartlead_lead_id ||= contact.smartlead_lead_id || event.smartlead_lead_id

    case event.event_type
    when "sent"
      summary.sent_at = event.occurred_at
      summary.current_status = :sent if summary.current_status_blank_or_lower?(:sent)
    when "opened"
      summary.last_opened_at = event.occurred_at
      summary.open_count += 1
      summary.current_status = :opened if summary.current_status_blank_or_lower?(:opened)
    when "clicked"
      summary.last_clicked_at = event.occurred_at
      summary.click_count += 1
    when "replied"
      summary.last_replied_at = event.occurred_at
      summary.reply_count += 1
      summary.current_status = :replied
    when "bounced"
      summary.bounced_at = event.occurred_at
      summary.current_status = :bounced
    when "unsubscribed"
      summary.unsubscribed_at = event.occurred_at
      summary.current_status = :unsubscribed
    end

    summary.save!
  end
end
