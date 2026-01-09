class AddFirstAndLastNameToContacts < ActiveRecord::Migration[7.1]
  def change
    # Smartlead's lead payload wants first_name + last_name separately for
    # email personalization merge variables. Keep the legacy `name` column
    # for any historical row that wasn't entered through the new form.
    add_column :contacts, :first_name, :string
    add_column :contacts, :last_name,  :string
  end
end
