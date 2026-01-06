module Smartlead
  # Translates a local Brand into the Smartlead lead JSON shape (PRD §9.3).
  class PayloadBuilder
    MAX_AUDIT_URLS = 5

    def initialize(brand)
      @brand = brand
    end

    def to_lead
      contact = @brand.primary_contact
      raise ArgumentError, "Brand #{@brand.id} has no contact" unless contact

      first_name, last_name = split_name(contact.name)

      {
        first_name:        first_name,
        last_name:         last_name,
        email:             contact.email,
        phone_number:      contact.phone,
        company_name:      @brand.business_name.presence || @brand.brand_name,
        website:           @brand.website,
        linkedin_profile:  contact.personal_linkedin,
        company_url:       @brand.company_linkedin_url,
        custom_fields:     custom_fields(contact)
      }.compact
    end

    private

    def split_name(name)
      return [nil, nil] if name.blank?
      parts = name.strip.split(/\s+/, 2)
      [parts[0], parts[1]]
    end

    def custom_fields(contact)
      pp = @brand.pain_points.ordered.to_a

      base = {
        "brand_name"      => @brand.brand_name,
        "amazon_listing"  => @brand.amazon_link,
        "asin"            => @brand.asin,
        "revenue"         => @brand.revenue&.to_s,
        "pain_point_1"    => pp[0]&.description,
        "pain_point_2"    => pp[1]&.description,
        "pain_point_3"    => pp[2]&.description,
        "designation"     => contact.designation,
        "sourced_by_sdr"  => @brand.sdr&.display_name
      }
      audit_url_fields.each { |k, v| base[k] = v }
      base.compact
    end

    # Up to MAX_AUDIT_URLS keys: audit_url_1..5. Compact in the caller drops
    # the slots a brand doesn't fill in.
    def audit_url_fields
      attachments = @brand.audit_screenshots.attached? ? @brand.audit_screenshots.to_a : []
      (1..MAX_AUDIT_URLS).map do |i|
        ["audit_url_#{i}", attachments[i - 1] ? audit_url_for(attachments[i - 1]) : nil]
      end.to_h
    end

    # Audit URL handed to Smartlead (and embedded in the email body the
    # recipient sees). For R2-backed services this is the direct CDN URL;
    # for the local Disk fallback we fall back to a Rails redirect so dev
    # smoke tests still work — but those URLs aren't reachable from outside
    # the dev box, so production must use R2.
    def audit_url_for(attachment)
      blob = attachment.blob
      return blob.url if blob.service.public?

      api_host = URI.parse(ENV.fetch("API_HOST", "http://localhost:3010"))
      Rails.application.routes.url_helpers.rails_blob_url(
        attachment,
        protocol: api_host.scheme,
        host:     api_host.host,
        port:     api_host.port
      )
    end
  end
end
