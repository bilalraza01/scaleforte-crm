module Smartlead
  # Translates a local Brand into the Smartlead lead JSON shape (PRD §9.3).
  class PayloadBuilder
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
      audit_url = @brand.audit_screenshots.attached? ?
        Rails.application.routes.url_helpers.rails_blob_url(@brand.audit_screenshots.first, host: ENV.fetch("API_HOST", "http://localhost:3010")) :
        nil

      {
        "brand_name"      => @brand.brand_name,
        "amazon_listing"  => @brand.amazon_link,
        "asin"            => @brand.asin,
        "revenue"         => @brand.revenue&.to_s,
        "audit_url"       => audit_url,
        "pain_point_1"    => pp[0]&.description,
        "pain_point_2"    => pp[1]&.description,
        "pain_point_3"    => pp[2]&.description,
        "designation"     => contact.designation,
        "sourced_by_sdr"  => @brand.sdr&.display_name
      }.compact
    end
  end
end
