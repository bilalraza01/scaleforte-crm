class ContactResource
  include Alba::Resource

  attributes :id, :name, :designation, :email, :phone, :personal_linkedin,
             :is_primary, :smartlead_lead_id, :brand_id
end
