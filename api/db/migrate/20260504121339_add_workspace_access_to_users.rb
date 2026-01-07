class AddWorkspaceAccessToUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :workspace_access, :string,
               array: true, null: false, default: []
    add_index :users, :workspace_access, using: :gin
  end
end
